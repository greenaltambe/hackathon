import { PricingSuggestion, ReorderSuggestion } from '../models/index.js';
import { findProductByIdOrCode } from '../services/productService.js';

/**
 * GET /api/pricing-suggestions
 * Query pricing suggestions with optional filters (productId, status, triggerReason)
 */
export async function getPricingSuggestions(req, res, next) {
  try {
    const { productId, status, triggerReason } = req.query;
    const query = {};

    if (productId) {
      const product = await findProductByIdOrCode(productId);
      query.product = product._id;
    }

    if (status) {
      query.status = status.toUpperCase();
    }

    if (triggerReason) {
      query.triggerReason = triggerReason.toUpperCase();
    }

    const suggestions = await PricingSuggestion.find(query)
      .populate('product')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: suggestions.length,
      data: suggestions,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/reorder-suggestions
 * Query reorder suggestions with optional filters (productId, status, triggerReason)
 */
export async function getReorderSuggestions(req, res, next) {
  try {
    const { productId, status, triggerReason } = req.query;
    const query = {};

    if (productId) {
      const product = await findProductByIdOrCode(productId);
      query.product = product._id;
    }

    if (status) {
      query.status = status.toUpperCase();
    }

    if (triggerReason) {
      query.triggerReason = triggerReason.toUpperCase();
    }

    const suggestions = await ReorderSuggestion.find(query)
      .populate('product')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: suggestions.length,
      data: suggestions,
    });
  } catch (error) {
    next(error);
  }
}

export default {
  getPricingSuggestions,
  getReorderSuggestions,
};
