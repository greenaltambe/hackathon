import mongoose from 'mongoose';
import {
  Product,
  PricingSuggestion,
  ReorderSuggestion,
  PRODUCT_STATUS,
  CATEGORIES,
  SUGGESTION_STATUS,
  TRIGGER_REASONS,
} from '../models/index.js';
import { strategyRegistry } from './commerce/index.js';
import { eventBus, DOMAIN_EVENTS } from '../events/eventBus.js';

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
  const previousStock = product.stockLevel;
  product.stockLevel = stockNum;

  // Logically synchronize status with stock level
  if (stockNum === 0) {
    product.status = PRODUCT_STATUS.OUT_OF_STOCK;
  } else if (product.status === PRODUCT_STATUS.OUT_OF_STOCK && stockNum > 0) {
    // Restores ACTIVE if it was OUT_OF_STOCK
    product.status = PRODUCT_STATUS.ACTIVE;
  }

  await product.save();

  // Publish domain event asynchronously (decoupled from HTTP lifecycle)
  eventBus.publish(DOMAIN_EVENTS.INVENTORY_CHANGED, {
    productId: product.productId || product._id.toString(),
    id: product._id.toString(),
    sku: product.sku,
    category: product.category,
    stockLevel: product.stockLevel,
    previousStockLevel: previousStock,
    demandVelocity: product.demandVelocity,
  });

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

  const previousStock = product.stockLevel;
  product.stockLevel -= 1;
  product.demandVelocity += 1;

  if (product.stockLevel === 0) {
    product.status = PRODUCT_STATUS.OUT_OF_STOCK;
  }

  await product.save();

  // Publish domain event asynchronously
  eventBus.publish(DOMAIN_EVENTS.ORDER_SIMULATED, {
    productId: product.productId || product._id.toString(),
    id: product._id.toString(),
    sku: product.sku,
    category: product.category,
    stockLevel: product.stockLevel,
    previousStockLevel: previousStock,
    demandVelocity: product.demandVelocity,
  });

  return product;
}

/**
 * Calculates average demand velocity across all products in a given category.
 * @param {string} category
 * @returns {Promise<number>}
 */
export async function getCategoryAverageDemandVelocity(category) {
  if (!category) return 0;

  const result = await Product.aggregate([
    { $match: { category: category.trim().toUpperCase() } },
    { $group: { _id: '$category', avgVelocity: { $avg: '$demandVelocity' } } },
  ]);

  return result.length > 0 && result[0].avgVelocity !== null ? result[0].avgVelocity : 0;
}

/**
 * Generates and persists a dynamic pricing recommendation using the active Commerce Strategy.
 * Does NOT modify product.currentPrice or product.stockLevel.
 *
 * @param {string} id - Product ID or business code
 * @param {Object} [options]
 * @param {string} [options.triggerReason='MANUAL']
 * @param {string} [options.strategyName=null]
 * @returns {Promise<Document>} Persisted PricingSuggestion
 */
export async function generatePricingSuggestion(id, { triggerReason = TRIGGER_REASONS.MANUAL, strategyName = null } = {}) {
  const product = await findProductByIdOrCode(id);
  const categoryAvgVelocity = await getCategoryAverageDemandVelocity(product.category);

  const strategy = strategyRegistry.get(strategyName);
  const recommendation = await strategy.suggestPricing(product, {
    categoryAverageDemandVelocity: categoryAvgVelocity,
    triggerReason,
  });

  const suggestion = new PricingSuggestion({
    product: product._id,
    currentPrice: recommendation.currentPrice,
    recommendedPrice: recommendation.recommendedPrice,
    direction: recommendation.direction,
    confidence: recommendation.confidence,
    reasoning: recommendation.reasoning,
    status: SUGGESTION_STATUS.PENDING,
    triggerReason: recommendation.triggerReason,
  });

  await suggestion.save();
  return await suggestion.populate('product');
}

/**
 * Generates and persists an inventory replenishment recommendation using the active Commerce Strategy.
 * Does NOT modify product.stockLevel.
 *
 * @param {string} id - Product ID or business code
 * @param {Object} [options]
 * @param {string} [options.triggerReason='MANUAL']
 * @param {string} [options.strategyName=null]
 * @returns {Promise<Document>} Persisted ReorderSuggestion
 */
export async function generateReorderSuggestion(id, { triggerReason = TRIGGER_REASONS.MANUAL, strategyName = null } = {}) {
  const product = await findProductByIdOrCode(id);

  const strategy = strategyRegistry.get(strategyName);
  const recommendation = await strategy.suggestReorder(product, {
    triggerReason,
  });

  const suggestion = new ReorderSuggestion({
    product: product._id,
    currentStock: recommendation.currentStock,
    recommendedQuantity: recommendation.recommendedQuantity,
    suggestedLeadTimeDays: recommendation.suggestedLeadTimeDays,
    confidence: recommendation.confidence,
    reasoning: recommendation.reasoning,
    status: SUGGESTION_STATUS.PENDING,
    triggerReason: recommendation.triggerReason,
  });

  await suggestion.save();
  return await suggestion.populate('product');
}

