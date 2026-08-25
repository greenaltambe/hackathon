import { PricingSuggestion, ReorderSuggestion } from '../models/index.js';
import * as productService from '../services/productService.js';

/**
 * GET /api/pricing-suggestions
 * Query pricing suggestions with optional filters (productId, status, triggerReason)
 */
export async function getPricingSuggestions(req, res, next) {
  try {
    const { productId, status, triggerReason } = req.query;
    const query = {};

    if (productId) {
      const product = await productService.findProductByIdOrCode(productId);
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
      const product = await productService.findProductByIdOrCode(productId);
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

/**
 * PATCH /api/pricing-suggestions/:id/accept
 * Accept pricing suggestion and update live product price
 */
export async function acceptPricing(req, res, next) {
  try {
    const { id } = req.params;
    const result = await productService.acceptPricingSuggestion(id);
    res.status(200).json({
      success: true,
      message: 'Pricing suggestion accepted and product price updated',
      data: result.suggestion,
      product: result.product,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * PATCH /api/pricing-suggestions/:id/reject
 * Reject pricing suggestion
 */
export async function rejectPricing(req, res, next) {
  try {
    const { id } = req.params;
    const result = await productService.rejectPricingSuggestion(id);
    res.status(200).json({
      success: true,
      message: 'Pricing suggestion rejected',
      data: result.suggestion,
      product: result.product,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * PATCH /api/reorder-suggestions/:id/accept
 * Accept reorder suggestion and increment product stock
 */
export async function acceptReorder(req, res, next) {
  try {
    const { id } = req.params;
    const result = await productService.acceptReorderSuggestion(id);
    res.status(200).json({
      success: true,
      message: 'Reorder suggestion accepted and stock replenished',
      data: result.suggestion,
      product: result.product,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * PATCH /api/reorder-suggestions/:id/reject
 * Reject reorder suggestion
 */
export async function rejectReorder(req, res, next) {
  try {
    const { id } = req.params;
    const result = await productService.rejectReorderSuggestion(id);
    res.status(200).json({
      success: true,
      message: 'Reorder suggestion rejected',
      data: result.suggestion,
    });
  } catch (error) {
    next(error);
  }
}

export default {
  getPricingSuggestions,
  getReorderSuggestions,
  acceptPricing,
  rejectPricing,
  acceptReorder,
  rejectReorder,
};
