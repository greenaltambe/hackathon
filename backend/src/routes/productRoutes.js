import express from 'express';
import * as productController from '../controllers/productController.js';

const router = express.Router();

// Collection routes
router
  .route('/')
  .get(productController.getProducts)
  .post(productController.createProduct);

// Member routes
router
  .route('/:id')
  .get(productController.getProductById);

router
  .route('/:id/stock')
  .patch(productController.updateStock);

router
  .route('/:id/orders')
  .post(productController.simulateOrder);

// Commerce Engine recommendation endpoints
router
  .route('/:id/suggest-pricing')
  .post(productController.suggestPricing);

router
  .route('/:id/suggest-reorder')
  .post(productController.suggestReorder);

export default router;
