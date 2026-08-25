import dotenv from 'dotenv';
import { connectDB, disconnectDB } from './src/config/db.js';
import * as models from './src/models/index.js';

dotenv.config();

const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    console.log('--- StockPulse Backend (Phase 1) ---');
    await connectDB();
    console.log(`[StockPulse] Database initialization complete.`);
    console.log(`[StockPulse] Registered Domain Models: ${Object.keys(models).filter(k => !k.startsWith('CHANGE') && !k.startsWith('PRODUCT') && !k.startsWith('CATEGORIES') && !k.startsWith('SUGGESTION') && !k.startsWith('TRIGGER')).join(', ')}`);
    console.log(`[StockPulse] Server configured for PORT: ${PORT}`);
    console.log(`[StockPulse] Ready for Phase 2 REST API and Commerce Engine integrations.`);
  } catch (error) {
    console.error(`[StockPulse] Startup failure: ${error.message}`);
    process.exit(1);
  }
}

// Graceful shutdown handlers
process.on('SIGINT', async () => {
  console.log('\n[StockPulse] Shutting down gracefully...');
  await disconnectDB();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n[StockPulse] Terminating gracefully...');
  await disconnectDB();
  process.exit(0);
});

if (process.argv[1] && (process.argv[1].endsWith('index.js') || process.argv[1].endsWith('backend'))) {
  startServer();
}

export { startServer, models };
