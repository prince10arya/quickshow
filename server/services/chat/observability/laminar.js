import { Laminar, observe as lmnrObserve } from '@lmnr-ai/lmnr';

let isInitialized = false;

/**
 * Initialize Laminar LLM Observability.
 * Fails safely if LMNR_PROJECT_API_KEY is not set.
 */
export const initLaminar = () => {
  const projectApiKey = process.env.LMNR_PROJECT_API_KEY;
  if (!projectApiKey) {
    console.log('[Laminar] LMNR_PROJECT_API_KEY not set. Tracing disabled.');
    return;
  }

  try {
    Laminar.initialize({ projectApiKey });
    isInitialized = true;
    console.log('[Laminar] 🚀 Initialized Laminar LLM Observability');
  } catch (err) {
    console.warn('[Laminar] Initialization warning:', err.message);
  }
};

/**
 * Safe observe wrapper.
 * Executes target function directly if Laminar is not initialized.
 */
export const observe = (options, fn, ...args) => {
  if (!isInitialized) {
    return fn(...args);
  }
  return lmnrObserve(options, fn, ...args);
};

export { Laminar };
export default {
  initLaminar,
  observe,
  Laminar,
};
