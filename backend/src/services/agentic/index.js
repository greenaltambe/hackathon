import { eventBus, DOMAIN_EVENTS } from '../../events/eventBus.js';
import { agenticLoop, AgenticLoop } from './agenticLoop.js';
import { signalDetector, SignalDetector } from './signalDetector.js';

let isInitialized = false;

/**
 * Initializes and binds the Agentic Recommendation Loop to the EventBus.
 * Subscribes to ORDER_SIMULATED and INVENTORY_CHANGED domain events.
 */
export function initAgenticLoop() {
  if (isInitialized) {
    return;
  }

  eventBus.subscribe(DOMAIN_EVENTS.ORDER_SIMULATED, (event) => {
    agenticLoop.handleInventoryEvent(event);
  });

  eventBus.subscribe(DOMAIN_EVENTS.INVENTORY_CHANGED, (event) => {
    agenticLoop.handleInventoryEvent(event);
  });

  isInitialized = true;
  console.log('[Agentic Engine] Recommendation loop initialized and listening for inventory/order events.');
}

export {
  agenticLoop,
  AgenticLoop,
  signalDetector,
  SignalDetector,
  eventBus,
  DOMAIN_EVENTS,
};

export default {
  initAgenticLoop,
  agenticLoop,
  signalDetector,
};
