export const COOKIE_CONSENT_KEY = 'quickshow_cookie_consent';

/**
 * Retrieve user's stored cookie consent preferences from localStorage.
 * @returns {{ necessary: boolean, preferences: boolean, analytics: boolean, timestamp: string } | null}
 */
export const getStoredCookiePreferences = () => {
  try {
    if (typeof localStorage === 'undefined') return null;
    const stored = localStorage.getItem(COOKIE_CONSENT_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
};

/**
 * Save user's cookie consent preferences to localStorage.
 * Strictly necessary cookies are always enforced as true.
 * @param {{ preferences?: boolean, analytics?: boolean }} prefs
 * @returns {{ necessary: boolean, preferences: boolean, analytics: boolean, timestamp: string } | null}
 */
export const saveCookiePreferences = (prefs = {}) => {
  try {
    const payload = {
      necessary: true, // Always true for secure auth refresh tokens & session security
      preferences: Boolean(prefs.preferences),
      analytics: Boolean(prefs.analytics),
      timestamp: new Date().toISOString(),
    };
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify(payload));
    }
    if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
      window.dispatchEvent(new CustomEvent('cookie-preferences-updated', { detail: payload }));
    }
    return payload;
  } catch (err) {
    console.error('Failed to save cookie preferences', err);
    return null;
  }
};

/**
 * Dispatch an event to re-open the cookie management settings modal/toast.
 */
export const openCookieSettings = () => {
  if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
    window.dispatchEvent(new CustomEvent('open-cookie-settings'));
  }
};
