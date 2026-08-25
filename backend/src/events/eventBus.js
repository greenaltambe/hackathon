import { EventEmitter } from 'events';
import { randomUUID } from 'crypto';

export const DOMAIN_EVENTS = Object.freeze({
  ORDER_SIMULATED: 'ORDER_SIMULATED',
  INVENTORY_CHANGED: 'INVENTORY_CHANGED',
});

/**
 * Lightweight, in-process EventBus for StockPulse.
 * Dispatches domain events asynchronously using setImmediate so that
 * HTTP request lifecycles are never blocked by downstream recommendation workflows.
 */
export class EventBus extends EventEmitter {
  constructor() {
    super();
    // Allow ample listeners without EventEmitter warning
    this.setMaxListeners(50);
  }

  /**
   * Publish a domain event asynchronously.
   *
   * @param {string} eventType - From DOMAIN_EVENTS
   * @param {Object} payload - Event data
   * @returns {Object} Enriched domain event
   */
  publish(eventType, payload = {}) {
    const event = {
      eventId: payload.eventId || randomUUID(),
      type: eventType,
      timestamp: new Date().toISOString(),
      ...payload,
    };

    // Asynchronous dispatch so publishers never wait on subscribers
    setImmediate(() => {
      try {
        this.emit(eventType, event);
        this.emit('*', event); // Wildcard listener for audit/monitoring
      } catch (err) {
        console.error(`[EventBus] Uncaught subscriber error for ${eventType}:`, err);
      }
    });

    return event;
  }

  /**
   * Subscribe a listener to a domain event.
   *
   * @param {string} eventType
   * @param {Function} handler - (event) => Promise<void>|void
   */
  subscribe(eventType, handler) {
    this.on(eventType, async (event) => {
      try {
        await handler(event);
      } catch (err) {
        console.error(`[EventBus] Error handling event ${eventType} (${event.eventId}):`, err);
      }
    });
  }
}

export const eventBus = new EventBus();
export default eventBus;
