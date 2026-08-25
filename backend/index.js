import dotenv from 'dotenv';
import app from './src/app.js';
import { connectDB, disconnectDB } from './src/config/db.js';
import * as models from './src/models/index.js';

dotenv.config();

const PORT = process.env.PORT || 5000;
let server = null;

export async function startServer(customPort = PORT) {
  try {
    console.log('--- StockPulse Backend (Phase 2A) ---');
    await connectDB();
    console.log(`[StockPulse] Database initialization complete.`);

    server = app.listen(customPort, () => {
      console.log(`[StockPulse] REST API Server running on http://localhost:${customPort}`);
      console.log(`[StockPulse] Health Check: http://localhost:${customPort}/api/health`);
      console.log(`[StockPulse] Products API: http://localhost:${customPort}/api/products`);
    });

    return server;
  } catch (error) {
    console.error(`[StockPulse] Startup failure: ${error.message}`);
    process.exit(1);
  }
}

export async function stopServer() {
  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }
  await disconnectDB();
}

// Graceful shutdown handlers
process.on('SIGINT', async () => {
  console.log('\n[StockPulse] Shutting down gracefully...');
  await stopServer();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n[StockPulse] Terminating gracefully...');
  await stopServer();
  process.exit(0);
});

if (process.argv[1] && (process.argv[1].endsWith('index.js') || process.argv[1].endsWith('backend'))) {
  startServer();
}

export { app, models };
export default app;
