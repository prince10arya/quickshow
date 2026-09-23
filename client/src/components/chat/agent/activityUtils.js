import { getToolMetadata } from './toolMetadata.js';

/**
 * Pure selector that transforms an append-only event stream into a list of
 * consolidated, high-level user-facing activities.
 *
 * Handles:
 * - Sequential tool calls
 * - Concurrent tool executions
 * - Repeated tool calls (avoids ID collisions)
 * - Incomplete tool calls (graceful running state)
 *
 * @param {import('./types').AgentEvent[]} events
 * @returns {import('./types').AgentActivity[]}
 */
export const selectActivities = (events) => {
  if (!Array.isArray(events) || events.length === 0) {
    return [];
  }

  /** @type {import('./types').AgentActivity[]} */
  const activities = [];
  /** @type {Map<string, number[]>} Maps toolName to stack of activity indexes */
  const pendingByTool = new Map();

  for (const event of events) {
    if (!event || typeof event !== 'object') continue;

    if (event.type === 'tool:start') {
      const toolName = event.toolName || 'unknown_tool';
      const meta = getToolMetadata(toolName);

      const activity = {
        id: `act_${event.id}`,
        type: /** @type {const} */ ('tool_call'),
        toolName,
        label: meta.label,
        status: /** @type {const} */ ('running'),
        timestamp: event.timestamp,
        metadata: {
          step: meta.step,
          description: meta.description,
        },
      };

      const index = activities.length;
      activities.push(activity);

      const stack = pendingByTool.get(toolName) || [];
      stack.push(index);
      pendingByTool.set(toolName, stack);
    } else if (event.type === 'tool:success') {
      const toolName = event.toolName || 'unknown_tool';
      const meta = getToolMetadata(toolName);
      const stack = pendingByTool.get(toolName);

      if (stack && stack.length > 0) {
        const actIndex = stack.shift();
        const existing = activities[actIndex];

        activities[actIndex] = {
          ...existing,
          label: event.message || meta.successLabel,
          status: 'success',
          durationMs: event.durationMs ?? (existing.timestamp ? event.timestamp - existing.timestamp : undefined),
        };
      } else {
        // Fallback for standalone success event without preceding start
        activities.push({
          id: `act_${event.id}`,
          type: 'tool_result',
          toolName,
          label: event.message || meta.successLabel,
          status: 'success',
          timestamp: event.timestamp,
          durationMs: event.durationMs,
          metadata: {
            step: meta.step,
          },
        });
      }
    } else if (event.type === 'tool:error') {
      const toolName = event.toolName || 'unknown_tool';
      const meta = getToolMetadata(toolName);
      const stack = pendingByTool.get(toolName);

      if (stack && stack.length > 0) {
        const actIndex = stack.shift();
        const existing = activities[actIndex];

        activities[actIndex] = {
          ...existing,
          label: event.message ? `Could not complete: ${event.message}` : `Could not finish ${meta.label.toLowerCase()}`,
          status: 'error',
          durationMs: event.durationMs ?? (existing.timestamp ? event.timestamp - existing.timestamp : undefined),
        };
      } else {
        activities.push({
          id: `act_${event.id}`,
          type: 'error',
          toolName,
          label: event.message || `Could not finish ${meta.label.toLowerCase()}`,
          status: 'error',
          timestamp: event.timestamp,
          durationMs: event.durationMs,
          metadata: {
            step: meta.step,
          },
        });
      }
    }
  }

  return activities;
};

/**
 * Select the latest running or most recent activity item.
 * @param {import('./types').AgentEvent[]} events
 * @returns {import('./types').AgentActivity | null}
 */
export const selectCurrentActivity = (events) => {
  const activities = selectActivities(events);
  if (!activities.length) return null;

  // Prioritize any activity currently in 'running' state
  const running = [...activities].reverse().find((a) => a.status === 'running');
  if (running) return running;

  // Otherwise return the most recently completed activity
  return activities[activities.length - 1];
};

/**
 * Derive the consolidated agent live status loader state.
 *
 * @param {import('./types').AgentEvent[]} events
 * @param {boolean} [isStreaming]
 * @returns {{ status: import('./types').AgentStatus, label: string, toolName?: string }}
 */
export const selectAgentStatus = (events, isStreaming = false) => {
  const current = selectCurrentActivity(events);

  if (current && current.status === 'running') {
    return {
      status: 'running',
      label: `${current.label}...`,
      toolName: current.toolName,
    };
  }

  if (isStreaming) {
    return {
      status: 'running',
      label: 'Thinking...',
    };
  }

  if (current && current.status === 'error') {
    return {
      status: 'error',
      label: current.label,
      toolName: current.toolName,
    };
  }

  if (current && current.status === 'success') {
    return {
      status: 'success',
      label: current.label,
      toolName: current.toolName,
    };
  }

  return {
    status: 'idle',
    label: 'Ready',
  };
};
