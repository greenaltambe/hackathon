import { TRIGGER_REASONS } from '../../models/index.js';

/**
 * Builds structured prompts for Gemini AI Commerce Advisor.
 * Distinguishes INVENTORY_LOW vs DEMAND_SPIKE vs MANUAL trigger contexts.
 */

/**
 * Construct prompt for AI Pricing Recommendation
 * @param {Object} product
 * @param {Object} context
 * @returns {string}
 */
export function buildPricingPrompt(product, context = {}) {
  const triggerReason = context.triggerReason || TRIGGER_REASONS.MANUAL;
  const categoryAvg = Number(context.categoryAverageDemandVelocity || 0);

  let situationalGuidance = '';
  if (triggerReason === TRIGGER_REASONS.INVENTORY_LOW) {
    situationalGuidance = `
SITUATION: INVENTORY_LOW ALERT
The on-hand inventory (${product.stockLevel} units) has fallen below the critical reorder threshold (${product.reorderThreshold} units).
Analyze whether raising the price will slow inventory depletion and capture scarcity margin, or whether holding price is optimal given category demand elasticity.
`;
  } else if (triggerReason === TRIGGER_REASONS.DEMAND_SPIKE) {
    situationalGuidance = `
SITUATION: DEMAND_SPIKE ALERT
The product is experiencing rapid sales velocity (${product.demandVelocity} orders/24h) significantly above typical demand.
Analyze whether capitalizing with a price increase captures excess consumer surplus without abruptly killing sales momentum.
`;
  } else {
    situationalGuidance = `
SITUATION: ON-DEMAND / MANUAL REVIEW
Evaluate current inventory depth and sales velocity relative to the category benchmark to determine if price adjustment or holding current price is warranted.
`;
  }

  return `
You are the StockPulse AI Commerce Advisor. Analyze the following product data and generate an optimal pricing recommendation.

PRODUCT CONTEXT:
- Name: ${product.name}
- SKU: ${product.sku}
- Category: ${product.category}
- Current Selling Price: $${Number(product.currentPrice).toFixed(2)}
- Current On-Hand Stock: ${product.stockLevel} units
- Reorder Threshold: ${product.reorderThreshold} units
- Demand Velocity (Last 24h): ${product.demandVelocity} orders
- Category Average Velocity (${product.category}): ${categoryAvg.toFixed(2)} orders/24h
- Trigger Source: ${triggerReason}

${situationalGuidance}

REQUIREMENTS:
1. Provide a realistic 'recommendedPrice' (positive number). Do not suggest extreme prices (e.g. 10x current price or $0).
2. Set 'direction' to exactly one of: "INCREASE", "DECREASE", "HOLD".
3. Provide a 'confidence' score between 0.0 and 1.0 representing certainty.
4. Provide a clear, actionable 'reasoning' explanation (1-3 sentences) for human merchandisers explaining why this price action is optimal.
5. Do NOT invent attributes or non-existent facts.

OUTPUT JSON SCHEMA:
{
  "recommendedPrice": number,
  "direction": "INCREASE" | "DECREASE" | "HOLD",
  "confidence": number,
  "reasoning": string
}
`.trim();
}

/**
 * Construct prompt for AI Inventory Replenishment Recommendation
 * @param {Object} product
 * @param {Object} context
 * @returns {string}
 */
export function buildReorderPrompt(product, context = {}) {
  const triggerReason = context.triggerReason || TRIGGER_REASONS.MANUAL;
  const categoryAvg = Number(context.categoryAverageDemandVelocity || 0);

  return `
You are the StockPulse AI Commerce Advisor. Analyze the following inventory and demand velocity metrics to recommend an optimal replenishment purchase order quantity.

PRODUCT INVENTORY CONTEXT:
- Name: ${product.name}
- SKU: ${product.sku}
- Category: ${product.category}
- Current On-Hand Stock: ${product.stockLevel} units
- Reorder Threshold: ${product.reorderThreshold} units
- Demand Velocity (Last 24h): ${product.demandVelocity} orders
- Category Average Velocity (${product.category}): ${categoryAvg.toFixed(2)} orders/24h
- Trigger Source: ${triggerReason}

REQUIREMENTS:
1. Provide a 'recommendedQuantity' as a POSITIVE WHOLE INTEGER (minimum 1 unit).
2. Suggest realistic 'suggestedLeadTimeDays' (e.g. 3 to 14 days, default ~7 days).
3. Provide a 'confidence' score between 0.0 and 1.0.
4. Provide a clear, professional 'reasoning' explanation for the replenishment order, noting days of inventory coverage and safety stock.
5. Do NOT invent attributes or non-existent suppliers.

OUTPUT JSON SCHEMA:
{
  "recommendedQuantity": number,
  "suggestedLeadTimeDays": number,
  "confidence": number,
  "reasoning": string
}
`.trim();
}

export default {
  buildPricingPrompt,
  buildReorderPrompt,
};
