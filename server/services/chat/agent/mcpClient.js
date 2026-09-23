import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { MultiServerMCPClient } from '@langchain/mcp-adapters';
import { ServiceUnavailableError } from '../../../errors/appError.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const defaultServiceScript = path.resolve(__dirname, '../../../../mcp-tools-service/index.js');

let cachedClient = null;
let cachedTools = null;

const withTimeout = (promise, ms, message) => {
  let timer;
  const timeoutPromise = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(message)), ms);
  });
  return Promise.race([promise, timeoutPromise]).finally(() => clearTimeout(timer));
};

export const getMcpChatTools = async () => {
  if (cachedTools?.length) {
    return cachedTools;
  }

  const sseUrl = process.env.MCP_SERVER_URL || 'http://localhost:3002/sse';

  // 1. Try HTTP/SSE transport first with timeout
  try {
    console.log(`[Server:MCPClient] 🔄 Connecting to MCP service via SSE (${sseUrl})...`);
    const sseClient = new MultiServerMCPClient({
      prefixToolNameWithServerName: false,
      mcpServers: {
        'quickshow-mcp': {
          transport: 'sse',
          url: sseUrl,
        },
      },
      onConnectionError: 'throw',
    });

    const tools = await withTimeout(sseClient.getTools(), 3500, `SSE connection timed out after 3500ms`);
    if (tools?.length) {
      cachedClient = sseClient;
      cachedTools = tools;
      console.log(
        `[Server:MCPClient] ✅ Connected via SSE (${tools.length} tools registered: ${tools.map((t) => t.name).join(', ')})`
      );
      return tools;
    }
  } catch (sseError) {
    console.warn(`[Server:MCPClient] ⚠️ SSE connection to ${sseUrl} failed: ${sseError.message}. Falling back to STDIO transport...`);
  }

  // 2. Fall back to STDIO transport with timeout
  try {
    console.log(`[Server:MCPClient] 🔄 Connecting to MCP service via STDIO (${defaultServiceScript})...`);
    const stdioClient = new MultiServerMCPClient({
      prefixToolNameWithServerName: false,
      mcpServers: {
        'quickshow-mcp': {
          transport: 'stdio',
          command: 'node',
          args: [defaultServiceScript, '--stdio'],
        },
      },
    });

    const tools = await withTimeout(stdioClient.getTools(), 5000, `STDIO transport timed out after 5000ms`);
    cachedClient = stdioClient;
    cachedTools = tools;
    console.log(
      `[Server:MCPClient] ✅ Connected via STDIO (${tools.length} tools registered: ${tools.map((t) => t.name).join(', ')})`
    );
    return tools;
  } catch (stdioError) {
    cachedClient = null;
    cachedTools = null;
    console.error('[Server:MCPClient] ❌ Both SSE and STDIO transports failed:', stdioError.message);
    throw new ServiceUnavailableError(`MCP tools service is unavailable: ${stdioError.message}`);
  }
};

export const resetMcpClientCache = () => {
  cachedClient = null;
  cachedTools = null;
};

export const closeMcpClient = async () => {
  if (cachedClient) {
    await cachedClient.close().catch(() => {});
    cachedClient = null;
    cachedTools = null;
  }
};
