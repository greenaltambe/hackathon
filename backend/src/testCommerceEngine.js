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
  strategyRegistry,
} from './services/commerce/index.js';
import { getCategoryAverageDemandVelocity } from './services/productService.js';

const TEST_PORT = 5098;
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

async function runCommerceTests() {
  console.log('\n========================================');
  console.log('  StockPulse Commerce Engine Test Suite');
  console.log('========================================\n');

  try {
    await connectDB();
    await seedDatabase({ clean: true });

    // Start ephemeral server
    server = http.createServer(app);
    await new Promise((resolve) => server.listen(TEST_PORT, resolve));
    console.log(`[Commerce Test Server] Listening on ${BASE_URL}\n`);

    const strategy = new RuleBasedCommerceStrategy();

    // ------------------------------------------------------------------
    // [1] UNIT TESTS: Rule-Based Pricing Strategy Boundaries
    // ------------------------------------------------------------------
    console.log('[1] Testing Rule-Based Pricing Strategy Boundaries:');

    // Case 1A: Stock just below threshold (14 < 15) -> 10% Increase
    const resLowStock = await strategy.suggestPricing(
      { currentPrice: 100, stockLevel: 14, reorderThreshold: 15, demandVelocity: 2 },
      { categoryAverageDemandVelocity: 5, triggerReason: TRIGGER_REASONS.INVENTORY_LOW }
    );
    assert(resLowStock.direction === CHANGE_DIRECTION.INCREASE, 'Stock below threshold triggers INCREASE');
    assert(resLowStock.recommendedPrice === 110, 'Stock below threshold calculates 10% increase ($100 -> $110)');
    assert(resLowStock.confidence === 0.85, 'Low stock confidence is 0.85');

    // Case 1B: Stock exactly at threshold (15 == 15) -> NOT low stock
    const resAtThreshold = await strategy.suggestPricing(
      { currentPrice: 100, stockLevel: 15, reorderThreshold: 15, demandVelocity: 2 },
      { categoryAverageDemandVelocity: 5, triggerReason: TRIGGER_REASONS.MANUAL }
    );
    assert(resAtThreshold.direction === CHANGE_DIRECTION.HOLD, 'Stock exactly at threshold does NOT trigger low stock increase');
    assert(resAtThreshold.recommendedPrice === 100, 'Price remains at $100 for normal stock');

    // Case 1C: Demand velocity exactly 2x category avg (10 == 2 * 5) -> Does NOT trigger spike (must be > 2x)
    const resExact2x = await strategy.suggestPricing(
      { currentPrice: 100, stockLevel: 50, reorderThreshold: 20, demandVelocity: 10 },
      { categoryAverageDemandVelocity: 5, triggerReason: TRIGGER_REASONS.MANUAL }
    );
    assert(resExact2x.direction === CHANGE_DIRECTION.HOLD, 'Demand velocity exactly at 2x category average does NOT trigger spike increase (requires > 2x)');

    // Case 1D: Demand velocity strictly above 2x category avg (11 > 2 * 5) -> 5% Increase
    const resAbove2x = await strategy.suggestPricing(
      { currentPrice: 100, stockLevel: 50, reorderThreshold: 20, demandVelocity: 11 },
      { categoryAverageDemandVelocity: 5, triggerReason: TRIGGER_REASONS.DEMAND_SPIKE }
    );
    assert(resAbove2x.direction === CHANGE_DIRECTION.INCREASE, 'Demand velocity > 2x category average triggers INCREASE');
    assert(resAbove2x.recommendedPrice === 105, 'Demand spike calculates 5% increase ($100 -> $105)');
    assert(resAbove2x.confidence === 0.80, 'Demand spike confidence is 0.80');

    // Case 1E: Normal product -> HOLD
    const resHold = await strategy.suggestPricing(
      { currentPrice: 49.99, stockLevel: 25, reorderThreshold: 10, demandVelocity: 3 },
      { categoryAverageDemandVelocity: 4, triggerReason: TRIGGER_REASONS.MANUAL }
    );
    assert(resHold.direction === CHANGE_DIRECTION.HOLD, 'Normal product triggers HOLD');
    assert(resHold.recommendedPrice === 49.99, 'Recommended price equals current price');
    assert(resHold.confidence === 0.90, 'HOLD confidence is 0.90');

    // ------------------------------------------------------------------
    // [2] UNIT TESTS: Rule-Based Reorder Strategy Boundaries
    // ------------------------------------------------------------------
    console.log('\n[2] Testing Rule-Based Reorder Strategy Boundaries:');

    // Case 2A: Standard replenishment: threshold 15, stock 8 -> (15 * 3) - 8 = 37
    const reorderStandard = await strategy.suggestReorder(
      { stockLevel: 8, reorderThreshold: 15 },
      { triggerReason: TRIGGER_REASONS.INVENTORY_LOW }
    );
    assert(reorderStandard.recommendedQuantity === 37, 'Reorder quantity calculated correctly ((15 * 3) - 8 = 37)');
    assert(reorderStandard.suggestedLeadTimeDays === 7, 'Default suggested lead time is 7 days');
    assert(reorderStandard.confidence === 0.85, 'Reorder confidence is 0.85');

    // Case 2B: Overstocked item where (threshold * 3) - stock <= 0 -> Clamped to min 1
    const reorderOverstocked = await strategy.suggestReorder(
      { stockLevel: 100, reorderThreshold: 10 },
      { triggerReason: TRIGGER_REASONS.MANUAL }
    );
    assert(reorderOverstocked.recommendedQuantity === 1, 'Reorder calculation clamps negative/zero result to minimum 1 unit');

    // ------------------------------------------------------------------
    // [3] UNIT TESTS: Strategy Registry & Runtime Strategy Switching
    // ------------------------------------------------------------------
    console.log('\n[3] Testing Strategy Registry & Runtime Switching:');

    const defaultStrategy = strategyRegistry.get();
    assert(defaultStrategy instanceof CommerceAdvisor, 'Registry resolves default strategy instance');

    const ruleAlias = strategyRegistry.get('rule-based');
    assert(ruleAlias instanceof RuleBasedCommerceStrategy, 'Registry resolves alias "rule-based"');

    // Register a mock strategy
    class MockCustomStrategy extends CommerceAdvisor {
      async suggestPricing() { return { currentPrice: 50, recommendedPrice: 55, direction: 'INCREASE', confidence: 1.0, reasoning: 'Mock', triggerReason: 'MANUAL' }; }
      async suggestReorder() { return { currentStock: 10, recommendedQuantity: 20, suggestedLeadTimeDays: 3, confidence: 1.0, reasoning: 'Mock', triggerReason: 'MANUAL' }; }
    }
    strategyRegistry.register('mock-test', new MockCustomStrategy());
    const mockResolved = strategyRegistry.get('mock-test');
    assert(mockResolved instanceof MockCustomStrategy, 'Custom strategy registered and resolved successfully');

    let threwForInvalid = false;
    try {
      strategyRegistry.get('non-existent-strategy-xyz');
    } catch (e) {
      threwForInvalid = true;
    }
    assert(threwForInvalid, 'Registry throws error for unregistered strategy');

    // ------------------------------------------------------------------
    // [4] INTEGRATION: Category Demand Velocity Aggregation
    // ------------------------------------------------------------------
    console.log('\n[4] Testing Category Demand Velocity Aggregation:');
    const elecAvg = await getCategoryAverageDemandVelocity('ELECTRONICS');
    // Electronics seeded: PRD-001 (3), PRD-002 (1), PRD-007 (8) -> avg = (3 + 1 + 8) / 3 = 4.0
    assert(Math.abs(elecAvg - 4.0) < 0.01, `Electronics category average velocity is ${elecAvg.toFixed(2)} (expected 4.00)`);

    const appAvg = await getCategoryAverageDemandVelocity('APPAREL');
    // Apparel seeded: PRD-003 (12), PRD-004 (2), PRD-008 (15) -> avg = (12 + 2 + 15) / 3 = 9.67
    assert(appAvg > 9.0 && appAvg < 10.0, `Apparel category average velocity is ${appAvg.toFixed(2)} (expected ~9.67)`);

    // ------------------------------------------------------------------
    // [5] INTEGRATION: Suggestion REST Endpoints & Persistence
    // ------------------------------------------------------------------
    console.log('\n[5] Testing Suggestion REST Endpoints & Immutability:');

    // 5A: On-demand pricing suggestion on low stock item (PRD-003: $24.99, stock 8, threshold 15)
    const pricingRes = await request('/products/PRD-003/suggest-pricing', {
      method: 'POST',
      body: JSON.stringify({ triggerReason: TRIGGER_REASONS.MANUAL }),
    });
    assert(pricingRes.status === 201, 'POST /api/products/PRD-003/suggest-pricing returns 201 Created');
    assert(pricingRes.body.data.recommendedPrice === 27.49, 'Recommended price is $27.49 (+10% on $24.99)');
    assert(pricingRes.body.data.direction === CHANGE_DIRECTION.INCREASE, 'Direction is INCREASE');
    assert(pricingRes.body.data.status === SUGGESTION_STATUS.PENDING, 'Suggestion status is PENDING');

    // Verify Product is unchanged in DB
    const prd003InDb = await Product.findOne({ productId: 'PRD-003' });
    assert(prd003InDb.currentPrice === 24.99, 'Product currentPrice remains unchanged at $24.99');
    assert(prd003InDb.stockLevel === 8, 'Product stockLevel remains unchanged at 8');

    // 5B: On-demand reorder suggestion on low stock item (PRD-003)
    const reorderRes = await request('/products/PRD-003/suggest-reorder', {
      method: 'POST',
      body: JSON.stringify({ triggerReason: TRIGGER_REASONS.MANUAL }),
    });
    assert(reorderRes.status === 201, 'POST /api/products/PRD-003/suggest-reorder returns 201 Created');
    assert(reorderRes.body.data.recommendedQuantity === 37, 'Recommended reorder quantity is 37');
    assert(reorderRes.body.data.status === SUGGESTION_STATUS.PENDING, 'Reorder suggestion status is PENDING');

    // 5C: On-demand pricing suggestion on normal item (PRD-001) -> HOLD
    const holdRes = await request('/products/PRD-001/suggest-pricing', {
      method: 'POST',
    });
    assert(holdRes.status === 201, 'POST /api/products/PRD-001/suggest-pricing returns 201 Created');
    assert(holdRes.body.data.direction === CHANGE_DIRECTION.HOLD, 'PRD-001 triggers HOLD recommendation');
    assert(holdRes.body.data.recommendedPrice === 79.99, 'PRD-001 recommendedPrice matches current price ($79.99)');

    // 5D: Verify suggestion persisted in MongoDB
    const persistedSuggestions = await PricingSuggestion.find({ product: prd003InDb._id });
    assert(persistedSuggestions.length >= 1, 'PricingSuggestion successfully persisted in MongoDB');

    // 5E: Error handling on nonexistent product
    const nonExistent = await request('/products/PRD-DOES-NOT-EXIST/suggest-pricing', {
      method: 'POST',
    });
    assert(nonExistent.status === 404, 'POST suggestion on nonexistent product returns 404 Not Found');

    // ------------------------------------------------------------------
    // [6] CLEANUP & SEED RESTORATION
    // ------------------------------------------------------------------
    console.log('\n[6] Cleaning Up Test Artifacts:');
    await PricingSuggestion.deleteMany({});
    await ReorderSuggestion.deleteMany({});
    await seedDatabase({ clean: true });
    assert(true, 'Clean seed state restored');

  } catch (err) {
    console.error(`\n\x1b[31mFATAL COMMERCE TEST ERROR:\x1b[0m ${err.message}`, err);
    failed++;
  } finally {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
    await disconnectDB();
    console.log('\n========================================');
    console.log(`  Commerce Tests Completed: \x1b[32m${passed} Passed\x1b[0m, \x1b[31m${failed} Failed\x1b[0m`);
    console.log('========================================\n');
    if (failed > 0) {
      process.exit(1);
    }
  }
}

runCommerceTests();
