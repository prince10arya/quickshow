import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import mongoose from 'mongoose';
import 'dotenv/config';
import { serve } from 'inngest/express';
import { setServers } from 'node:dns/promises';

import { initLaminar } from './services/chat/observability/laminar.js';
initLaminar();

import connectDb from './config/db.js';
import { functions, inngest } from './inngest/index.js';
import authRouter from './routes/auth.routes.js';
import showRouter from './routes/show.routes.js';
import bookingRouter from './routes/booking.routes.js';
import adminRouter from './routes/admin.routes.js';
import userRouter from './routes/user.routes.js';
import chatRouter from './routes/chat.routes.js';
import { stripeWebHooks } from './controllers/stripewebhooks.controllers.js';
import { notFoundHandler, globalErrorHandler } from './middlewares/error.middleware.js';
import { closeMcpClient } from './services/chat/agent/mcpClient.js';

try {
  setServers(['1.1.1.1']);
} catch {
  // Ignore if unsupported
}

const app = express();
const port = process.env.PORT || 3000;
let server = null;

// Graceful shutdown & Process error handlers
const shutdown = async (signal) => {
  console.log(`[Server] ${signal} received. Initiating graceful shutdown...`);
  if (server) {
    server.close(() => console.log('[Server] HTTP server closed'));
  }
  await closeMcpClient().catch(() => {});
  await mongoose.connection.close().catch(() => {});
  process.exit(0);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

process.on('uncaughtException', (err) => {
  console.error('[Server] Uncaught Exception:', err);
});

process.on('unhandledRejection', (reason) => {
  console.error('[Server] Unhandled Rejection:', reason);
});

app.use(express.json());
app.use(cors({ origin: process.env.CLIENT_URL || true, credentials: true }));
app.use(cookieParser());

app.use('/api/stripe', express.raw({ type: 'application/json' }), stripeWebHooks);
app.use('/api/inngest', serve({ client: inngest, functions }));
app.use('/api/auth', authRouter);
app.use('/api/shows', showRouter);
app.use('/api/bookings', bookingRouter);
app.use('/api/admin', adminRouter);
app.use('/api/user', userRouter);
app.use('/api/chat', chatRouter);

app.get('/', (_req, res) => res.send('<h1>QuickShow API</h1>'));

// 404 and Global Error Handler
app.use(notFoundHandler);
app.use(globalErrorHandler);

await connectDb();
server = app.listen(port, () => console.log(`Server running on http://localhost:${port}`));
