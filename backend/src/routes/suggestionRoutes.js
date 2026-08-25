import express from 'express';
import * as suggestionController from '../controllers/suggestionController.js';

const pricingRouter = express.Router();
pricingRouter.route('/').get(suggestionController.getPricingSuggestions);
pricingRouter.route('/:id/accept').patch(suggestionController.acceptPricing);
pricingRouter.route('/:id/reject').patch(suggestionController.rejectPricing);

const reorderRouter = express.Router();
reorderRouter.route('/').get(suggestionController.getReorderSuggestions);
reorderRouter.route('/:id/accept').patch(suggestionController.acceptReorder);
reorderRouter.route('/:id/reject').patch(suggestionController.rejectReorder);

export { pricingRouter, reorderRouter };
export default { pricingRouter, reorderRouter };
