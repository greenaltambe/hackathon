import express from 'express';
import * as suggestionController from '../controllers/suggestionController.js';

const pricingRouter = express.Router();
pricingRouter.route('/').get(suggestionController.getPricingSuggestions);

const reorderRouter = express.Router();
reorderRouter.route('/').get(suggestionController.getReorderSuggestions);

export { pricingRouter, reorderRouter };
export default { pricingRouter, reorderRouter };
