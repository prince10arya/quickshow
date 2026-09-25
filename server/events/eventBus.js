/**
 * EventBus Interface & In-Memory Implementation
 * Provides decoupled asynchronous pub/sub for domain events.
 */
export class InMemoryEventBus {
  constructor() {
    /** @type {Map<string, Set<Function>>} */
    this.handlers = new Map();
  }

  /**
   * Subscribe an asynchronous handler to a domain event.
   * @param {string} eventName
   * @param {(event: import('./domainEvent.js').DomainEvent) => Promise<void> | void} handler
   */
  subscribe(eventName, handler) {
    if (!this.handlers.has(eventName)) {
      this.handlers.set(eventName, new Set());
    }
    this.handlers.get(eventName).add(handler);
    return () => this.unsubscribe(eventName, handler);
  }

  /**
   * Unsubscribe a handler from a domain event.
   * @param {string} eventName
   * @param {Function} handler
   */
  unsubscribe(eventName, handler) {
    const set = this.handlers.get(eventName);
    if (set) {
      set.delete(handler);
      if (set.size === 0) {
        this.handlers.delete(eventName);
      }
    }
  }

  /**
   * Publish a domain event to all registered subscribers asynchronously.
   * Subscriber execution is isolated: errors in subscribers do not crash or block the caller.
   * @param {import('./domainEvent.js').DomainEvent} event
   * @returns {Promise<void>}
   */
  async publish(event) {
    if (!event || !event.name) {
      console.warn('[EventBus] Attempted to publish an invalid event:', event);
      return;
    }

    const set = this.handlers.get(event.name);
    if (!set || set.size === 0) {
      return;
    }

    // Execute subscribers asynchronously without waiting or failing the caller
    const tasks = Array.from(set).map(async (handler) => {
      try {
        await handler(event);
      } catch (err) {
        console.error(
          `[EventBus] Error executing subscriber for "${event.name}" (Aggregate: ${event.aggregateId}):`,
          err.message
        );
      }
    });

    // We do not await in critical path if fire-and-forget is desired, but Promise.allSettled lets callers await if testing
    await Promise.allSettled(tasks);
  }

  /**
   * Reset all handlers (primarily used between tests)
   */
  clear() {
    this.handlers.clear();
  }
}

// Global Singleton Instance
export const globalEventBus = new InMemoryEventBus();
export default globalEventBus;
