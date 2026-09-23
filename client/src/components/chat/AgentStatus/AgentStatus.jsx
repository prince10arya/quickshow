import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { AlertCircle, CheckCircle2, Loader2, Sparkles } from 'lucide-react';

/**
 * @param {{
 *   status?: import('../agent/types').AgentStatus,
 *   label?: string,
 *   className?: string
 * }} props
 */
export const AgentStatus = ({
  status = 'idle',
  label = 'Ready',
  className = '',
}) => {
  const shouldReduceMotion = useReducedMotion();

  // If idle and label is Ready, we keep it minimal or render quiet state
  const isIdle = status === 'idle';

  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className={`flex items-center gap-2 rounded-xl border px-3 py-1.5 text-xs font-medium transition-colors duration-200 ${
        status === 'running'
          ? 'border-primary/30 bg-primary/10 text-rose-200'
          : status === 'error'
            ? 'border-rose-500/30 bg-rose-500/10 text-rose-300'
            : status === 'success'
              ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
              : 'border-white/5 bg-zinc-900/60 text-zinc-400'
      } ${className}`}
    >
      <AnimatePresence mode="wait">
        {status === 'running' && (
          <motion.div
            key="running"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: shouldReduceMotion ? 0 : 0.15 }}
            className="flex items-center gap-1.5"
          >
            <Loader2 className="h-3.5 w-3.5 animate-spin text-primary shrink-0" aria-hidden="true" />
            <span className="relative flex h-2 w-2 shrink-0">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
            </span>
          </motion.div>
        )}

        {status === 'success' && (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: shouldReduceMotion ? 0 : 0.15 }}
          >
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" aria-hidden="true" />
          </motion.div>
        )}

        {status === 'error' && (
          <motion.div
            key="error"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: shouldReduceMotion ? 0 : 0.15 }}
          >
            <AlertCircle className="h-3.5 w-3.5 text-rose-400 shrink-0" aria-hidden="true" />
          </motion.div>
        )}

        {isIdle && (
          <motion.div
            key="idle"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <Sparkles className="h-3 w-3 text-zinc-400 shrink-0" aria-hidden="true" />
          </motion.div>
        )}
      </AnimatePresence>

      <span className="truncate tracking-tight select-none">
        {label || (status === 'running' ? 'Thinking...' : 'Ready')}
      </span>
    </div>
  );
};

export default AgentStatus;
