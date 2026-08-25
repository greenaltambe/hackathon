/**
 * Base Abstract Contract for Commerce Advisors in StockPulse.
 * Defines the common interface that all pricing and replenishment strategies
 * (Rule-Based, AI-Powered, Competitor-Aware) must implement.
 */
export class CommerceAdvisor {
  /**
   * Generates a pricing recommendation for a given product and context.
   *
   * @param {Object} product - The Product document or snapshot
   * @param {Object} context - Strategy context
   * @param {number} [context.categoryAverageDemandVelocity=0] - Category benchmark velocity
   * @param {string} [context.triggerReason='MANUAL'] - Trigger source enum
   * @returns {Promise<Object>} Recommendation with fields:
   *  - currentPrice {number}
   *  - recommendedPrice {number}
   *  - direction {'INCREASE' | 'DECREASE' | 'HOLD'}
   *  - confidence {number} (0.0 - 1.0)
   *  - reasoning {string}
   *  - triggerReason {string}
   */
  async suggestPricing(product, context = {}) {
    throw new Error('CommerceAdvisor.suggestPricing() must be implemented by subclass.');
  }

  /**
   * Generates an inventory replenishment recommendation for a given product and context.
   *
   * @param {Object} product - The Product document or snapshot
   * @param {Object} context - Strategy context
   * @param {string} [context.triggerReason='MANUAL'] - Trigger source enum
   * @returns {Promise<Object>} Recommendation with fields:
   *  - currentStock {number}
   *  - recommendedQuantity {number} (positive integer >= 1)
   *  - suggestedLeadTimeDays {number}
   *  - confidence {number} (0.0 - 1.0)
   *  - reasoning {string}
   *  - triggerReason {string}
   */
  async suggestReorder(product, context = {}) {
    throw new Error('CommerceAdvisor.suggestReorder() must be implemented by subclass.');
  }
}

/**
 * Strategy Registry enabling centralized, runtime-configurable strategy selection.
 * New strategies (AI, Competitor-Aware) can register themselves without modifying controllers.
 */
export class CommerceStrategyRegistry {
  constructor() {
    this.strategies = new Map();
    this.defaultStrategyKey = 'rule';
  }

  /**
   * Register a strategy instance under one or more aliases.
   * @param {string|string[]} keys
   * @param {CommerceAdvisor} strategyInstance
   */
  register(keys, strategyInstance) {
    if (!(strategyInstance instanceof CommerceAdvisor)) {
      throw new TypeError('Strategy instance must inherit from CommerceAdvisor.');
    }

    const keyList = Array.isArray(keys) ? keys : [keys];
    for (const key of keyList) {
      this.strategies.set(key.toLowerCase(), strategyInstance);
    }
  }

  /**
   * Retrieves a strategy by name, or falls back to active environment/default strategy.
   * @param {string} [strategyName]
   * @returns {CommerceAdvisor}
   */
  get(strategyName = null) {
    const key = (
      strategyName ||
      process.env.COMMERCE_STRATEGY ||
      this.defaultStrategyKey
    ).toLowerCase();

    const strategy = this.strategies.get(key);
    if (!strategy) {
      const available = Array.from(this.strategies.keys()).join(', ');
      throw new Error(`Commerce Strategy '${key}' is not registered. Available strategies: [${available}]`);
    }

    return strategy;
  }

  /**
   * Returns list of all registered strategy names.
   * @returns {string[]}
   */
  list() {
    return Array.from(this.strategies.keys());
  }
}

export const strategyRegistry = new CommerceStrategyRegistry();
export default CommerceAdvisor;
