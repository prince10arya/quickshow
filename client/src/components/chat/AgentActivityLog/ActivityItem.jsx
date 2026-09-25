import { useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { AlertCircle, Check, ChevronDown, ChevronRight, Clock, Loader2 } from 'lucide-react';
import { getToolMetadata } from '../agent/toolMetadata.js';

/**
 * Formats duration in milliseconds to human readable string.
 * @param {number} [ms]
 * @returns {string}
 */
const formatDuration = (ms) => {
  if (typeof ms !== 'number' || ms < 0) return '';
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
};

/**
 * @param {{
 *   activity: import('../agent/types').AgentActivity,
 *   isLast?: boolean
 * }} props
 */
export const ActivityItem = ({ activity, isLast = false }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const meta = getToolMetadata(activity.toolName);

  const isSuccess = activity.status === 'success';
  const isRunning = activity.status === 'running';
  const isError = activity.status === 'error';

  return (
    <div className="relative flex gap-3 text-xs">
      {/* Timeline Node Line */}
      {!isLast && (
        <span
          className="absolute left-[11px] top-6 -bottom-2 w-0.5 bg-white/10"
          aria-hidden="true"
        />
      )}

      {/* Status Bullet Icon */}
      <div className="relative z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border bg-zinc-900 shadow-xs">
        {isRunning && (
          <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" aria-hidden="true" />
        )}
        {isSuccess && (
          <Check className="h-3.5 w-3.5 text-emerald-400 stroke-[2.5]" aria-hidden="true" />
        )}
        {isError && (
          <AlertCircle className="h-3.5 w-3.5 text-rose-400" aria-hidden="true" />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 pb-3">
        <div className="flex items-center justify-between gap-2">
          {/* Action Trigger / Label */}
          <button
            type="button"
            onClick={() => setIsExpanded((prev) => !prev)}
            aria-expanded={isExpanded}
            className="group flex items-center gap-1.5 text-left font-medium text-zinc-200 hover:text-white focus:outline-none focus-visible:ring-1 focus-visible:ring-primary rounded-sm"
          >
            <span className="truncate">{activity.label}</span>
            {isExpanded ? (
              <ChevronDown className="h-3 w-3 text-zinc-400 group-hover:text-white" aria-hidden="true" />
            ) : (
              <ChevronRight className="h-3 w-3 text-zinc-400 group-hover:text-white" aria-hidden="true" />
            )}
          </button>

          {/* Duration Badge */}
          {typeof activity.durationMs === 'number' && (
            <span className="flex items-center gap-1 text-[10px] text-zinc-400 font-mono shrink-0">
              <Clock className="h-2.5 w-2.5" aria-hidden="true" />
              {formatDuration(activity.durationMs)}
            </span>
          )}
        </div>

        {/* Expandable Details Card (Safe Metadata Only) */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="mt-1.5 overflow-hidden rounded-lg border border-white/5 bg-black/40 p-2.5 text-[11px] text-zinc-400"
            >
              <div className="grid grid-cols-2 gap-x-3 gap-y-1">
                <div>
                  <span className="text-zinc-400">Action: </span>
                  <span className="font-mono text-zinc-300">{activity.toolName || 'agent_task'}</span>
                </div>
                <div>
                  <span className="text-zinc-400">Status: </span>
                  <span
                    className={`capitalize font-medium ${
                      isSuccess
                        ? 'text-emerald-400'
                        : isError
                          ? 'text-rose-400'
                          : 'text-amber-400'
                    }`}
                  >
                    {activity.status}
                  </span>
                </div>
                {activity.durationMs !== undefined && (
                  <div>
                    <span className="text-zinc-400">Duration: </span>
                    <span className="font-mono text-zinc-300">
                      {formatDuration(activity.durationMs)}
                    </span>
                  </div>
                )}
                {meta.description && (
                  <div className="col-span-2 mt-1 border-t border-white/5 pt-1 text-zinc-400 text-[10px]">
                    {meta.description}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default ActivityItem;
