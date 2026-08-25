import { TRIGGER_REASONS } from '../../models/index.js';

/**
 * Dedicated Signal Detection Domain Component for StockPulse.
 * Inspects product inventory levels and demand velocity trends relative to
 * category averages to identify autonomous recommendation triggers.
 */
export class SignalDetector {
  /**
   * Evaluates product metrics against inventory and demand signal rules.
   *
   * @param {Object} product - Product document or snapshot
   * @param {number} [categoryAverageDemandVelocity=0] - Benchmark velocity for the category
   * @returns {Object} Signal evaluation result
   */
  detectSignals(product, categoryAverageDemandVelocity = 0) {
    const stockLevel = Number(product.stockLevel);
    const reorderThreshold = Number(product.reorderThreshold);
    const demandVelocity = Number(product.demandVelocity || 0);
    const categoryAvg = Number(categoryAverageDemandVelocity || 0);

    const signals = [];

    // Trigger A: Inventory Low (stock strictly below reorder threshold)
    if (stockLevel < reorderThreshold) {
      signals.push({
        trigger: TRIGGER_REASONS.INVENTORY_LOW,
        reason: `Inventory level (${stockLevel} units) is below reorder threshold (${reorderThreshold} units).`,
        priority: 1, // Highest priority: imminent stockout risk
      });
    }

    // Trigger B: Demand Spike (demand velocity strictly greater than 2x category average)
    if (categoryAvg > 0 && demandVelocity > 2 * categoryAvg) {
      signals.push({
        trigger: TRIGGER_REASONS.DEMAND_SPIKE,
        reason: `Demand velocity (${demandVelocity} orders/24h) exceeds 2x category average (${categoryAvg.toFixed(1)} orders/24h).`,
        priority: 2,
      });
    }

    // Sort signals by priority
    signals.sort((a, b) => a.priority - b.priority);

    return {
      hasSignal: signals.length > 0,
      signals,
      primaryTrigger: signals.length > 0 ? signals[0].trigger : null,
      context: {
        stockLevel,
        reorderThreshold,
        demandVelocity,
        categoryAverageDemandVelocity: categoryAvg,
      },
    };
  }
}

export const signalDetector = new SignalDetector();
export default signalDetector;
