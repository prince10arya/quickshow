import React from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Check, ChevronRight, Loader2, Sparkles } from 'lucide-react';

/**
 * @param {{
 *   thinkingSteps?: { id: string, label: string, status: 'active' | 'completed' | 'error' }[],
 *   loading?: boolean,
 *   className?: string
 * }} props
 */
export const AgentThinking = ({
  thinkingSteps = [],
  loading = false,
  className = '',
}) => {
  const shouldReduceMotion = useReducedMotion();

  if (!loading || !thinkingSteps.length) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        initial={{ opacity: 0, y: 6, height: 0 }}
        animate={{ opacity: 1, y: 0, height: 'auto' }}
        exit={{ opacity: 0, y: 6, height: 0 }}
        transition={{ duration: shouldReduceMotion ? 0 : 0.2 }}
        className={`border-t border-white/10 bg-zinc-950/80 px-4 py-2.5 backdrop-blur-md ${className}`}
      >
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5">
          {/* Cinema AI Badge */}
          <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-rose-300 shrink-0">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
            </span>
            <span className="flex items-center gap-1 text-primary">
              <Sparkles className="h-3 w-3" aria-hidden="true" />
              <span>Concierge</span>
            </span>
          </div>

          <span className="text-zinc-600 text-xs shrink-0 select-none">•</span>

          {/* Thinking Steps Progression Breadcrumb */}
          <div className="flex items-center gap-1.5 min-w-0">
            {thinkingSteps.map((step, idx) => {
              const isActive = step.status === 'active';
              const isCompleted = step.status === 'completed';

              return (
                <React.Fragment key={step.id}>
                  {idx > 0 && (
                    <ChevronRight
                      className="h-3 w-3 text-zinc-600 shrink-0 select-none"
                      aria-hidden="true"
                    />
                  )}

                  <motion.div
                    layout
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: shouldReduceMotion ? 0 : 0.15 }}
                    className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs transition-colors shrink-0 ${
                      isActive
                        ? 'border border-primary/40 bg-primary/15 text-rose-200 shadow-sm shadow-primary/20 font-medium'
                        : isCompleted
                          ? 'border border-white/10 bg-white/5 text-zinc-400'
                          : 'border border-rose-500/30 bg-rose-500/10 text-rose-300'
                    }`}
                  >
                    {isActive ? (
                      <Loader2
                        className="h-3 w-3 animate-spin text-primary shrink-0"
                        aria-hidden="true"
                      />
                    ) : isCompleted ? (
                      <Check
                        className="h-3 w-3 text-emerald-400 stroke-[2.5] shrink-0"
                        aria-hidden="true"
                      />
                    ) : null}

                    <span className="truncate max-w-[190px] sm:max-w-none">
                      {step.label}
                    </span>
                  </motion.div>
                </React.Fragment>
              );
            })}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default AgentThinking;
