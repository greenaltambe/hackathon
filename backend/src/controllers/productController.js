import * as productService from '../services/productService.js';

/**
 * POST /api/products
 * Create a new product
 */
export async function createProduct(req, res, next) {
  try {
    const product = await productService.createProduct(req.body);
    res.status(201).json({
      success: true,
      message: 'Product created successfully',
      data: product,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/products
 * List products with optional category and status filtering
 */
export async function getProducts(req, res, next) {
  try {
    const { category, status } = req.query;
    const products = await productService.getProducts({ category, status });
    res.status(200).json({
      success: true,
      count: products.length,
      data: products,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/products/:id
 * Retrieve single product details
 */
export async function getProductById(req, res, next) {
  try {
    const { id } = req.params;
    const product = await productService.getProductById(id);
    res.status(200).json({
      success: true,
      data: product,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * PATCH /api/products/:id/stock
 * Update product stock level
 */
export async function updateStock(req, res, next) {
  try {
    const { id } = req.params;
    const stockValue = req.body.stockLevel !== undefined ? req.body.stockLevel : req.body.stock;
    const product = await productService.updateStock(id, stockValue);
    res.status(200).json({
      success: true,
      message: 'Stock updated successfully',
      data: product,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/products/:id/orders
 * Simulate a customer sale (decrements stock by 1, increments velocity by 1)
 */
export async function simulateOrder(req, res, next) {
  try {
    const { id } = req.params;
    const product = await productService.simulateOrder(id);
    res.status(200).json({
      success: true,
      message: 'Order simulated successfully',
      data: product,
    });
  } catch (error) {
    next(error);
  }
}

export default {
  createProduct,
  getProducts,
  getProductById,
  updateStock,
  simulateOrder,
};
