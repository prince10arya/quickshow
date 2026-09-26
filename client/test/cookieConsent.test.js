import assert from 'node:assert/strict';
import test from 'node:test';

// In-memory mock localStorage
class MockLocalStorage {
  constructor() {
    this.store = new Map();
  }
  getItem(key) {
    return this.store.get(key) || null;
  }
  setItem(key, value) {
    this.store.set(key, String(value));
  }
  removeItem(key) {
    this.store.delete(key);
  }
  clear() {
    this.store.clear();
  }
}

globalThis.localStorage = new MockLocalStorage();
globalThis.window = {
  dispatchEvent: () => true,
  addEventListener: () => {},
  removeEventListener: () => {},
};
globalThis.CustomEvent = class {
  constructor(name, opts) {
    this.name = name;
    this.detail = opts?.detail;
  }
};

const {
  COOKIE_CONSENT_KEY,
  getStoredCookiePreferences,
  saveCookiePreferences,
} = await import('../src/utils/cookieConsent.js');

test('Cookie Consent: returns null when uninitialized', () => {
  localStorage.clear();
  assert.equal(getStoredCookiePreferences(), null);
});

test('Cookie Consent: saves preferences with necessary always active', () => {
  localStorage.clear();
  const saved = saveCookiePreferences({
    necessary: false, // Attempting to turn off necessary must be overridden
    preferences: true,
    analytics: false,
  });

  assert.equal(saved.necessary, true);
  assert.equal(saved.preferences, true);
  assert.equal(saved.analytics, false);

  const stored = getStoredCookiePreferences();
  assert.equal(stored.necessary, true);
  assert.equal(stored.preferences, true);
  assert.equal(stored.analytics, false);
});

test('Cookie Consent: handles accept all and necessary only', () => {
  localStorage.clear();
  // Accept all
  saveCookiePreferences({ preferences: true, analytics: true });
  let prefs = getStoredCookiePreferences();
  assert.equal(prefs.preferences, true);
  assert.equal(prefs.analytics, true);

  // Necessary only
  saveCookiePreferences({ preferences: false, analytics: false });
  prefs = getStoredCookiePreferences();
  assert.equal(prefs.necessary, true);
  assert.equal(prefs.preferences, false);
  assert.equal(prefs.analytics, false);
});
