import { CommerceAdvisor, strategyRegistry } from './commerceAdvisor.js';
import { RuleBasedCommerceStrategy } from './ruleBasedStrategy.js';
import { AICommerceStrategy } from './aiCommerceStrategy.js';

// Instantiate and register strategies in central registry
const ruleStrategy = new RuleBasedCommerceStrategy();
const aiStrategy = new AICommerceStrategy();

strategyRegistry.register(['rule', 'rule-based', 'rules', 'default'], ruleStrategy);
strategyRegistry.register(['ai', 'gemini', 'llm', 'ai-advisor'], aiStrategy);

export {
  CommerceAdvisor,
  RuleBasedCommerceStrategy,
  AICommerceStrategy,
  strategyRegistry,
};

export default strategyRegistry;
