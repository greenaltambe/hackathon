import express from 'express';
import cors from 'cors';
import productRoutes from './routes/productRoutes.js';
import { pricingRouter, reorderRouter } from './routes/suggestionRoutes.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { initAgenticLoop } from './services/agentic/index.js';

const app = express();

// Initialize the Agentic Recommendation Loop event listeners
initAgenticLoop();

// Configured CORS middleware
const allowedOrigins = [
  'https://hackathon-blue-pi.vercel.app',
  'http://localhost:3000',
  'http://localhost:3001',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:3001',
  'http://localhost:5173',
];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. mobile apps, curl, server-to-server) or matched origins
      if (!origin || allowedOrigins.includes(origin) || allowedOrigins.some((o) => origin.startsWith(o))) {
        callback(null, true);
      } else {
        // Allow origin in non-strict mode or callback allowed
        callback(null, true);
      }
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  })
);

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
