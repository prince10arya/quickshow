import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import connectDb from './config/db.js';
import { ALL_TOOL_DEFINITIONS, registerAllTools } from './tools/index.js';

const PORT = process.env.PORT || 3002;
const isStdioMode = process.argv.includes('--stdio') || process.env.MCP_TRANSPORT === 'stdio';
const transports = new Map();
let httpServer = null;

// Initialize MCP Server
export const createMcpServer = () => {
  const server = new McpServer({
    name: 'quickshow-mcp-tools',
    version: '1.0.0',
  });

  registerAllTools(server);
  return server;
};

// Graceful shutdown helper
const shutdown = async (signal) => {
  console.log(`[MCP Tools Service] ${signal} received. Shutting down gracefully...`);
  if (httpServer) {
    httpServer.close(() => console.log('[MCP Tools Service] HTTP server closed'));
  }
  for (const [, session] of transports.entries()) {
    await session.server.close().catch(() => {});
  }
  transports.clear();
  await mongoose.connection.close().catch(() => {});
  process.exit(0);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

process.on('uncaughtException', (err) => {
  console.error('[MCP Tools Service] Uncaught Exception:', err);
});

process.on('unhandledRejection', (reason) => {
  console.error('[MCP Tools Service] Unhandled Rejection:', reason);
});

// Start server
const start = async () => {
  await connectDb();

  if (isStdioMode) {
    console.log('[MCP Tools Service] Starting in STDIO transport mode...');
    const server = createMcpServer();
    const transport = new StdioServerTransport();
    await server.connect(transport);
    return;
  }

  const app = express();
  app.use(cors({ origin: '*' }));
  app.use(express.json());

  // Health check endpoint
  app.get('/health', (_req, res) => {
    res.json({
      status: 'healthy',
      service: 'quickshow-mcp-tools',
      transport: 'sse',
      toolCount: ALL_TOOL_DEFINITIONS.length,
      tools: ALL_TOOL_DEFINITIONS.map((t) => t.name),
      timestamp: new Date().toISOString(),
    });
  });

  // SSE Transport endpoint with error handling
  app.get('/sse', async (req, res) => {
    try {
      const serverInstance = createMcpServer();
      const transport = new SSEServerTransport('/messages', res);
      transports.set(transport.sessionId, { transport, server: serverInstance });
      console.log(`[MCP:Transport] 🔌 New SSE client connected (Session: ${transport.sessionId})`);

      res.on('close', async () => {
        console.log(`[MCP:Transport] 🔌 SSE connection closed (Session: ${transport.sessionId})`);
        await serverInstance.close().catch(() => {});
        transports.delete(transport.sessionId);
      });

      await serverInstance.connect(transport);
    } catch (err) {
      console.error('[MCP:Transport] ✖ SSE connection error:', err.message);
      if (!res.headersSent) {
        res.status(500).json({ success: false, error: 'Failed to establish SSE transport', message: err.message });
      }
    }
  });

  // Client messages back to MCP server with error handling
  app.post('/messages', async (req, res) => {
    try {
      const sessionId = req.query.sessionId;
      if (!sessionId) {
        console.warn('[MCP:Transport] ⚠ Missing sessionId in POST /messages');
        return res.status(400).json({ success: false, error: 'Missing sessionId query parameter' });
      }

      const session = transports.get(sessionId);
      if (!session) {
        console.warn(`[MCP:Transport] ⚠ Session not found: ${sessionId}`);
        return res.status(404).json({ success: false, error: `Session not found: ${sessionId}` });
      }

      const method = req.body?.method || 'unknown';
      const toolCall = req.body?.params?.name ? ` [tool: ${req.body.params.name}]` : '';
      console.log(`[MCP:Transport] 📨 POST /messages ${method}${toolCall} (Session: ${sessionId.slice(0, 8)}...)`);

      await session.transport.handlePostMessage(req, res, req.body);
    } catch (err) {
      console.error('[MCP:Transport] ✖ Error handling message:', err.message);
      if (!res.headersSent) {
        res.status(500).json({ success: false, error: 'Failed to process message', message: err.message });
      }
    }
  });

  // 404 Route Handler
  app.use((req, res) => {
    res.status(404).json({ success: false, error: `Cannot ${req.method} ${req.originalUrl}` });
  });

  // Centralized Error Middleware
  app.use((err, req, res, _next) => {
    console.error('[MCP Tools Service] Unhandled route error:', err);
    res.status(err.statusCode || 500).json({
      success: false,
      error: err.message || 'Internal MCP Service Error',
    });
  });

  httpServer = app.listen(PORT, () => {
    console.log(`[MCP Tools Service] HTTP/SSE Server running on http://localhost:${PORT}`);
    console.log(`[MCP Tools Service] SSE endpoint: http://localhost:${PORT}/sse`);
    console.log(`[MCP Tools Service] Health endpoint: http://localhost:${PORT}/health`);
  });
};

start().catch((err) => {
  console.error('[MCP Tools Service] Fatal startup error:', err);
  process.exit(1);
});
