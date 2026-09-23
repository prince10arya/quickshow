import mongoose from 'mongoose';
import { setServers } from 'node:dns/promises';

try {
  setServers(['1.1.1.1']);
} catch {
  // Ignore if unsupported
}

export const connectDb = async () => {
  if (mongoose.connection.readyState >= 1) {
    return;
  }
  try {
    const uri = process.env.DB_URI;
    if (!uri) {
      console.warn('DB_URI not configured in mcp-tools-service.');
      return;
    }
    mongoose.connection.on('connected', () => console.log('[MCP Tools Service] MongoDB connected'));
    mongoose.connection.on('error', (err) => console.error('[MCP Tools Service] MongoDB error:', err.message));
    await mongoose.connect(uri);
  } catch (error) {
    console.error('[MCP Tools Service] MongoDB connection failed:', error.message);
  }
};

export default connectDb;
