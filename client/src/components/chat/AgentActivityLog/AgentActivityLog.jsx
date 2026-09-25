import { useState } from 'react';
import { AnimatePresence, useReducedMotion } from 'framer-motion';
import { ChevronDown, ChevronUp, Layers } from 'lucide-react';
import ActivityItem from './ActivityItem.jsx';

/**
 * @param {{
 *   activities?: import('../agent/types').AgentActivity[],
 *   defaultExpanded?: boolean,
 *   className?: string
 * }} props
 */
export const AgentActivityLog = ({
  activities = [],
  defaultExpanded = false,
  className = '',
}) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const shouldReduceMotion = useReducedMotion();

  if (!activities || activities.length === 0) {
    return null;
  }

  const runningCount = activities.filter((a) => a.status === 'running').length;
  const actionCount = activities.length;

  return (
    <section
      aria-label="Agent Activity Log"
      className={`rounded-2xl border border-white/10 bg-zinc-950/80 shadow-md backdrop-blur-md overflow-hidden transition-all ${className}`}
    >
      {/* Header Bar with Toggle */}
      <button
        type="button"
        onClick={() => setIsExpanded((prev) => !prev)}
        aria-expanded={isExpanded}
        aria-controls="agent-activity-timeline"
        className="flex w-full items-center justify-between px-3 py-2 text-left transition-colors hover:bg-white/5 focus:outline-none focus-visible:ring-1 focus-visible:ring-primary"
      >
        <div className="flex items-center gap-2">
          <Layers className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
          <span className="text-xs font-semibold text-zinc-200">Agent activity</span>

          {/* Action Count Pill */}
          <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-medium text-zinc-300">
            {actionCount} {actionCount === 1 ? 'action' : 'actions'}
          </span>

          {/* Running Beacon */}
          {runningCount > 0 && (
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
            </span>
          )}
        </div>

        <div className="flex items-center gap-1 text-[11px] text-zinc-400">
          <span>{isExpanded ? 'Hide' : 'Show'}</span>
          {isExpanded ? (
            <ChevronUp className="h-3.5 w-3.5" aria-hidden="true" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
          )}
        </div>
      </button>

      {/* Expandable Timeline Panel */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            id="agent-activity-timeline"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: shouldReduceMotion ? 0 : 0.2 }}
            className="border-t border-white/5 px-3 py-2.5 max-h-56 overflow-y-auto"
          >
            <div role="list" className="space-y-0.5">
              {activities.map((activity, index) => (
                <ActivityItem
                  key={activity.id || `act-${index}`}
                  activity={activity}
                  isLast={index === activities.length - 1}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
};

export default AgentActivityLog;
