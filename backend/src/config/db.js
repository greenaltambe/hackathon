import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const DEFAULT_URI = 'mongodb://127.0.0.1:27017/stockpulse';

/**
 * Connect to MongoDB using Mongoose with standard configuration
 * and resilient event handling.
 */
export async function connectDB(customUri = null) {
  const uri = customUri || process.env.MONGODB_URI || DEFAULT_URI;

  try {
    const conn = await mongoose.connect(uri, {
      dbName: 'stockpulse',
      autoIndex: true,
    });

    console.log(`[Database] MongoDB Connected: ${conn.connection.host}/${conn.connection.name}`);
    return conn;
  } catch (error) {
    console.error(`[Database] Connection Error: ${error.message}`);
    throw error;
  }
}

/**
 * Disconnect from MongoDB gracefully
 */
export async function disconnectDB() {
  try {
    await mongoose.disconnect();
    console.log('[Database] MongoDB Disconnected gracefully');
  } catch (error) {
    console.error(`[Database] Disconnect Error: ${error.message}`);
    throw error;
  }
}

// Global connection event listeners for health monitoring
mongoose.connection.on('error', (err) => {
  console.error(`[Database] Mongoose runtime error: ${err.message}`);
});

mongoose.connection.on('disconnected', () => {
  console.warn('[Database] Mongoose connection lost');
});

export default connectDB;