/**
 * Accept a pricing suggestion: updates suggestion status to ACCEPTED and
 * applies the recommended price to the live Product document.
 *
 * @param {string} suggestionId
 * @returns {Promise<{ suggestion: Document, product: Document }>}
 */
export async function acceptPricingSuggestion(suggestionId) {
  const suggestion = await PricingSuggestion.findById(suggestionId).populate('product');
  if (!suggestion) {
    throw new AppError(`Pricing suggestion '${suggestionId}' not found`, 404);
  }

  if (suggestion.status !== SUGGESTION_STATUS.PENDING) {
    throw new AppError(`Pricing suggestion is already ${suggestion.status}`, 400);
  }

  suggestion.status = SUGGESTION_STATUS.ACCEPTED;
  await suggestion.save();

  const product = await Product.findById(suggestion.product._id || suggestion.product);
  if (product) {
    product.currentPrice = suggestion.recommendedPrice;

    // Check if any other pending pricing suggestions exist for this product
    const otherPending = await PricingSuggestion.countDocuments({
      product: product._id,
      _id: { $ne: suggestion._id },
      status: SUGGESTION_STATUS.PENDING,
    });

    if (otherPending === 0 && product.status === PRODUCT_STATUS.PRICE_REVIEW_PENDING) {
      product.status = product.stockLevel === 0 ? PRODUCT_STATUS.OUT_OF_STOCK : PRODUCT_STATUS.ACTIVE;
    }

    await product.save();
  }

  return { suggestion, product };
}

/**
 * Reject a pricing suggestion: updates suggestion status to REJECTED.
 *
 * @param {string} suggestionId
 * @returns {Promise<{ suggestion: Document, product: Document }>}
 */
export async function rejectPricingSuggestion(suggestionId) {
  const suggestion = await PricingSuggestion.findById(suggestionId).populate('product');
  if (!suggestion) {
    throw new AppError(`Pricing suggestion '${suggestionId}' not found`, 404);
  }

  if (suggestion.status !== SUGGESTION_STATUS.PENDING) {
    throw new AppError(`Pricing suggestion is already ${suggestion.status}`, 400);
  }

  suggestion.status = SUGGESTION_STATUS.REJECTED;
  await suggestion.save();

  const product = await Product.findById(suggestion.product._id || suggestion.product);
  if (product) {
    const otherPending = await PricingSuggestion.countDocuments({
      product: product._id,
      _id: { $ne: suggestion._id },
      status: SUGGESTION_STATUS.PENDING,
    });

    if (otherPending === 0 && product.status === PRODUCT_STATUS.PRICE_REVIEW_PENDING) {
      product.status = product.stockLevel === 0 ? PRODUCT_STATUS.OUT_OF_STOCK : PRODUCT_STATUS.ACTIVE;
      await product.save();
    }
  }

  return { suggestion, product };
}

/**
 * Accept a reorder suggestion: updates status to ACCEPTED and simulates
 * inbound replenishment by incrementing product.stockLevel.
 *
 * @param {string} suggestionId
 * @returns {Promise<{ suggestion: Document, product: Document }>}
 */
export async function acceptReorderSuggestion(suggestionId) {
  const suggestion = await ReorderSuggestion.findById(suggestionId).populate('product');
  if (!suggestion) {
    throw new AppError(`Reorder suggestion '${suggestionId}' not found`, 404);
  }

  if (suggestion.status !== SUGGESTION_STATUS.PENDING) {
    throw new AppError(`Reorder suggestion is already ${suggestion.status}`, 400);
  }

  suggestion.status = SUGGESTION_STATUS.ACCEPTED;
  await suggestion.save();

  const product = await Product.findById(suggestion.product._id || suggestion.product);
  if (product) {
    product.stockLevel += suggestion.recommendedQuantity;

    if (product.status === PRODUCT_STATUS.OUT_OF_STOCK && product.stockLevel > 0) {
      product.status = PRODUCT_STATUS.ACTIVE;
    }

    await product.save();
  }

  return { suggestion, product };
}

/**
 * Reject a reorder suggestion: updates status to REJECTED.
 *
 * @param {string} suggestionId
 * @returns {Promise<{ suggestion: Document }>}
 */
export async function rejectReorderSuggestion(suggestionId) {
  const suggestion = await ReorderSuggestion.findById(suggestionId).populate('product');
  if (!suggestion) {
    throw new AppError(`Reorder suggestion '${suggestionId}' not found`, 404);
  }

  if (suggestion.status !== SUGGESTION_STATUS.PENDING) {
    throw new AppError(`Reorder suggestion is already ${suggestion.status}`, 400);
  }

  suggestion.status = SUGGESTION_STATUS.REJECTED;
  await suggestion.save();

  return { suggestion };
}

export default {
  createProduct,
  getProducts,
  getProductById,
  updateStock,
  simulateOrder,
  getCategoryAverageDemandVelocity,
  generatePricingSuggestion,
  generateReorderSuggestion,
  acceptPricingSuggestion,
  rejectPricingSuggestion,
  acceptReorderSuggestion,
  rejectReorderSuggestion,
};
