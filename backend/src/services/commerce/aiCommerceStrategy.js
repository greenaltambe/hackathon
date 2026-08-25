import { CommerceAdvisor } from './commerceAdvisor.js';
import { RuleBasedCommerceStrategy } from './ruleBasedStrategy.js';
import { geminiClient } from '../ai/geminiClient.js';
import { buildPricingPrompt, buildReorderPrompt } from '../ai/promptBuilder.js';
import { validateAndNormalizePricing, validateAndNormalizeReorder } from '../ai/aiValidator.js';

/**
 * AI-Powered Commerce Strategy utilizing Google Gemini API.
 * Encapsulates prompt construction, structured JSON generation, domain validation,
 * and transparent fallback to RuleBasedCommerceStrategy upon failure.
 */
export class AICommerceStrategy extends CommerceAdvisor {
  /**
   * @param {Object} [options]
   * @param {Object} [options.client] - Injected GeminiClient instance (useful for testing)
   * @param {CommerceAdvisor} [options.fallbackStrategy] - Fallback strategy instance
   */
  constructor({ client = geminiClient, fallbackStrategy = null } = {}) {
    super();
    this.client = client;
    this.fallbackStrategy = fallbackStrategy || new RuleBasedCommerceStrategy();
  }

  /**
   * Generates AI pricing recommendation with automatic rule-based fallback.
   * @param {Object} product
   * @param {Object} context
   * @returns {Promise<Object>}
   */
  async suggestPricing(product, context = {}) {
    try {
      const prompt = buildPricingPrompt(product, context);
      const rawOutput = await this.client.generateJson(prompt);
      const validated = validateAndNormalizePricing(rawOutput, product, context);

      return validated;
    } catch (error) {
      console.warn(`[AI Strategy] Pricing generation error (${error.message}). Falling back to RuleBasedStrategy.`);
      return await this.fallbackStrategy.suggestPricing(product, context);
    }
  }

  /**
   * Generates AI inventory replenishment recommendation with automatic rule-based fallback.
   * @param {Object} product
   * @param {Object} context
   * @returns {Promise<Object>}
   */
  async suggestReorder(product, context = {}) {
    try {
      const prompt = buildReorderPrompt(product, context);
      const rawOutput = await this.client.generateJson(prompt);
      const validated = validateAndNormalizeReorder(rawOutput, product, context);

      return validated;
    } catch (error) {
      console.warn(`[AI Strategy] Reorder generation error (${error.message}). Falling back to RuleBasedStrategy.`);
      return await this.fallbackStrategy.suggestReorder(product, context);
    }
  }
}

export default AICommerceStrategy;
