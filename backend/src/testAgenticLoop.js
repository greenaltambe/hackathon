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
  PRODUCT_STATUS,
} from './models/index.js';
import { signalDetector, SignalDetector } from './services/agentic/signalDetector.js';
import { agenticLoop, AgenticLoop } from './services/agentic/agenticLoop.js';
import { eventBus, DOMAIN_EVENTS } from './events/eventBus.js';
import { strategyRegistry } from './services/commerce/index.js';
import { geminiClient } from './services/ai/geminiClient.js';

const TEST_PORT = 5096;
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

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
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

async function runAgenticTests() {
  console.log('\n========================================');
  console.log('  StockPulse Agentic Loop Test Suite');
  console.log('========================================\n');

  try {
    await connectDB();
    await seedDatabase({ clean: true });

    // Start ephemeral server
    server = http.createServer(app);
    await new Promise((resolve) => server.listen(TEST_PORT, resolve));
    console.log(`[Agentic Test Server] Listening on ${BASE_URL}\n`);

    const detector = new SignalDetector();

    // ------------------------------------------------------------------
    // [1] UNIT: Signal Detector Boundary Tests
    // ------------------------------------------------------------------
    console.log('[1] Testing Signal Detector Boundary Conditions:');

    // Case 1A: stock < threshold -> INVENTORY_LOW
    const sigLow = detector.detectSignals({ stockLevel: 9, reorderThreshold: 10, demandVelocity: 2 }, 5);
    assert(sigLow.hasSignal === true, 'Signal detected when stock < threshold');
    assert(sigLow.primaryTrigger === TRIGGER_REASONS.INVENTORY_LOW, 'Primary trigger is INVENTORY_LOW');

    // Case 1B: stock == threshold -> NO low stock signal
    const sigAtThresh = detector.detectSignals({ stockLevel: 10, reorderThreshold: 10, demandVelocity: 2 }, 5);
    assert(sigAtThresh.hasSignal === false, 'No signal when stock == threshold');

    // Case 1C: stock > threshold -> NO low stock signal
    const sigAboveThresh = detector.detectSignals({ stockLevel: 11, reorderThreshold: 10, demandVelocity: 2 }, 5);
    assert(sigAboveThresh.hasSignal === false, 'No signal when stock > threshold');

    // Case 1D: velocity > 2 * categoryAvg (11 > 2 * 5) -> DEMAND_SPIKE
    const sigSpike = detector.detectSignals({ stockLevel: 50, reorderThreshold: 20, demandVelocity: 11 }, 5);
    assert(sigSpike.hasSignal === true, 'Signal detected when velocity > 2 * categoryAvg');
    assert(sigSpike.primaryTrigger === TRIGGER_REASONS.DEMAND_SPIKE, 'Primary trigger is DEMAND_SPIKE');

    // Case 1E: velocity == 2 * categoryAvg (10 == 2 * 5) -> NO spike signal
    const sigExact2x = detector.detectSignals({ stockLevel: 50, reorderThreshold: 20, demandVelocity: 10 }, 5);
    assert(sigExact2x.hasSignal === false, 'No signal when velocity == 2 * categoryAvg');

    // Case 1F: Dual trigger (both low stock and demand spike)
    const sigDual = detector.detectSignals({ stockLevel: 5, reorderThreshold: 10, demandVelocity: 15 }, 5);
    assert(sigDual.signals.length === 2, 'Detects both INVENTORY_LOW and DEMAND_SPIKE when both conditions are met');
    assert(sigDual.primaryTrigger === TRIGGER_REASONS.INVENTORY_LOW, 'INVENTORY_LOW has priority 1 over DEMAND_SPIKE');

    // ------------------------------------------------------------------
    // [2] INTEGRATION: Autonomous Event-Driven Recommendation Workflow
    // ------------------------------------------------------------------
    console.log('\n[2] Testing Autonomous Auto-Trigger on Stock Update:');

    // Clear prior suggestions
    await PricingSuggestion.deleteMany({});
    await ReorderSuggestion.deleteMany({});

    // PRD-005 (Ceramic Pour-Over Set: threshold is 10, initial stock 22)
    // Update stock to 7 (crosses below threshold 10)
    const updateRes = await request('/products/PRD-005/stock', {
      method: 'PATCH',
      body: JSON.stringify({ stockLevel: 7 }),
    });
    assert(updateRes.status === 200, 'PATCH /api/products/PRD-005/stock returns 200 immediately');

    // Allow asynchronous event loop to process
    await sleep(80);

    // Verify auto-generated PricingSuggestion in DB
    const prd005 = await Product.findOne({ productId: 'PRD-005' });
    const autoPricing = await PricingSuggestion.findOne({ product: prd005._id, triggerReason: TRIGGER_REASONS.INVENTORY_LOW });
    assert(autoPricing !== null, 'PricingSuggestion was automatically created by agentic loop');
    assert(autoPricing.direction === CHANGE_DIRECTION.INCREASE, 'Auto pricing suggestion recommends INCREASE (+10%)');
    assert(autoPricing.status === SUGGESTION_STATUS.PENDING, 'Auto pricing suggestion status is PENDING');

    // Verify auto-generated ReorderSuggestion in DB
    const autoReorder = await ReorderSuggestion.findOne({ product: prd005._id, triggerReason: TRIGGER_REASONS.INVENTORY_LOW });
    assert(autoReorder !== null, 'ReorderSuggestion was automatically created by agentic loop');
    assert(autoReorder.recommendedQuantity === (10 * 3) - 7, 'Auto reorder quantity is 23 ((10 * 3) - 7 = 23)');
    assert(autoReorder.status === SUGGESTION_STATUS.PENDING, 'Auto reorder suggestion status is PENDING');

    // Verify Product status changed to PRICE_REVIEW_PENDING
    assert(prd005.status === PRODUCT_STATUS.PRICE_REVIEW_PENDING, 'Product status automatically transitioned to PRICE_REVIEW_PENDING');

    // ------------------------------------------------------------------
    // [3] INTEGRATION: Idempotency & Deduplication
    // ------------------------------------------------------------------
    console.log('\n[3] Testing Idempotency & Duplicate Pending Prevention:');

    const initialPricingCount = await PricingSuggestion.countDocuments({ product: prd005._id, status: SUGGESTION_STATUS.PENDING });
    const initialReorderCount = await ReorderSuggestion.countDocuments({ product: prd005._id, status: SUGGESTION_STATUS.PENDING });
    assert(initialPricingCount === 1, 'Exactly 1 pending pricing suggestion exists');
    assert(initialReorderCount === 1, 'Exactly 1 pending reorder suggestion exists');

    // Simulate 3 customer orders in rapid succession on PRD-005 (stock drops 7 -> 6 -> 5 -> 4)
    await request('/products/PRD-005/orders', { method: 'POST' });
    await request('/products/PRD-005/orders', { method: 'POST' });
    await request('/products/PRD-005/orders', { method: 'POST' });

    // Allow event loop to process
    await sleep(100);

    const postOrdersPricingCount = await PricingSuggestion.countDocuments({ product: prd005._id, status: SUGGESTION_STATUS.PENDING });
    const postOrdersReorderCount = await ReorderSuggestion.countDocuments({ product: prd005._id, status: SUGGESTION_STATUS.PENDING });
    assert(postOrdersPricingCount === 1, 'Deduplication preserved: Still exactly 1 pending pricing suggestion (duplicates skipped)');
    assert(postOrdersReorderCount === 1, 'Deduplication preserved: Still exactly 1 pending reorder suggestion (duplicates skipped)');

    // Now resolve the existing suggestions (simulate merchandiser accepting or rejecting)
    await PricingSuggestion.updateMany({ product: prd005._id }, { $set: { status: SUGGESTION_STATUS.ACCEPTED } });
    await ReorderSuggestion.updateMany({ product: prd005._id }, { $set: { status: SUGGESTION_STATUS.REJECTED } });

    // Simulate another order on PRD-005
    await request('/products/PRD-005/orders', { method: 'POST' });
    await sleep(80);

    const newPendingPricing = await PricingSuggestion.find({ product: prd005._id, status: SUGGESTION_STATUS.PENDING });
    assert(newPendingPricing.length === 1, 'New suggestion generated after previous suggestion was resolved (no longer PENDING)');

    // ------------------------------------------------------------------
    // [4] INTEGRATION: AI Strategy Reuse in Event Loop
    // ------------------------------------------------------------------
    console.log('\n[4] Testing AI Strategy Reuse in Agentic Loop:');

    // Mock Gemini for event loop
    geminiClient.setMockCaller(async () => {
      return {
        recommendedPrice: 59.99,
        direction: 'INCREASE',
        confidence: 0.94,
        reasoning: 'Agentic AI recommendation for low inventory on PRD-008.',
      };
    });

    // Run agentic loop on PRD-008 (stock 11 < threshold 12) with AI strategy
    const aiProcessResult = await agenticLoop.processProductSignal('PRD-008', { strategyName: 'ai' });
    assert(aiProcessResult.processed === true, 'Agentic loop processed PRD-008 signal successfully');
    assert(aiProcessResult.results.pricingSuggestions.length > 0, 'Generated AI pricing suggestion via Agentic Loop');
    assert(aiProcessResult.results.pricingSuggestions[0].recommendedPrice === 59.99, 'AI recommended price is $59.99');

    // Restore mock
    geminiClient.clearMockCaller();

    // ------------------------------------------------------------------
    // [5] INTEGRATION: Suggestion Query & Review (Accept/Reject) Endpoints
    // ------------------------------------------------------------------
    console.log('\n[5] Testing Suggestion Query, Accept & Reject Workflows:');

    const pricingListRes = await request('/pricing-suggestions?status=PENDING');
    assert(pricingListRes.status === 200, 'GET /api/pricing-suggestions returns 200');
    assert(pricingListRes.body.count > 0, 'Returns list of pending pricing suggestions');

    const reorderListRes = await request('/reorder-suggestions?status=PENDING');
    assert(reorderListRes.status === 200, 'GET /api/reorder-suggestions returns 200');
    assert(reorderListRes.body.count > 0, 'Returns list of pending reorder suggestions');

    // Test Accepting Pricing Suggestion
    const targetPricing = pricingListRes.body.data[0];
    const acceptPricingRes = await request(`/pricing-suggestions/${targetPricing._id}/accept`, {
      method: 'PATCH',
    });
    assert(acceptPricingRes.status === 200, 'PATCH /api/pricing-suggestions/:id/accept returns 200');
    assert(acceptPricingRes.body.data.status === SUGGESTION_STATUS.ACCEPTED, 'Suggestion status updated to ACCEPTED');
    assert(acceptPricingRes.body.product.currentPrice === targetPricing.recommendedPrice, 'Live Product currentPrice updated to recommendedPrice');

    // Test Accepting Reorder Suggestion
    const targetReorder = reorderListRes.body.data[0];
    const priorProduct = await Product.findById(targetReorder.product._id || targetReorder.product);
    const priorStock = priorProduct.stockLevel;
    const acceptReorderRes = await request(`/reorder-suggestions/${targetReorder._id}/accept`, {
      method: 'PATCH',
    });
    assert(acceptReorderRes.status === 200, 'PATCH /api/reorder-suggestions/:id/accept returns 200');
    assert(acceptReorderRes.body.data.status === SUGGESTION_STATUS.ACCEPTED, 'Reorder suggestion status updated to ACCEPTED');
    assert(acceptReorderRes.body.product.stockLevel === priorStock + targetReorder.recommendedQuantity, 'Product stockLevel replenished with recommendedQuantity');

    // ------------------------------------------------------------------
    // [6] CLEANUP & RESET
    // ------------------------------------------------------------------
    console.log('\n[6] Cleaning Up Test Artifacts:');
    await PricingSuggestion.deleteMany({});
    await ReorderSuggestion.deleteMany({});
    await seedDatabase({ clean: true });
    assert(true, 'Clean seed state restored');

  } catch (err) {
    console.error(`\n\x1b[31mFATAL AGENTIC TEST ERROR:\x1b[0m ${err.message}`, err);
    failed++;
  } finally {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
    await disconnectDB();
    console.log('\n========================================');
    console.log(`  Agentic Tests Completed: \x1b[32m${passed} Passed\x1b[0m, \x1b[31m${failed} Failed\x1b[0m`);
    console.log('========================================\n');
    if (failed > 0) {
      process.exit(1);
    }
  }
}

runAgenticTests();
