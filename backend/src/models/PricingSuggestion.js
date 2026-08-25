import mongoose from 'mongoose';

export const CHANGE_DIRECTION = Object.freeze({
  INCREASE: 'INCREASE',
  DECREASE: 'DECREASE',
  HOLD: 'HOLD',
});

export const SUGGESTION_STATUS = Object.freeze({
  PENDING: 'PENDING',
  ACCEPTED: 'ACCEPTED',
  REJECTED: 'REJECTED',
});

export const TRIGGER_REASONS = Object.freeze({
  INITIAL: 'INITIAL',
  INVENTORY_LOW: 'INVENTORY_LOW',
  DEMAND_SPIKE: 'DEMAND_SPIKE',
  MANUAL: 'MANUAL',
});

const pricingSuggestionSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: [true, 'Product reference is required'],
      index: true,
    },
    currentPrice: {
      type: Number,
      required: [true, 'Current price at recommendation time is required'],
      min: [0, 'Current price cannot be negative'],
    },
    recommendedPrice: {
      type: Number,
      required: [true, 'Recommended price is required'],
      min: [0, 'Recommended price cannot be negative'],
    },
    direction: {
      type: String,
      required: [true, 'Change direction is required'],
      enum: {
        values: Object.values(CHANGE_DIRECTION),
        message: 'Direction `{VALUE}` is not supported. Must be one of: ' + Object.values(CHANGE_DIRECTION).join(', '),
      },
      index: true,
    },
    confidence: {
      type: Number,
      required: [true, 'Confidence score is required'],
      min: [0, 'Confidence score cannot be less than 0.0'],
      max: [1, 'Confidence score cannot exceed 1.0'],
    },
    reasoning: {
      type: String,
      required: [true, 'Reasoning text is required'],
      trim: true,
    },
    status: {
      type: String,
      required: [true, 'Suggestion status is required'],
      enum: {
        values: Object.values(SUGGESTION_STATUS),
        message: 'Status `{VALUE}` is not supported. Must be one of: ' + Object.values(SUGGESTION_STATUS).join(', '),
      },
      default: SUGGESTION_STATUS.PENDING,
      index: true,
    },
    triggerReason: {
      type: String,
      required: [true, 'Trigger reason is required'],
      enum: {
        values: Object.values(TRIGGER_REASONS),
        message: 'Trigger reason `{VALUE}` is not supported. Must be one of: ' + Object.values(TRIGGER_REASONS).join(', '),
      },
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

export const PricingSuggestion = mongoose.model('PricingSuggestion', pricingSuggestionSchema);
export default PricingSuggestion;
