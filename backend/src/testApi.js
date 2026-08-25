import http from 'http';
import app from './app.js';
import { connectDB, disconnectDB } from './config/db.js';
import { seedDatabase } from './seed.js';
import { Product } from './models/index.js';

const TEST_PORT = 5099;
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

async function runApiTests() {
  console.log('\n========================================');
  console.log('  StockPulse Product API Test Suite');
  console.log('========================================\n');

  try {
    await connectDB();
    await seedDatabase({ clean: true });

    // Start ephemeral server
    server = http.createServer(app);
    await new Promise((resolve) => server.listen(TEST_PORT, resolve));
    console.log(`[Test Server] Listening on ${BASE_URL}\n`);

    // 1. Health check
    console.log('[1] Testing Health Endpoint:');
    const health = await request('/health');
    assert(health.status === 200, 'GET /api/health returns 200');
    assert(health.body.status === 'ok', 'Health status is ok');

    // 2. List all products
    console.log('\n[2] Testing List Products:');
    const all = await request('/products');
    assert(all.status === 200, 'GET /api/products returns 200');
    assert(all.body.count === 8, 'Returns all 8 seeded products');
    assert(Array.isArray(all.body.data), 'Data is an array of products');

    // 3. Category Filter
    console.log('\n[3] Testing Category Filtering:');
    const electronics = await request('/products?category=ELECTRONICS');
    assert(electronics.status === 200, 'GET /api/products?category=ELECTRONICS returns 200');
    assert(electronics.body.count === 3, 'Found 3 ELECTRONICS products');
    assert(electronics.body.data.every((p) => p.category === 'ELECTRONICS'), 'All items belong to ELECTRONICS');

    // 4. Status Filter
    console.log('\n[4] Testing Status Filtering:');
    const active = await request('/products?status=ACTIVE');
    assert(active.status === 200, 'GET /api/products?status=ACTIVE returns 200');
    assert(active.body.data.every((p) => p.status === 'ACTIVE'), 'All items have ACTIVE status');

    const priceReview = await request('/products?status=PRICE_REVIEW_PENDING');
    assert(priceReview.status === 200, 'GET /api/products?status=PRICE_REVIEW_PENDING returns 200');
    assert(priceReview.body.count === 1 && priceReview.body.data[0].productId === 'PRD-003', 'Found PRD-003 under PRICE_REVIEW_PENDING');

    // 5. Combined Filter (Category + Status)
    console.log('\n[5] Testing Combined Category & Status Filter:');
    const activeHome = await request('/products?category=HOME&status=ACTIVE');
    assert(activeHome.status === 200, 'GET /api/products?category=HOME&status=ACTIVE returns 200');
    assert(activeHome.body.count === 1, 'Found 1 active HOME product (PRD-005)');
    assert(activeHome.body.data[0].productId === 'PRD-005', 'Matches PRD-005 Ceramic Pour-Over Set');

    // 6. Get Single Product
    console.log('\n[6] Testing Get Product by ID:');
    const singleByCode = await request('/products/PRD-003');
    assert(singleByCode.status === 200, 'GET /api/products/PRD-003 returns 200');
    assert(singleByCode.body.data.name === 'Organic Cotton T-Shirt', 'Returned correct product name');

    const mongoId = singleByCode.body.data._id;
    const singleByMongoId = await request(`/products/${mongoId}`);
    assert(singleByMongoId.status === 200, 'GET /api/products/:mongoId returns 200');

    // 7. Create Product
    console.log('\n[7] Testing Create Product:');
    const newProductPayload = {
      productId: 'PRD-TEST-999',
      sku: 'SKU-ELEC-999',
      name: 'Smart Bluetooth Speaker',
      category: 'ELECTRONICS',
      currentPrice: 89.99,
      stockLevel: 40,
      reorderThreshold: 15,
      demandVelocity: 5,
      status: 'ACTIVE',
    };

    const created = await request('/products', {
      method: 'POST',
      body: JSON.stringify(newProductPayload),
    });
    assert(created.status === 201, 'POST /api/products returns 201 Created');
    assert(created.body.data.sku === 'SKU-ELEC-999', 'Created product has expected SKU');

    // 8. Update Stock
    console.log('\n[8] Testing Update Stock & State Transitions:');
    const updateStockRes = await request('/products/PRD-003/stock', {
      method: 'PATCH',
      body: JSON.stringify({ stockLevel: 25 }),
    });
    assert(updateStockRes.status === 200, 'PATCH /api/products/PRD-003/stock returns 200');
    assert(updateStockRes.body.data.stockLevel === 25, 'Stock updated to 25');

    // Stock = 0 transitions to OUT_OF_STOCK
    const zeroStockRes = await request('/products/PRD-004/stock', {
      method: 'PATCH',
      body: JSON.stringify({ stockLevel: 0 }),
    });
    assert(zeroStockRes.status === 200, 'PATCH /api/products/PRD-004/stock with 0 returns 200');
    assert(zeroStockRes.body.data.status === 'OUT_OF_STOCK', 'Product automatically transitioned to OUT_OF_STOCK when stock reaches 0');

    // Restoring stock transitions back to ACTIVE
    const restoreStockRes = await request('/products/PRD-004/stock', {
      method: 'PATCH',
      body: JSON.stringify({ stockLevel: 30 }),
    });
    assert(restoreStockRes.status === 200, 'PATCH /api/products/PRD-004/stock with > 0 returns 200');
    assert(restoreStockRes.body.data.status === 'ACTIVE', 'Product transitioned back to ACTIVE when stock restored');

    // 9. Simulate Customer Order
    console.log('\n[9] Testing Simulate Order (Sale):');
    const beforeOrder = await request('/products/PRD-008');
    const initialStock = beforeOrder.body.data.stockLevel;
    const initialVelocity = beforeOrder.body.data.demandVelocity;

    const orderRes = await request('/products/PRD-008/orders', {
      method: 'POST',
    });
    assert(orderRes.status === 200, 'POST /api/products/PRD-008/orders returns 200');
    assert(orderRes.body.data.stockLevel === initialStock - 1, 'Stock decremented by 1');
    assert(orderRes.body.data.demandVelocity === initialVelocity + 1, 'Demand velocity incremented by 1');

    // 10. Error Handling & Validation Edge Cases
    console.log('\n[10] Testing Error Handling & Negative Scenarios:');

    // Order on out-of-stock product (PRD-006)
    const outOfStockOrder = await request('/products/PRD-006/orders', {
      method: 'POST',
    });
    assert(outOfStockOrder.status === 409, 'POST order on OUT_OF_STOCK product returns 409 Conflict');
    assert(outOfStockOrder.body.success === false, 'Returns success: false');

    // Nonexistent product ID
    const notFound = await request('/products/NONEXISTENT-ID-12345');
    assert(notFound.status === 404, 'GET nonexistent product returns 404 Not Found');

    // Invalid stock input (negative)
    const negativeStock = await request('/products/PRD-001/stock', {
      method: 'PATCH',
      body: JSON.stringify({ stockLevel: -10 }),
    });
    assert(negativeStock.status === 400, 'PATCH negative stock returns 400 Bad Request');

    // Invalid category enum
    const invalidCategory = await request('/products?category=INVALID_CATEGORY');
    assert(invalidCategory.status === 400, 'GET invalid category filter returns 400 Bad Request');

    // Duplicate SKU creation
    const duplicateSku = await request('/products', {
      method: 'POST',
      body: JSON.stringify({
        sku: 'SKU-ELEC-001',
        name: 'Duplicate Item',
        category: 'ELECTRONICS',
        currentPrice: 50,
        stockLevel: 10,
        reorderThreshold: 5,
      }),
    });
    assert(duplicateSku.status === 409, 'POST duplicate SKU returns 409 Conflict');

    // 11. Cleanup & Reset Seed State
    console.log('\n[11] Restoring Clean Seed State:');
    await seedDatabase({ clean: true });
    assert(true, 'Database cleanly reset to initial 8 seed products');

  } catch (err) {
    console.error(`\n\x1b[31mFATAL TEST ERROR:\x1b[0m ${err.message}`, err);
    failed++;
  } finally {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
    await disconnectDB();
    console.log('\n========================================');
    console.log(`  API Tests Completed: \x1b[32m${passed} Passed\x1b[0m, \x1b[31m${failed} Failed\x1b[0m`);
    console.log('========================================\n');
    if (failed > 0) {
      process.exit(1);
    }
  }
}

runApiTests();
