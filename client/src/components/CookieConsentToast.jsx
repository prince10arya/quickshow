import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Cookie, ShieldCheck, SlidersHorizontal, Check, X, Lock, Sparkles, ChevronDown, ChevronUp } from 'lucide-react';
import toast from 'react-hot-toast';
import {
  getStoredCookiePreferences,
  saveCookiePreferences,
  openCookieSettings,
  COOKIE_CONSENT_KEY,
} from '../utils/cookieConsent.js';

export { getStoredCookiePreferences, saveCookiePreferences, openCookieSettings, COOKIE_CONSENT_KEY };

export const CookieConsentToast = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [isCustomizing, setIsCustomizing] = useState(false);
  const [preferences, setPreferences] = useState({
    necessary: true,
    preferences: true,
    analytics: true,
  });

  useEffect(() => {
    // Check if user has already set cookie preferences
    const existing = getStoredCookiePreferences();
    if (!existing) {
      // Delay slightly for smooth entrance after initial page load
      const timer = setTimeout(() => setIsVisible(true), 1200);
      return () => clearTimeout(timer);
    } else {
      setPreferences({
        necessary: true,
        preferences: existing.preferences ?? true,
        analytics: existing.analytics ?? false,
      });
    }

    const handleOpen = () => {
      setIsVisible(true);
      setIsCustomizing(true);
    };

    window.addEventListener('open-cookie-settings', handleOpen);
    return () => window.removeEventListener('open-cookie-settings', handleOpen);
  }, []);

  const handleAcceptAll = () => {
    saveCookiePreferences({ preferences: true, analytics: true });
    setIsVisible(false);
    toast.success('All cookie preferences accepted', {
      icon: '🍪',
      style: {
        borderRadius: '12px',
        background: '#18181b',
        color: '#fff',
        border: '1px solid rgba(255, 255, 255, 0.1)',
      },
    });
  };

  const handleNecessaryOnly = () => {
    saveCookiePreferences({ preferences: false, analytics: false });
    setIsVisible(false);
    toast.success('Only essential cookies enabled', {
      icon: '🔒',
      style: {
        borderRadius: '12px',
        background: '#18181b',
        color: '#fff',
        border: '1px solid rgba(255, 255, 255, 0.1)',
      },
    });
  };

  const handleSaveCustom = () => {
    saveCookiePreferences(preferences);
    setIsVisible(false);
    setIsCustomizing(false);
    toast.success('Custom cookie preferences saved', {
      icon: '⚙️',
      style: {
        borderRadius: '12px',
        background: '#18181b',
        color: '#fff',
        border: '1px solid rgba(255, 255, 255, 0.1)',
      },
    });
  };

  if (!isVisible) return null;

  return (
    <AnimatePresence>
      <motion.div
        role="dialog"
        aria-label="Cookie Preferences Settings"
        initial={{ y: 60, opacity: 0, scale: 0.95 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: 60, opacity: 0, scale: 0.95 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="fixed bottom-4 left-4 right-4 sm:right-auto sm:bottom-6 sm:left-6 z-50 sm:max-w-md w-auto rounded-2xl border border-white/10 bg-zinc-950/95 p-4 sm:p-5 text-white shadow-2xl backdrop-blur-xl ring-1 ring-white/10"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary ring-1 ring-primary/30">
              <Cookie className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <h2 className="text-sm font-semibold tracking-tight text-white flex items-center gap-1.5">
                Cookie Preferences
                <span className="inline-flex items-center gap-0.5 rounded-full bg-primary/20 px-2 py-0.5 text-[10px] font-medium text-rose-300">
                  <ShieldCheck className="h-3 w-3" /> Privacy
                </span>
              </h2>
              <p className="text-xs text-zinc-400">
                Manage how we use cookies to personalize your booking experience.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsVisible(false)}
            aria-label="Dismiss cookie banner"
            className="rounded-lg p-1 text-zinc-400 transition-colors hover:bg-white/10 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Detailed Preferences Accordion / Form */}
        <AnimatePresence>
          {isCustomizing && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="mt-3 space-y-2.5 overflow-hidden border-t border-white/10 pt-3"
            >
              {/* 1. Necessary (Locked) */}
              <div className="flex items-start justify-between gap-3 rounded-xl bg-white/5 p-2.5">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-200">
                    <Lock className="h-3 w-3 text-emerald-400" />
                    Strictly Necessary
                    <span className="rounded-full bg-emerald-500/20 px-1.5 py-0.2 text-[9px] font-medium text-emerald-300">
                      Always Active
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-400 leading-relaxed">
                    Authentication refresh tokens (<span className="font-mono text-zinc-300">httpOnly</span>), CSRF security, and active booking cart integrity.
                  </p>
                </div>
                <div className="relative inline-flex h-5 w-9 shrink-0 cursor-not-allowed items-center rounded-full bg-emerald-500/80 p-0.5 opacity-90">
                  <span className="inline-block h-4 w-4 transform rounded-full bg-white transition translate-x-4 shadow" />
                </div>
              </div>

              {/* 2. Preferences & AI Memory */}
              <div className="flex items-start justify-between gap-3 rounded-xl bg-white/5 p-2.5">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-200">
                    <Sparkles className="h-3 w-3 text-amber-400" />
                    Experience & AI Concierge Memory
                  </div>
                  <p className="text-[11px] text-zinc-400 leading-relaxed">
                    Remembers your preferred cinema format (IMAX, 3D), favorite genres, and active concierge suggestions across visits.
                  </p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={preferences.preferences}
                  onClick={() =>
                    setPreferences((prev) => ({ ...prev, preferences: !prev.preferences }))
                  }
                  className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors p-0.5 ${
                    preferences.preferences ? 'bg-primary' : 'bg-zinc-700'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition shadow ${
                      preferences.preferences ? 'translate-x-4' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* 3. Performance & Analytics */}
              <div className="flex items-start justify-between gap-3 rounded-xl bg-white/5 p-2.5">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-200">
                    <SlidersHorizontal className="h-3 w-3 text-sky-400" />
                    Performance & Diagnostics
                  </div>
                  <p className="text-[11px] text-zinc-400 leading-relaxed">
                    Anonymous telemetry on show load times and seat selection responsiveness to keep QuickShow fast.
                  </p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={preferences.analytics}
                  onClick={() =>
                    setPreferences((prev) => ({ ...prev, analytics: !prev.analytics }))
                  }
                  className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors p-0.5 ${
                    preferences.analytics ? 'bg-primary' : 'bg-zinc-700'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition shadow ${
                      preferences.analytics ? 'translate-x-4' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Buttons / Actions */}
        <div className="mt-3.5 flex flex-col sm:flex-row items-center gap-2">
          {!isCustomizing ? (
            <>
              <button
                type="button"
                onClick={handleAcceptAll}
                className="w-full sm:w-auto flex-1 rounded-xl bg-primary px-3.5 py-2 text-xs font-semibold text-white shadow-md shadow-rose-950/50 transition-all hover:bg-primary-dull active:scale-98 flex items-center justify-center gap-1.5"
              >
                <Check className="h-3.5 w-3.5 stroke-[2.5]" />
                Accept All
              </button>
              <button
                type="button"
                onClick={handleNecessaryOnly}
                className="w-full sm:w-auto rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-zinc-300 transition-colors hover:bg-white/10 hover:text-white"
              >
                Necessary Only
              </button>
              <button
                type="button"
                onClick={() => setIsCustomizing(true)}
                className="w-full sm:w-auto rounded-xl px-2.5 py-2 text-xs font-medium text-zinc-400 transition-colors hover:text-white flex items-center justify-center gap-1"
              >
                Customize
                <ChevronDown className="h-3 w-3" />
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={handleSaveCustom}
                className="w-full sm:w-auto flex-1 rounded-xl bg-primary px-3.5 py-2 text-xs font-semibold text-white shadow-md shadow-rose-950/50 transition-all hover:bg-primary-dull active:scale-98 flex items-center justify-center gap-1.5"
              >
                <Check className="h-3.5 w-3.5 stroke-[2.5]" />
                Save Preferences
              </button>
              <button
                type="button"
                onClick={() => setIsCustomizing(false)}
                className="w-full sm:w-auto rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-zinc-300 transition-colors hover:bg-white/10 hover:text-white flex items-center justify-center gap-1"
              >
                Back
                <ChevronUp className="h-3 w-3" />
              </button>
            </>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default CookieConsentToast;
