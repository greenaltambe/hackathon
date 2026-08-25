import { connectDB, disconnectDB } from './config/db.js';
import { Product } from './models/index.js';
import { seedProducts } from './data/seedProducts.js';

/**
 * Seeds the database with the core 8 StockPulse products.
 * Uses idempotent upsert by SKU so it can be safely re-run during development
 * without creating duplicates or violating unique constraints.
 *
 * @param {Object} options
 * @param {boolean} [options.clean=false] If true, clears existing products before seeding
 * @returns {Promise<Array>} Seeded product documents
 */
export async function seedDatabase({ clean = false } = {}) {
  try {
    if (clean) {
      console.log('[Seed] Clearing existing products collection...');
      await Product.deleteMany({});
    }

    console.log(`[Seed] Seeding ${seedProducts.length} core products...`);
    const results = [];

    for (const item of seedProducts) {
      const product = await Product.findOneAndUpdate(
        { sku: item.sku },
        { $set: item },
        { upsert: true, returnDocument: 'after', runValidators: true, setDefaultsOnInsert: true }
      );
      results.push(product);
    }

    console.log('[Seed] Database seeded successfully:');
    console.table(
      results.map((p) => ({
        ID: p.productId,
        SKU: p.sku,
        Name: p.name,
        Category: p.category,
        Price: `$${p.currentPrice.toFixed(2)}`,
        Stock: p.stockLevel,
        Threshold: p.reorderThreshold,
        Velocity: p.demandVelocity,
        Status: p.status,
      }))
    );

    return results;
  } catch (error) {
    console.error(`[Seed] Seeding failed: ${error.message}`);
    throw error;
  }
}

// If invoked directly from CLI
if (process.argv[1] && process.argv[1].endsWith('seed.js')) {
  (async () => {
    try {
      await connectDB();
      const shouldClean = process.argv.includes('--clean');
      await seedDatabase({ clean: shouldClean });
      await disconnectDB();
      process.exit(0);
    } catch (err) {
      console.error('[Seed CLI] Fatal error:', err);
      process.exit(1);
    }
  })();
}

export default seedDatabase;
