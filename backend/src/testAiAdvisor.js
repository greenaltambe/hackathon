import http from 'http';
import app from './app.js';
import { connectDB, disconnectDB } from './config/db.js';
import { seedDatabase } from './seed.js';
import {
  Product,
  PricingSuggestion,
  ReorderSuggestion,
  CHANGE_DIRECTION,
  SUGGESTION_STATUS,
  TRIGGER_REASONS,
} from './models/index.js';
import {
  CommerceAdvisor,
  RuleBasedCommerceStrategy,
  AICommerceStrategy,
  strategyRegistry,
} from './services/commerce/index.js';
import { GeminiClient, geminiClient } from './services/ai/geminiClient.js';
import { buildPricingPrompt, buildReorderPrompt } from './services/ai/promptBuilder.js';
import { validateAndNormalizePricing, validateAndNormalizeReorder } from './services/ai/aiValidator.js';

const TEST_PORT = 5097;
const BASE_URL = `http://127.0.0.1:${TEST_PORT}/api`;

let server;
let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  \x1b[32m✔ PASS\x1b[0m: ${message}`);
    passed++;
  } else {
    console.error(`  \x1b[31m✘ FAIL\x1b[0m: ${message}`);
    failed++;
  }
}

async function request(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });

  const text = await response.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch (e) {
    json = { raw: text };
  }

  return {
    status: response.status,
    ok: response.ok,
    body: json,
  };
}

async function runAiTests() {
  console.log('\n========================================');
  console.log('  StockPulse AI Commerce Advisor Test Suite');
  console.log('========================================\n');

  try {
    await connectDB();
    await seedDatabase({ clean: true });

    // Start ephemeral server
    server = http.createServer(app);
    await new Promise((resolve) => server.listen(TEST_PORT, resolve));
    console.log(`[AI Test Server] Listening on ${BASE_URL}\n`);

    const mockClient = new GeminiClient({ apiKey: 'mock-test-key' });
    const aiStrategy = new AICommerceStrategy({ client: mockClient });

    const sampleProduct = {
      _id: '64f000000000000000000001',
      productId: 'PRD-003',
      sku: 'SKU-APP-001',
      name: 'Organic Cotton T-Shirt',
      category: 'APPAREL',
      currentPrice: 24.99,
      stockLevel: 8,
      reorderThreshold: 15,
      demandVelocity: 12,
      status: 'PRICE_REVIEW_PENDING',
    };

    // ------------------------------------------------------------------
    // [1] UNIT: Prompt Builder Tests
    // ------------------------------------------------------------------
    console.log('[1] Testing Prompt Builder Structure & Situations:');
    const lowStockPrompt = buildPricingPrompt(sampleProduct, {
      triggerReason: TRIGGER_REASONS.INVENTORY_LOW,
      categoryAverageDemandVelocity: 9.67,
    });
    assert(lowStockPrompt.includes('INVENTORY_LOW ALERT'), 'Pricing prompt includes INVENTORY_LOW situational guidance');
    assert(lowStockPrompt.includes('Organic Cotton T-Shirt'), 'Pricing prompt includes product name');
    assert(lowStockPrompt.includes('9.67'), 'Pricing prompt includes category average velocity');

    const spikePrompt = buildPricingPrompt(sampleProduct, {
      triggerReason: TRIGGER_REASONS.DEMAND_SPIKE,
      categoryAverageDemandVelocity: 9.67,
    });
    assert(spikePrompt.includes('DEMAND_SPIKE ALERT'), 'Pricing prompt includes DEMAND_SPIKE situational guidance');

    const reorderPrompt = buildReorderPrompt(sampleProduct, {
      triggerReason: TRIGGER_REASONS.INVENTORY_LOW,
    });
    assert(reorderPrompt.includes('recommendedQuantity'), 'Reorder prompt specifies recommendedQuantity schema');

    // ------------------------------------------------------------------
    // [2] UNIT: Successful AI Pricing & Reorder Parsing
    // ------------------------------------------------------------------
    console.log('\n[2] Testing Successful AI Pricing & Reorder Recommendation:');

    // Mock valid Gemini pricing response
    mockClient.setMockCaller(async () => {
      return {
        recommendedPrice: 28.99,
        direction: 'INCREASE',
        confidence: 0.88,
        reasoning: 'Stock is critically low at 8 units with strong demand. Raising price to $28.99 captures high margin and slows stockout rate.',
      };
    });

    const aiPricing = await aiStrategy.suggestPricing(sampleProduct, {
      triggerReason: TRIGGER_REASONS.INVENTORY_LOW,
    });
    assert(aiPricing.recommendedPrice === 28.99, 'AI pricing parsed recommendedPrice ($28.99)');
    assert(aiPricing.direction === CHANGE_DIRECTION.INCREASE, 'AI pricing parsed direction (INCREASE)');
    assert(aiPricing.confidence === 0.88, 'AI pricing parsed confidence score (0.88)');
    assert(aiPricing.reasoning.includes('Stock is critically low'), 'AI pricing parsed reasoning text');

    // Mock valid Gemini reorder response
    mockClient.setMockCaller(async () => {
      return {
        recommendedQuantity: 42,
        suggestedLeadTimeDays: 6,
        confidence: 0.91,
        reasoning: 'Demand velocity of 12 units/day warrants 42 units for 3.5 days coverage plus safety stock.',
      };
    });

    const aiReorder = await aiStrategy.suggestReorder(sampleProduct, {
      triggerReason: TRIGGER_REASONS.INVENTORY_LOW,
    });
    assert(aiReorder.recommendedQuantity === 42, 'AI reorder parsed recommendedQuantity (42)');
    assert(aiReorder.suggestedLeadTimeDays === 6, 'AI reorder parsed suggestedLeadTimeDays (6)');
    assert(aiReorder.confidence === 0.91, 'AI reorder parsed confidence (0.91)');

    // ------------------------------------------------------------------
    // [3] UNIT: Malformed / Non-JSON Gemini Response Fallback
    // ------------------------------------------------------------------
    console.log('\n[3] Testing Malformed JSON Response Fallback:');
    mockClient.setMockCaller(async () => {
      return 'INVALID_NON_JSON_STRING_RESPONSE { corrupt';
    });

    // Should fall back to RuleBasedCommerceStrategy (+10% on low stock: 24.99 * 1.10 = 27.49)
    const fallbackPriceMalformed = await aiStrategy.suggestPricing(sampleProduct, {
      triggerReason: TRIGGER_REASONS.INVENTORY_LOW,
    });
    assert(fallbackPriceMalformed.recommendedPrice === 27.49, 'Malformed JSON falls back to RuleBasedStrategy (+10% -> $27.49)');
    assert(fallbackPriceMalformed.direction === CHANGE_DIRECTION.INCREASE, 'Fallback maintains INCREASE direction');
    assert(fallbackPriceMalformed.confidence === 0.85, 'Fallback confidence is 0.85');

    // ------------------------------------------------------------------
    // [4] UNIT: Invalid Price Bounds Fallback
    // ------------------------------------------------------------------
    console.log('\n[4] Testing Out-of-Bounds Price Fallback:');

    // Case 4A: Negative price
    mockClient.setMockCaller(async () => ({
      recommendedPrice: -15.00,
      direction: 'INCREASE',
      confidence: 0.9,
      reasoning: 'Negative price from model bug',
    }));
    const fallbackNegativePrice = await aiStrategy.suggestPricing(sampleProduct, {
      triggerReason: TRIGGER_REASONS.INVENTORY_LOW,
    });
    assert(fallbackNegativePrice.recommendedPrice === 27.49, 'Negative price falls back to RuleBasedStrategy ($27.49)');

    // Case 4B: Absurd price > 10x
    mockClient.setMockCaller(async () => ({
      recommendedPrice: 25000.00, // 1000x current price
      direction: 'INCREASE',
      confidence: 0.9,
      reasoning: 'Astronomical price',
    }));
    const fallbackAbsurdPrice = await aiStrategy.suggestPricing(sampleProduct, {
      triggerReason: TRIGGER_REASONS.INVENTORY_LOW,
    });
    assert(fallbackAbsurdPrice.recommendedPrice === 27.49, 'Absurd 1000x price falls back to RuleBasedStrategy ($27.49)');

    // ------------------------------------------------------------------
    // [5] UNIT: Invalid Reorder Quantity Fallback
    // ------------------------------------------------------------------
    console.log('\n[5] Testing Invalid Reorder Quantity Fallback:');

    // Case 5A: Zero quantity
    mockClient.setMockCaller(async () => ({
      recommendedQuantity: 0,
      confidence: 0.8,
      reasoning: 'Zero quantity error',
    }));
    // Rule fallback: (15 * 3) - 8 = 37
    const fallbackZeroQty = await aiStrategy.suggestReorder(sampleProduct, {
      triggerReason: TRIGGER_REASONS.INVENTORY_LOW,
    });
    assert(fallbackZeroQty.recommendedQuantity === 37, 'Zero quantity falls back to RuleBasedStrategy (37 units)');

    // Case 5B: Decimal quantity
    mockClient.setMockCaller(async () => ({
      recommendedQuantity: 15.75,
      confidence: 0.8,
      reasoning: 'Decimal quantity error',
    }));
    const fallbackDecimalQty = await aiStrategy.suggestReorder(sampleProduct, {
      triggerReason: TRIGGER_REASONS.INVENTORY_LOW,
    });
    assert(fallbackDecimalQty.recommendedQuantity === 37, 'Decimal quantity falls back to RuleBasedStrategy (37 units)');

    // ------------------------------------------------------------------
    // [6] UNIT: Invalid Confidence Fallback
    // ------------------------------------------------------------------
    console.log('\n[6] Testing Out-of-Bounds Confidence Fallback:');
    mockClient.setMockCaller(async () => ({
      recommendedPrice: 28.00,
      direction: 'INCREASE',
      confidence: 1.85, // > 1.0
      reasoning: 'Invalid confidence score',
    }));
    const fallbackConfidence = await aiStrategy.suggestPricing(sampleProduct, {
      triggerReason: TRIGGER_REASONS.INVENTORY_LOW,
    });
    assert(fallbackConfidence.recommendedPrice === 27.49, 'Confidence > 1.0 falls back to RuleBasedStrategy ($27.49)');

    // ------------------------------------------------------------------
    // [7] UNIT: Gemini Timeout / API Exception Fallback
    // ------------------------------------------------------------------
    console.log('\n[7] Testing Gemini Timeout & Network Error Fallback:');
    mockClient.setMockCaller(async () => {
      throw new Error('Gemini API call timed out after 8000ms');
    });
    const fallbackTimeout = await aiStrategy.suggestPricing(sampleProduct, {
      triggerReason: TRIGGER_REASONS.INVENTORY_LOW,
    });
    assert(fallbackTimeout.recommendedPrice === 27.49, 'Gemini timeout triggers seamless fallback to RuleBasedStrategy');

    // ------------------------------------------------------------------
    // [8] UNIT: Strategy Switching via StrategyRegistry
    // ------------------------------------------------------------------
    console.log('\n[8] Testing Strategy Selection in StrategyRegistry:');
    const ruleInstance = strategyRegistry.get('rule');
    assert(ruleInstance instanceof RuleBasedCommerceStrategy, 'COMMERCE_STRATEGY=rule returns RuleBasedCommerceStrategy');

    const aiInstance = strategyRegistry.get('ai');
    assert(aiInstance instanceof AICommerceStrategy, 'COMMERCE_STRATEGY=ai returns AICommerceStrategy');

    const geminiAlias = strategyRegistry.get('gemini');
    assert(geminiAlias instanceof AICommerceStrategy, 'COMMERCE_STRATEGY=gemini returns AICommerceStrategy');

    // ------------------------------------------------------------------
    // [9] INTEGRATION: REST Endpoints with AI Strategy
    // ------------------------------------------------------------------
    console.log('\n[9] Testing Suggestion REST Endpoints with AI Strategy:');

    // Hook mock caller to global geminiClient for HTTP endpoint testing
    geminiClient.setMockCaller(async (prompt) => {
      if (prompt.includes('pricing recommendation')) {
        return {
          recommendedPrice: 29.50,
          direction: 'INCREASE',
          confidence: 0.93,
          reasoning: 'AI pricing recommendation for PRD-003 under high velocity and low inventory.',
        };
      }
      return {
        recommendedQuantity: 45,
        suggestedLeadTimeDays: 7,
        confidence: 0.90,
        reasoning: 'AI reorder recommendation based on current burn rate.',
      };
    });

    const httpPricing = await request('/products/PRD-003/suggest-pricing?strategy=ai', {
      method: 'POST',
      body: JSON.stringify({ triggerReason: TRIGGER_REASONS.INVENTORY_LOW }),
    });
    assert(httpPricing.status === 201, 'POST /api/products/PRD-003/suggest-pricing?strategy=ai returns 201 Created');
    assert(httpPricing.body.data.recommendedPrice === 29.50, 'Returned AI recommended price ($29.50)');
    assert(httpPricing.body.data.direction === CHANGE_DIRECTION.INCREASE, 'Direction is INCREASE');
    assert(httpPricing.body.data.status === SUGGESTION_STATUS.PENDING, 'Suggestion status is PENDING');

    // Verify Product is unchanged
    const prd003InDb = await Product.findOne({ productId: 'PRD-003' });
    assert(prd003InDb.currentPrice === 24.99, 'Product currentPrice remains unchanged at $24.99');

    const httpReorder = await request('/products/PRD-003/suggest-reorder?strategy=ai', {
      method: 'POST',
      body: JSON.stringify({ triggerReason: TRIGGER_REASONS.INVENTORY_LOW }),
    });
    assert(httpReorder.status === 201, 'POST /api/products/PRD-003/suggest-reorder?strategy=ai returns 201 Created');
    assert(httpReorder.body.data.recommendedQuantity === 45, 'Returned AI recommended quantity (45)');
    assert(prd003InDb.stockLevel === 8, 'Product stockLevel remains unchanged at 8');

    // Clean up mock
    geminiClient.clearMockCaller();

    // ------------------------------------------------------------------
    // [10] CLEANUP
    // ------------------------------------------------------------------
    console.log('\n[10] Cleaning Up Test Artifacts:');
    await PricingSuggestion.deleteMany({});
    await ReorderSuggestion.deleteMany({});
    await seedDatabase({ clean: true });
    assert(true, 'Clean seed state restored');

  } catch (err) {
    console.error(`\n\x1b[31mFATAL AI TEST ERROR:\x1b[0m ${err.message}`, err);
    failed++;
  } finally {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
    await disconnectDB();
    console.log('\n========================================');
    console.log(`  AI Tests Completed: \x1b[32m${passed} Passed\x1b[0m, \x1b[31m${failed} Failed\x1b[0m`);
    console.log('========================================\n');
    if (failed > 0) {
      process.exit(1);
    }
  }
}

runAiTests();
