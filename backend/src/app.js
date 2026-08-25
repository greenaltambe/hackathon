import express from 'express';
import cors from 'cors';
import productRoutes from './routes/productRoutes.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';

const app = express();

// Standard middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'StockPulse Backend',
    timestamp: new Date().toISOString(),
  });
});

// Domain routes
app.use('/api/products', productRoutes);

// Fallthrough 404 handler
app.use(notFoundHandler);

// Centralized error handling
app.use(errorHandler);

export default app;
