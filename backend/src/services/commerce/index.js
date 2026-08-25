import { CommerceAdvisor, strategyRegistry } from './commerceAdvisor.js';
import { RuleBasedCommerceStrategy } from './ruleBasedStrategy.js';

// Instantiate and register default strategies
const ruleStrategy = new RuleBasedCommerceStrategy();
strategyRegistry.register(['rule', 'rule-based', 'rules', 'default'], ruleStrategy);

export {
  CommerceAdvisor,
  RuleBasedCommerceStrategy,
  strategyRegistry,
};

export default strategyRegistry;
