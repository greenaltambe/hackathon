import mongoose from 'mongoose';

export const CATEGORIES = Object.freeze({
  ELECTRONICS: 'ELECTRONICS',
  APPAREL: 'APPAREL',
  HOME: 'HOME',
});

export const PRODUCT_STATUS = Object.freeze({
  ACTIVE: 'ACTIVE',
  PRICE_REVIEW_PENDING: 'PRICE_REVIEW_PENDING',
  OUT_OF_STOCK: 'OUT_OF_STOCK',
});

const productSchema = new mongoose.Schema(
  {
    productId: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
      index: true,
    },
    sku: {
      type: String,
      required: [true, 'SKU is required'],
      unique: true,
      trim: true,
      uppercase: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Product name is required'],
      trim: true,
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
      enum: {
        values: Object.values(CATEGORIES),
        message: 'Category `{VALUE}` is not supported. Must be one of: ' + Object.values(CATEGORIES).join(', '),
      },
      index: true,
    },
    currentPrice: {
      type: Number,
      required: [true, 'Current price is required'],
      min: [0, 'Current price cannot be negative'],
    },
    stockLevel: {
      type: Number,
      required: [true, 'Stock level is required'],
      min: [0, 'Stock level cannot be negative'],
      validate: {
        validator: Number.isInteger,
        message: 'Stock level `{VALUE}` must be an integer',
      },
    },
    reorderThreshold: {
      type: Number,
      required: [true, 'Reorder threshold is required'],
      min: [0, 'Reorder threshold cannot be negative'],
      validate: {
        validator: Number.isInteger,
        message: 'Reorder threshold `{VALUE}` must be an integer',
      },
    },
    demandVelocity: {
      type: Number,
      default: 0,
      min: [0, 'Demand velocity cannot be negative'],
    },
    status: {
      type: String,
      required: [true, 'Product status is required'],
      enum: {
        values: Object.values(PRODUCT_STATUS),
        message: 'Status `{VALUE}` is not supported. Must be one of: ' + Object.values(PRODUCT_STATUS).join(', '),
      },
      default: PRODUCT_STATUS.ACTIVE,
      index: true,
    },

    // Extension Points for Sprint 2/3 (e.g. competitor pricing, margin floors, supplier catalog)
    costPrice: {
      type: Number,
      default: null,
      min: [0, 'Cost price cannot be negative'],
    },
    marginFloor: {
      type: Number,
      default: null,
      min: [0, 'Margin floor cannot be negative'],
    },
    supplierId: {
      type: String,
      default: null,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

// Helpful virtual or instance methods for domain logic
productSchema.methods.isLowStock = function () {
  return this.stockLevel < this.reorderThreshold;
};

export const Product = mongoose.model('Product', productSchema);
export default Product;
