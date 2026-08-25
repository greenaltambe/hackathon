import mongoose from 'mongoose';
import { connectDB, disconnectDB } from './config/db.js';
import {
  Product,
  PricingSuggestion,
  ReorderSuggestion,
  CATEGORIES,
  PRODUCT_STATUS,
  CHANGE_DIRECTION,
  SUGGESTION_STATUS,
  TRIGGER_REASONS,
} from './models/index.js';
import { seedDatabase } from './seed.js';

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

async function assertThrowsAsync(fn, expectedSubstr, testName) {
  try {
    await fn();
    console.error(`  \x1b[31m✘ FAIL\x1b[0m: ${testName} (Expected error containing "${expectedSubstr}", but no error was thrown)`);
    failed++;
  } catch (err) {
    const msg = err.message || '';
    if (msg.toLowerCase().includes(expectedSubstr.toLowerCase())) {
      console.log(`  \x1b[32m✔ PASS\x1b[0m: ${testName} (Caught expected validation error)`);
      passed++;
    } else {
      console.error(`  \x1b[31m✘ FAIL\x1b[0m: ${testName} (Error "${msg}" did not match "${expectedSubstr}")`);
      failed++;
    }
  }
}

async function runTests() {
  console.log('\n========================================');
  console.log('  StockPulse Domain Model Test Suite');
  console.log('========================================\n');

  try {
    await connectDB();

    // 1. Seed and query check
    console.log('\n[1] Testing Seed Data & Product Queries:');
    await seedDatabase({ clean: true });
    
    const allProducts = await Product.find({});
    assert(allProducts.length === 8, 'Seeded 8 core products in database');

    const prd003 = await Product.findOne({ productId: 'PRD-003' });
    assert(prd003 !== null, 'Found PRD-003 (T-Shirt)');
    assert(prd003.stockLevel === 8 && prd003.reorderThreshold === 15, 'PRD-003 is below reorder threshold (stock: 8, threshold: 15)');
    assert(prd003.status === PRODUCT_STATUS.PRICE_REVIEW_PENDING, 'PRD-003 status is PRICE_REVIEW_PENDING');
    assert(prd003.isLowStock() === true, 'PRD-003 isLowStock() returns true');

    const prd008 = await Product.findOne({ productId: 'PRD-008' });
    assert(prd008 !== null, 'Found PRD-008 (Hoodie)');
    assert(prd008.demandVelocity === 15, 'PRD-008 has high demand velocity for spike scenario (velocity: 15)');

    // 2. Product Validation Constraints
    console.log('\n[2] Testing Product Validation Rules:');

    await assertThrowsAsync(
      async () => {
        await Product.create({
          sku: 'TEST-SKU-1',
          name: 'Invalid Category Item',
          category: 'FOOTWEAR', // Invalid enum
          currentPrice: 10,
          stockLevel: 5,
          reorderThreshold: 2,
        });
      },
      'is not supported',
      'Rejects invalid Category enum'
    );

    await assertThrowsAsync(
      async () => {
        await Product.create({
          sku: 'TEST-SKU-2',
          name: 'Negative Price Item',
          category: CATEGORIES.ELECTRONICS,
          currentPrice: -15.5, // Negative price
          stockLevel: 5,
          reorderThreshold: 2,
        });
      },
      'cannot be negative',
      'Rejects negative currentPrice'
    );

    await assertThrowsAsync(
      async () => {
        await Product.create({
          sku: 'TEST-SKU-3',
          name: 'Float Stock Item',
          category: CATEGORIES.HOME,
          currentPrice: 10,
          stockLevel: 4.5, // Non-integer stock
          reorderThreshold: 2,
        });
      },
      'must be an integer',
      'Rejects non-integer stockLevel'
    );

    await assertThrowsAsync(
      async () => {
        // Attempt duplicate SKU
        await Product.create({
          sku: 'SKU-ELEC-001', // Already exists in seed
          name: 'Duplicate SKU Item',
          category: CATEGORIES.ELECTRONICS,
          currentPrice: 20,
          stockLevel: 10,
          reorderThreshold: 5,
        });
      },
      'duplicate key',
      'Rejects duplicate SKU'
    );

    // 3. PricingSuggestion Model & Relationships
    console.log('\n[3] Testing PricingSuggestion Model & References:');

    const pricingSuggestion = await PricingSuggestion.create({
      product: prd003._id,
      currentPrice: prd003.currentPrice,
      recommendedPrice: 28.99,
      direction: CHANGE_DIRECTION.INCREASE,
      confidence: 0.88,
      reasoning: 'Stock is low (8 units) while demand velocity is high (12 units/24h). Increasing price preserves margin and slows stockout.',
      status: SUGGESTION_STATUS.PENDING,
      triggerReason: TRIGGER_REASONS.INVENTORY_LOW,
    });

    assert(pricingSuggestion._id !== null, 'PricingSuggestion created successfully');
    
    // Test populate
    const populatedPricing = await PricingSuggestion.findById(pricingSuggestion._id).populate('product');
    assert(populatedPricing.product.sku === 'SKU-APP-001', 'Populated product reference matches SKU-APP-001');

    await assertThrowsAsync(
      async () => {
        await PricingSuggestion.create({
          product: prd003._id,
          currentPrice: 20,
          recommendedPrice: 25,
          direction: 'SKYROCKET', // Invalid enum
          confidence: 0.8,
          reasoning: 'Testing invalid direction',
          triggerReason: TRIGGER_REASONS.MANUAL,
        });
      },
      'is not supported',
      'Rejects invalid Direction enum'
    );

    await assertThrowsAsync(
      async () => {
        await PricingSuggestion.create({
          product: prd003._id,
          currentPrice: 20,
          recommendedPrice: 25,
          direction: CHANGE_DIRECTION.INCREASE,
          confidence: 1.5, // > 1.0
          reasoning: 'Testing invalid confidence',
          triggerReason: TRIGGER_REASONS.MANUAL,
        });
      },
      'cannot exceed 1.0',
      'Rejects confidence score > 1.0'
    );

    await assertThrowsAsync(
      async () => {
        await PricingSuggestion.create({
          product: prd003._id,
          currentPrice: 20,
          recommendedPrice: 25,
          direction: CHANGE_DIRECTION.INCREASE,
          confidence: -0.1, // < 0
          reasoning: 'Testing invalid confidence',
          triggerReason: TRIGGER_REASONS.MANUAL,
        });
      },
      'cannot be less than 0.0',
      'Rejects confidence score < 0.0'
    );

    // 4. ReorderSuggestion Model & Validation
    console.log('\n[4] Testing ReorderSuggestion Model & Rules:');

    const reorderSuggestion = await ReorderSuggestion.create({
      product: prd003._id,
      currentStock: prd003.stockLevel,
      recommendedQuantity: 45,
      suggestedLeadTimeDays: 5,
      confidence: 0.92,
      reasoning: 'Stock level is 8, well below threshold of 15. Replenish 45 units to cover 3.75 days of velocity.',
      status: SUGGESTION_STATUS.PENDING,
      triggerReason: TRIGGER_REASONS.INVENTORY_LOW,
    });

    assert(reorderSuggestion._id !== null, 'ReorderSuggestion created successfully');
    
    const populatedReorder = await ReorderSuggestion.findById(reorderSuggestion._id).populate('product');
    assert(populatedReorder.product.name === 'Organic Cotton T-Shirt', 'Populated product reference returns name');

    await assertThrowsAsync(
      async () => {
        await ReorderSuggestion.create({
          product: prd003._id,
          currentStock: 8,
          recommendedQuantity: 0, // Must be positive (>= 1)
          confidence: 0.8,
          reasoning: 'Testing 0 quantity',
          triggerReason: TRIGGER_REASONS.INVENTORY_LOW,
        });
      },
      'at least 1',
      'Rejects recommendedQuantity of 0'
    );

    await assertThrowsAsync(
      async () => {
        await ReorderSuggestion.create({
          product: prd003._id,
          currentStock: 8,
          recommendedQuantity: 12.7, // Non-integer
          confidence: 0.8,
          reasoning: 'Testing decimal quantity',
          triggerReason: TRIGGER_REASONS.INVENTORY_LOW,
        });
      },
      'must be an integer',
      'Rejects non-integer recommendedQuantity'
    );

    // 5. Clean up test documents
    console.log('\n[5] Cleaning up test suggestions & ensuring clean seed state:');
    await PricingSuggestion.deleteMany({});
    await ReorderSuggestion.deleteMany({});
    await seedDatabase({ clean: true });
    assert(true, 'Test cleanup completed and seed data restored cleanly');

  } catch (err) {
    console.error(`\n\x1b[31mFATAL TEST ERROR:\x1b[0m ${err.message}`, err);
    failed++;
  } finally {
    await disconnectDB();
    console.log('\n========================================');
    console.log(`  Tests Completed: \x1b[32m${passed} Passed\x1b[0m, \x1b[31m${failed} Failed\x1b[0m`);
    console.log('========================================\n');
    if (failed > 0) {
      process.exit(1);
    }
  }
}

runTests();
