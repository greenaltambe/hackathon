import {
  Product,
  PricingSuggestion,
  ReorderSuggestion,
  PRODUCT_STATUS,
  SUGGESTION_STATUS,
} from '../../models/index.js';
import { signalDetector } from './signalDetector.js';
import { strategyRegistry } from '../commerce/index.js';
import { getCategoryAverageDemandVelocity, findProductByIdOrCode } from '../productService.js';

/**
 * Agentic Recommendation Loop worker for StockPulse.
 * Listens for inventory and demand events, detects triggers, ensures idempotency,
 * and asynchronously generates pricing and replenishment suggestions using CommerceAdvisor.
 */
export class AgenticLoop {
  constructor({ detector = signalDetector, registry = strategyRegistry } = {}) {
    this.detector = detector;
    this.registry = registry;
  }

  /**
   * Processes a product's state against the signal detection and recommendation workflow.
   *
   * @param {string} productId - Product ID or business code
   * @param {Object} [options]
   * @param {string} [options.strategyName] - Optional override for active strategy
   * @returns {Promise<Object>} Summary of generated or skipped suggestions
   */
  async processProductSignal(productId, options = {}) {
    try {
      const product = await findProductByIdOrCode(productId);
      if (!product) {
        console.warn(`[Agentic Loop] Product '${productId}' not found. Skipping signal processing.`);
        return { processed: false, reason: 'Product not found' };
      }

      // 1. Gather category-level demand context
      const categoryAvg = await getCategoryAverageDemandVelocity(product.category);

      // 2. Evaluate signals
      const evaluation = this.detector.detectSignals(product, categoryAvg);
      if (!evaluation.hasSignal) {
        console.log(`[Agentic Loop] No signals detected for product ${product.sku} (Stock: ${product.stockLevel}, Velocity: ${product.demandVelocity}, CatAvg: ${categoryAvg.toFixed(1)}).`);
        return { processed: false, reason: 'No trigger signal' };
      }

      console.log(`[Agentic Loop] Detected ${evaluation.signals.length} signal(s) for ${product.sku}: ${evaluation.signals.map(s => s.trigger).join(', ')}`);

      const strategy = this.registry.get(options.strategyName);
      const results = {
        productId: product.productId || product._id.toString(),
        sku: product.sku,
        pricingSuggestions: [],
        reorderSuggestions: [],
        skippedPricing: [],
        skippedReorder: [],
      };

      // 3. Process each signal through CommerceAdvisor with duplicate prevention
      for (const signal of evaluation.signals) {
        const trigger = signal.trigger;

        // --- PRICING SUGGESTION ---
        const existingPendingPricing = await PricingSuggestion.findOne({
          product: product._id,
          status: SUGGESTION_STATUS.PENDING,
          triggerReason: trigger,
        });

        if (existingPendingPricing) {
          console.log(`[Agentic Loop] Skipped duplicate pending PricingSuggestion for ${product.sku} (Trigger: ${trigger}).`);
          results.skippedPricing.push({ trigger, existingId: existingPendingPricing._id });
        } else {
          try {
            const recommendation = await strategy.suggestPricing(product, {
              categoryAverageDemandVelocity: categoryAvg,
              triggerReason: trigger,
            });

            const pricingSuggestion = new PricingSuggestion({
              product: product._id,
              currentPrice: recommendation.currentPrice,
              recommendedPrice: recommendation.recommendedPrice,
              direction: recommendation.direction,
              confidence: recommendation.confidence,
              reasoning: recommendation.reasoning,
              status: SUGGESTION_STATUS.PENDING,
              triggerReason: recommendation.triggerReason,
            });

            await pricingSuggestion.save();
            results.pricingSuggestions.push(pricingSuggestion);

            // Transition product status to PRICE_REVIEW_PENDING if ACTIVE
            if (product.status === PRODUCT_STATUS.ACTIVE) {
              product.status = PRODUCT_STATUS.PRICE_REVIEW_PENDING;
              await product.save();
            }

            console.log(`[Agentic Loop] Created PricingSuggestion for ${product.sku} (${trigger}: $${product.currentPrice} -> $${recommendation.recommendedPrice}, ${recommendation.direction}).`);
          } catch (pricingError) {
            console.error(`[Agentic Loop] Error generating pricing suggestion for ${product.sku}:`, pricingError.message);
          }
        }

        // --- REORDER SUGGESTION ---
        const existingPendingReorder = await ReorderSuggestion.findOne({
          product: product._id,
          status: SUGGESTION_STATUS.PENDING,
          triggerReason: trigger,
        });

        if (existingPendingReorder) {
          console.log(`[Agentic Loop] Skipped duplicate pending ReorderSuggestion for ${product.sku} (Trigger: ${trigger}).`);
          results.skippedReorder.push({ trigger, existingId: existingPendingReorder._id });
        } else {
          try {
            const recommendation = await strategy.suggestReorder(product, {
              categoryAverageDemandVelocity: categoryAvg,
              triggerReason: trigger,
            });

            const reorderSuggestion = new ReorderSuggestion({
              product: product._id,
              currentStock: recommendation.currentStock,
              recommendedQuantity: recommendation.recommendedQuantity,
              suggestedLeadTimeDays: recommendation.suggestedLeadTimeDays,
              confidence: recommendation.confidence,
              reasoning: recommendation.reasoning,
              status: SUGGESTION_STATUS.PENDING,
              triggerReason: recommendation.triggerReason,
            });

            await reorderSuggestion.save();
            results.reorderSuggestions.push(reorderSuggestion);

            console.log(`[Agentic Loop] Created ReorderSuggestion for ${product.sku} (${trigger}: ${recommendation.recommendedQuantity} units).`);
          } catch (reorderError) {
            console.error(`[Agentic Loop] Error generating reorder suggestion for ${product.sku}:`, reorderError.message);
          }
        }
      }

      return { processed: true, results };
    } catch (err) {
      console.error(`[Agentic Loop] Error processing product signal for ${productId}:`, err.message);
      return { processed: false, error: err.message };
    }
  }

  /**
   * Domain event listener callback.
   * Dispatched asynchronously when an order is simulated or stock level is modified.
   *
   * @param {Object} event - Domain event
   */
  async handleInventoryEvent(event) {
    const targetId = event.id || event.productId;
    if (!targetId) return;

    console.log(`[Agentic Loop] Received domain event ${event.type} (${event.eventId}) for product ${targetId}`);
    await this.processProductSignal(targetId);
  }
}

export const agenticLoop = new AgenticLoop();
export default agenticLoop;
