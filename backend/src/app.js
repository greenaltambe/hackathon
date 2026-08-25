import express from 'express';
import cors from 'cors';
import productRoutes from './routes/productRoutes.js';
import { pricingRouter, reorderRouter } from './routes/suggestionRoutes.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { initAgenticLoop } from './services/agentic/index.js';

const app = express();

// Initialize the Agentic Recommendation Loop event listeners
initAgenticLoop();

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
app.use('/api/pricing-suggestions', pricingRouter);
app.use('/api/reorder-suggestions', reorderRouter);

// Fallthrough 404 handler
app.use(notFoundHandler);

// Centralized error handling
app.use(errorHandler);

export default app;
