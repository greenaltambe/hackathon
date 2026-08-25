import { CommerceAdvisor } from './commerceAdvisor.js';
import {
  CHANGE_DIRECTION,
  TRIGGER_REASONS,
} from '../../models/index.js';

/**
 * Concrete Deterministic Rule-Based Commerce Strategy for StockPulse.
 * Implements baseline heuristic pricing adjustments and threshold-based replenishment.
 */
export class RuleBasedCommerceStrategy extends CommerceAdvisor {
  /**
   * Evaluates rule-based pricing recommendations:
   * 1. Stock < Threshold: +10% price increase (Inventory protection)
   * 2. Demand Velocity > 2x Category Average: +5% price increase (Demand spike capitalization)
   * 3. Otherwise: HOLD current price
   *
   * @param {Object} product
   * @param {Object} context
   * @returns {Promise<Object>}
   */
  async suggestPricing(product, context = {}) {
    const currentPrice = Number(product.currentPrice);
    const stockLevel = Number(product.stockLevel);
    const reorderThreshold = Number(product.reorderThreshold);
    const demandVelocity = Number(product.demandVelocity || 0);
    const categoryAvg = Number(context.categoryAverageDemandVelocity || 0);
    const triggerReason = context.triggerReason || TRIGGER_REASONS.MANUAL;

    // Rule 1: Low stock condition takes highest priority
    if (stockLevel < reorderThreshold) {
      const rawPrice = currentPrice * 1.10;
      const recommendedPrice = Math.round(rawPrice * 100) / 100;

      return {
        currentPrice,
        recommendedPrice,
        direction: CHANGE_DIRECTION.INCREASE,
        confidence: 0.85,
        reasoning: `Inventory is critically low (${stockLevel} units on-hand vs threshold of ${reorderThreshold}). Recommend 10% price increase to protect stock from premature stockout and capture scarcity margin.`,
        triggerReason,
      };
    }

    // Rule 2: Demand spike (velocity strictly greater than 2x category average)
    if (categoryAvg > 0 && demandVelocity > 2 * categoryAvg) {
      const rawPrice = currentPrice * 1.05;
      const recommendedPrice = Math.round(rawPrice * 100) / 100;

      return {
        currentPrice,
        recommendedPrice,
        direction: CHANGE_DIRECTION.INCREASE,
        confidence: 0.80,
        reasoning: `Demand velocity (${demandVelocity} orders/24h) is surging at more than 2x the category average (${categoryAvg.toFixed(1)} orders/24h). Recommend 5% price increase to capitalize on strong buyer demand.`,
        triggerReason,
      };
    }

    // Rule 3: Normal conditions -> HOLD
    return {
      currentPrice,
      recommendedPrice: currentPrice,
      direction: CHANGE_DIRECTION.HOLD,
      confidence: 0.90,
      reasoning: `Inventory level (${stockLevel} units) is healthy and demand velocity (${demandVelocity} orders/24h) is within normal category parameters (${categoryAvg.toFixed(1)} avg). Recommend maintaining current price.`,
      triggerReason,
    };
  }

  /**
   * Evaluates rule-based inventory replenishment:
   * recommendedQuantity = (reorderThreshold * 3) - currentStock (minimum 1 unit)
   *
   * @param {Object} product
   * @param {Object} context
   * @returns {Promise<Object>}
   */
  async suggestReorder(product, context = {}) {
    const currentStock = Number(product.stockLevel);
    const reorderThreshold = Number(product.reorderThreshold);
    const triggerReason = context.triggerReason || TRIGGER_REASONS.MANUAL;

    // Baseline calculation: target depth is 3x reorder threshold
    const targetBuffer = reorderThreshold * 3;
    const rawQuantity = targetBuffer - currentStock;
    const recommendedQuantity = Math.max(1, Math.round(rawQuantity));
    const suggestedLeadTimeDays = 7;

    return {
      currentStock,
      recommendedQuantity,
      suggestedLeadTimeDays,
      confidence: 0.85,
      reasoning: `Replenishment target calculated as 3x threshold (${targetBuffer} units) minus on-hand inventory (${currentStock} units), yielding ${recommendedQuantity} units for purchase order with standard 7-day lead time.`,
      triggerReason,
    };
  }
}

export default RuleBasedCommerceStrategy;
