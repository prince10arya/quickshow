import crypto from 'node:crypto';

/**
 * In-memory Idempotency Record Store
 * In a distributed setup, this can be backed by Redis or an idempotency_keys database table.
 */
class IdempotencyService {
  constructor() {
    /** @type {Map<string, { status: 'PROCESSING' | 'COMPLETED' | 'FAILED', requestHash: string, responseStatus?: number, responseBody?: any, expiresAt: number }>} */
    this.records = new Map();
  }

  /**
   * Computes a SHA-256 hash of the request content (method, path, body).
   */
  hashRequest(method, path, body = {}) {
    const raw = `${method.toUpperCase()}:${path}:${JSON.stringify(body || {})}`;
    return crypto.createHash('sha256').update(raw).digest('hex');
  }

  /**
   * Attempts to acquire an idempotency lock for a key.
   * @param {string} key
   * @param {string} requestHash
   * @param {number} [ttlMs=86400000] Default 24 hours
   * @returns {{ status: 'NEW' | 'CACHED' | 'IN_PROGRESS' | 'HASH_MISMATCH', record?: any }}
   */
  acquire(key, requestHash, ttlMs = 86400000) {
    const now = Date.now();
    const existing = this.records.get(key);

    if (existing) {
      // Check if expired
      if (existing.expiresAt < now) {
        this.records.delete(key);
      } else {
        // Validate request payload hash matches
        if (existing.requestHash !== requestHash) {
          return { status: 'HASH_MISMATCH' };
        }
        if (existing.status === 'PROCESSING') {
          return { status: 'IN_PROGRESS' };
        }
        if (existing.status === 'COMPLETED') {
          return { status: 'CACHED', record: existing };
        }
      }
    }

    // Set new processing lock
    this.records.set(key, {
      status: 'PROCESSING',
      requestHash,
      createdAt: now,
      expiresAt: now + ttlMs,
    });

    return { status: 'NEW' };
  }

  /**
   * Finalizes the record upon successful request completion.
   */
  complete(key, responseStatus, responseBody) {
    const record = this.records.get(key);
    if (record) {
      record.status = 'COMPLETED';
      record.responseStatus = responseStatus;
      record.responseBody = responseBody;
    }
  }

  /**
   * Removes or flags key on execution failure so retries can re-attempt.
   */
  abort(key) {
    this.records.delete(key);
  }

  /**
   * Clear all records (useful for test isolation).
   */
  clear() {
    this.records.clear();
  }
}

export const idempotencyService = new IdempotencyService();
export default idempotencyService;