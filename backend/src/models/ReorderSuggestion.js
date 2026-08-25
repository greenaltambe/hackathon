import mongoose from 'mongoose';
import { SUGGESTION_STATUS, TRIGGER_REASONS } from './PricingSuggestion.js';

const reorderSuggestionSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: [true, 'Product reference is required'],
      index: true,
    },
    currentStock: {
      type: Number,
      required: [true, 'Current stock at recommendation time is required'],
      min: [0, 'Current stock cannot be negative'],
      validate: {
        validator: Number.isInteger,
        message: 'Current stock `{VALUE}` must be an integer',
      },
    },
    recommendedQuantity: {
      type: Number,
      required: [true, 'Recommended quantity is required'],
      min: [1, 'Recommended quantity must be at least 1 (positive integer)'],
      validate: {
        validator: Number.isInteger,
        message: 'Recommended quantity `{VALUE}` must be an integer',
      },
    },
    suggestedLeadTimeDays: {
      type: Number,
      default: 7,
      min: [0, 'Suggested lead time cannot be negative'],
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

export const ReorderSuggestion = mongoose.model('ReorderSuggestion', reorderSuggestionSchema);
export default ReorderSuggestion;
