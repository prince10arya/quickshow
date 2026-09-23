import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Check } from 'lucide-react';
import { BOOKING_STEPS, STEP_METADATA } from '../agent/constants.js';

/**
 * @param {{
 *   currentStep?: import('../agent/types').BookingStep,
 *   completedSteps?: import('../agent/types').BookingStep[],
 *   className?: string
 * }} props
 */
export const BookingProgress = ({
  currentStep = 'discover',
  completedSteps = [],
  className = '',
}) => {
  const shouldReduceMotion = useReducedMotion();
  const completedSet = new Set(completedSteps);

  return (
    <nav
      aria-label="Booking Progress"
      className={`border-b border-white/10 bg-zinc-950/70 px-3 py-2.5 backdrop-blur-md ${className}`}
    >
      <ol role="list" className="flex items-center justify-between gap-1 sm:gap-2">
        {BOOKING_STEPS.map((stepKey, index) => {
          const meta = STEP_METADATA[stepKey];
          const isCompleted = completedSet.has(stepKey);
          const isActive = currentStep === stepKey;
          const isUpcoming = !isCompleted && !isActive;

          // State visual indicators
          const stateLabel = isCompleted
            ? 'Completed'
            : isActive
              ? 'Current step'
              : 'Upcoming step';

          return (
            <React.Fragment key={stepKey}>
              {/* Step Node */}
              <li
                role="listitem"
                aria-current={isActive ? 'step' : undefined}
                className="group relative flex flex-1 flex-col items-center focus:outline-none"
              >
                <div className="flex items-center gap-1.5 sm:gap-2">
                  {/* Step Bubble Indicator */}
                  <div className="relative flex h-6 w-6 sm:h-7 sm:w-7 items-center justify-center">
                    {isActive && (
                      <motion.span
                        layoutId={shouldReduceMotion ? undefined : 'active-step-glow'}
                        className="absolute inset-0 rounded-full bg-primary/20 ring-2 ring-primary/60"
                        initial={false}
                        transition={{ type: 'spring', stiffness: 350, damping: 25 }}
                        aria-hidden="true"
                      />
                    )}

                    <div
                      className={`relative z-10 flex h-5 w-5 sm:h-6 sm:w-6 items-center justify-center rounded-full text-[10px] sm:text-xs font-semibold transition-colors duration-200 ${
                        isCompleted
                          ? 'bg-emerald-500 text-zinc-950 shadow-sm shadow-emerald-500/30'
                          : isActive
                            ? 'bg-primary text-white shadow-md shadow-rose-950/50'
                            : 'border border-white/20 bg-zinc-900/80 text-zinc-400'
                      }`}
                      aria-label={`${meta.label}: ${stateLabel}`}
                    >
                      {isCompleted ? (
                        <Check className="h-3 w-3 sm:h-3.5 sm:w-3.5 stroke-[3]" aria-hidden="true" />
                      ) : isActive ? (
                        <span className="h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-full bg-white animate-pulse" aria-hidden="true" />
                      ) : (
                        <span className="text-[10px] text-zinc-400">{index + 1}</span>
                      )}
                    </div>
                  </div>

                  {/* Label (Responsive: hidden on very small screens, visible on sm+) */}
                  <div className="hidden xs:flex flex-col">
                    <span
                      className={`text-[11px] sm:text-xs font-medium tracking-tight transition-colors ${
                        isActive
                          ? 'font-semibold text-white'
                          : isCompleted
                            ? 'text-zinc-300'
                            : 'text-zinc-400'
                      }`}
                    >
                      {meta.shortLabel}
                    </span>
                  </div>
                </div>

                {/* Accessible screen reader description */}
                <span className="sr-only">
                  {meta.label} - {stateLabel}
                </span>
              </li>

              {/* Connector Bar between steps */}
              {index < BOOKING_STEPS.length - 1 && (
                <div
                  aria-hidden="true"
                  className="h-0.5 flex-1 mx-1 sm:mx-2 rounded-full overflow-hidden bg-white/10"
                >
                  <motion.div
                    className="h-full bg-gradient-to-r from-emerald-500 to-primary"
                    initial={false}
                    animate={{
                      width: isCompleted ? '100%' : '0%',
                    }}
                    transition={{ duration: shouldReduceMotion ? 0 : 0.3 }}
                  />
                </div>
              )}
            </React.Fragment>
          );
        })}
      </ol>
    </nav>
  );
};

export default BookingProgress;
