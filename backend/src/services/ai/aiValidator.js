import { CHANGE_DIRECTION, TRIGGER_REASONS } from '../../models/index.js';

/**
 * Validates and normalizes raw Gemini AI output into strict, domain-compliant shapes.
 * Throws errors on any invalid, corrupt, or out-of-bounds output to trigger
 * the deterministic fallback strategy.
 */

/**
 * Validate and normalize raw AI Pricing recommendation output
 * @param {Object} rawOutput - Unparsed/parsed JSON from LLM
 * @param {Object} product - Source Product document
 * @param {Object} context - Strategy context
 * @returns {Object} Validated pricing recommendation
 */
export function validateAndNormalizePricing(rawOutput, product, context = {}) {
  if (!rawOutput || typeof rawOutput !== 'object') {
    throw new Error('LLM output is not a valid JSON object.');
  }

  const currentPrice = Number(product.currentPrice);
  const recPriceNum = Number(rawOutput.recommendedPrice);

  if (isNaN(recPriceNum) || recPriceNum <= 0) {
    throw new Error(`LLM recommendedPrice '${rawOutput.recommendedPrice}' must be a positive number > 0.`);
  }

  // Sane bounds check: Flag prices > 10x or < 0.1x of current price
  if (currentPrice > 0) {
    if (recPriceNum > currentPrice * 10) {
      throw new Error(`LLM recommendedPrice ($${recPriceNum}) exceeds sanity bound of 10x current price ($${currentPrice}).`);
    }
    if (recPriceNum < currentPrice * 0.1) {
      throw new Error(`LLM recommendedPrice ($${recPriceNum}) is below sanity bound of 0.1x current price ($${currentPrice}).`);
    }
  }

  const directionUpper = String(rawOutput.direction || '').trim().toUpperCase();
  if (!Object.values(CHANGE_DIRECTION).includes(directionUpper)) {
    throw new Error(`LLM direction '${rawOutput.direction}' is invalid. Expected one of: ${Object.values(CHANGE_DIRECTION).join(', ')}`);
  }

  const confidenceNum = Number(rawOutput.confidence);
  if (isNaN(confidenceNum) || confidenceNum < 0.0 || confidenceNum > 1.0) {
    throw new Error(`LLM confidence '${rawOutput.confidence}' must be a number between 0.0 and 1.0.`);
  }

  const reasoningStr = String(rawOutput.reasoning || '').trim();
  if (!reasoningStr || reasoningStr.length < 5) {
    throw new Error('LLM reasoning is missing or too brief.');
  }

  return {
    currentPrice,
    recommendedPrice: Math.round(recPriceNum * 100) / 100,
    direction: directionUpper,
    confidence: Math.round(confidenceNum * 100) / 100,
    reasoning: reasoningStr,
    triggerReason: context.triggerReason || TRIGGER_REASONS.MANUAL,
  };
}

/**
 * Validate and normalize raw AI Reorder recommendation output
 * @param {Object} rawOutput - Unparsed/parsed JSON from LLM
 * @param {Object} product - Source Product document
 * @param {Object} context - Strategy context
 * @returns {Object} Validated reorder recommendation
 */
export function validateAndNormalizeReorder(rawOutput, product, context = {}) {
  if (!rawOutput || typeof rawOutput !== 'object') {
    throw new Error('LLM output is not a valid JSON object.');
  }

  const currentStock = Number(product.stockLevel);
  const recQtyNum = Number(rawOutput.recommendedQuantity);

  if (isNaN(recQtyNum) || !Number.isInteger(recQtyNum) || recQtyNum < 1) {
    throw new Error(`LLM recommendedQuantity '${rawOutput.recommendedQuantity}' must be a positive integer >= 1.`);
  }

  const leadTimeNum = Number(rawOutput.suggestedLeadTimeDays !== undefined ? rawOutput.suggestedLeadTimeDays : 7);
  if (isNaN(leadTimeNum) || leadTimeNum < 0) {
    throw new Error(`LLM suggestedLeadTimeDays '${rawOutput.suggestedLeadTimeDays}' must be a non-negative number.`);
  }

  const confidenceNum = Number(rawOutput.confidence);
  if (isNaN(confidenceNum) || confidenceNum < 0.0 || confidenceNum > 1.0) {
    throw new Error(`LLM confidence '${rawOutput.confidence}' must be a number between 0.0 and 1.0.`);
  }

  const reasoningStr = String(rawOutput.reasoning || '').trim();
  if (!reasoningStr || reasoningStr.length < 5) {
    throw new Error('LLM reasoning is missing or too brief.');
  }

  return {
    currentStock,
    recommendedQuantity: recQtyNum,
    suggestedLeadTimeDays: Math.round(leadTimeNum),
    confidence: Math.round(confidenceNum * 100) / 100,
    reasoning: reasoningStr,
    triggerReason: context.triggerReason || TRIGGER_REASONS.MANUAL,
  };
}

export default {
  validateAndNormalizePricing,
  validateAndNormalizeReorder,
};
