import crypto from 'node:crypto';

/**
 * Standard Domain Event Contract
 * All system events emitted during state transitions must adhere to this structure.
 */
export class DomainEvent {
  /**
   * @param {string} name - Event name (e.g. 'ReservationHeld', 'BookingConfirmed')
   * @param {string} aggregateId - Primary ID of aggregate root (e.g. reservationId, bookingId)
   * @param {Record<string, any>} payload - Strongly typed event attributes
   * @param {string} [correlationId] - Distributed trace / request identifier
   */
  constructor(name, aggregateId, payload = {}, correlationId = null) {
    this.id = crypto.randomUUID();
    this.name = name;
    this.aggregateId = aggregateId;
    this.timestamp = new Date().toISOString();
    this.correlationId = correlationId || crypto.randomUUID();
    this.payload = payload;
  }
}

/**
 * Helper factory to create a domain event instance
 */
export const createDomainEvent = (name, aggregateId, payload = {}, correlationId = null) => {
  return new DomainEvent(name, aggregateId, payload, correlationId);
};
