import mongoose from 'mongoose';
import { Product, PRODUCT_STATUS, CATEGORIES } from '../models/index.js';

export class AppError extends Error {
  constructor(message, statusCode = 400) {
    super(message);
    this.statusCode = statusCode;
    this.name = 'AppError';
  }
}

/**
 * Helper to resolve a product by either Mongoose ObjectId or business identifier (productId / SKU).
 * @param {string} id
 * @returns {Promise<Document>}
 */
export async function findProductByIdOrCode(id) {
  if (!id) {
    throw new AppError('Product identifier is required', 400);
  }

  let product = null;

  // If valid ObjectId, query by _id
  if (mongoose.Types.ObjectId.isValid(id)) {
    product = await Product.findById(id);
  }

  // If not found by ObjectId or if id is a business code (e.g. PRD-001 or SKU-ELEC-001)
  if (!product) {
    product = await Product.findOne({
      $or: [
        { productId: id },
        { sku: id.toUpperCase() },
      ],
    });
  }

  if (!product) {
    throw new AppError(`Product with identifier '${id}' not found`, 404);
  }

  return product;
}

/**
 * Create a new product document using domain model validation
 * @param {Object} productData
 * @returns {Promise<Document>}
 */
export async function createProduct(productData) {
  const product = new Product(productData);
  await product.save();
  return product;
}

/**
 * List products with optional and combinable status & category filters
 * @param {Object} filters
 * @param {string} [filters.status]
 * @param {string} [filters.category]
 * @returns {Promise<Array<Document>>}
 */
export async function getProducts(filters = {}) {
  const query = {};

  if (filters.category) {
    const categoryUpper = filters.category.trim().toUpperCase();
    if (!Object.values(CATEGORIES).includes(categoryUpper)) {
      throw new AppError(
        `Invalid category '${filters.category}'. Supported categories: ${Object.values(CATEGORIES).join(', ')}`,
        400
      );
    }
    query.category = categoryUpper;
  }

  if (filters.status) {
    const statusUpper = filters.status.trim().toUpperCase();
    if (!Object.values(PRODUCT_STATUS).includes(statusUpper)) {
      throw new AppError(
        `Invalid status '${filters.status}'. Supported statuses: ${Object.values(PRODUCT_STATUS).join(', ')}`,
        400
      );
    }
    query.status = statusUpper;
  }

  return await Product.find(query).sort({ productId: 1, createdAt: -1 });
}

/**
 * Fetch a single product by ID
 * @param {string} id
 * @returns {Promise<Document>}
 */
export async function getProductById(id) {
  return await findProductByIdOrCode(id);
}

/**
 * Update a product's stock level and synchronize its operational lifecycle status
 * @param {string} id
 * @param {number} newStock
 * @returns {Promise<Document>}
 */
export async function updateStock(id, newStock) {
  if (newStock === undefined || newStock === null) {
    throw new AppError('Stock level (stockLevel or stock) is required in request body', 400);
  }

  const stockNum = Number(newStock);

  if (isNaN(stockNum) || !Number.isInteger(stockNum) || stockNum < 0) {
    throw new AppError('Stock level must be a non-negative integer (e.g. 0, 1, 2, ...)', 400);
  }

  const product = await findProductByIdOrCode(id);

  product.stockLevel = stockNum;

  // Logically synchronize status with stock level
  if (stockNum === 0) {
    product.status = PRODUCT_STATUS.OUT_OF_STOCK;
  } else if (product.status === PRODUCT_STATUS.OUT_OF_STOCK && stockNum > 0) {
    // Restores ACTIVE if it was OUT_OF_STOCK
    product.status = PRODUCT_STATUS.ACTIVE;
  }

  await product.save();
  return product;
}

/**
 * Simulate a customer purchase (decrements stock by 1, increments demand velocity by 1)
 * @param {string} id
 * @returns {Promise<Document>}
 */
export async function simulateOrder(id) {
  const product = await findProductByIdOrCode(id);

  if (product.stockLevel <= 0 || product.status === PRODUCT_STATUS.OUT_OF_STOCK) {
    throw new AppError(`Cannot simulate order: Product '${product.name}' (${product.sku}) is out of stock`, 409);
  }

  product.stockLevel -= 1;
  product.demandVelocity += 1;

  if (product.stockLevel === 0) {
    product.status = PRODUCT_STATUS.OUT_OF_STOCK;
  }

  await product.save();
  return product;
}

export default {
  createProduct,
  getProducts,
  getProductById,
  updateStock,
  simulateOrder,
};
