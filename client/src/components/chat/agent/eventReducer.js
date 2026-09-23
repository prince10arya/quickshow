let eventCounter = 0;

/**
 * Generate a deterministic or monotonic unique ID for an event.
 * @param {string} prefix
 * @returns {string}
 */
export const createEventId = (prefix = 'evt') => {
  eventCounter += 1;
  return `${prefix}_${Date.now()}_${eventCounter}`;
};

/**
 * Initial empty list of agent events.
 * @type {import('./types').AgentEvent[]}
 */
export const INITIAL_AGENT_EVENTS = [];

/**
 * Pure reducer for managing the streaming sequence of agent events.
 *
 * @param {import('./types').AgentEvent[]} state
 * @param {{ type: string, payload?: Record<string, unknown> }} action
 * @returns {import('./types').AgentEvent[]}
 */
export const agentEventReducer = (state, action) => {
  if (!action || typeof action !== 'object') return state;

  switch (action.type) {
    case 'TOOL_START': {
      const { toolName, timestamp = Date.now(), id, input } = action.payload || {};
      const newId = id || createEventId('tool_start');

      // Deduplicate if event ID already exists
      if (state.some((e) => e.id === newId)) {
        return state;
      }

      const event = {
        id: newId,
        type: 'tool:start',
        toolName: typeof toolName === 'string' ? toolName : 'unknown_tool',
        timestamp: typeof timestamp === 'number' ? timestamp : Date.now(),
        metadata: input && typeof input === 'object' ? { input } : undefined,
      };

      return [...state, event];
    }

    case 'TOOL_SUCCESS': {
      const { toolName, timestamp = Date.now(), id, message, durationMs, output } = action.payload || {};
      const newId = id || createEventId('tool_success');

      if (state.some((e) => e.id === newId)) {
        return state;
      }

      // Calculate duration from last matching tool:start if not explicitly passed
      let calculatedDuration = durationMs;
      if (typeof calculatedDuration !== 'number') {
        const lastStart = [...state]
          .reverse()
          .find((e) => e.type === 'tool:start' && e.toolName === toolName);
        if (lastStart) {
          calculatedDuration = Math.max(0, timestamp - lastStart.timestamp);
        }
      }

      const event = {
        id: newId,
        type: 'tool:success',
        toolName: typeof toolName === 'string' ? toolName : 'unknown_tool',
        message: typeof message === 'string' ? message : undefined,
        timestamp: typeof timestamp === 'number' ? timestamp : Date.now(),
        durationMs: typeof calculatedDuration === 'number' ? calculatedDuration : undefined,
        metadata: output && typeof output === 'object' ? { output } : undefined,
      };

      return [...state, event];
    }

    case 'TOOL_ERROR': {
      const { toolName, timestamp = Date.now(), id, message, durationMs, error } = action.payload || {};
      const newId = id || createEventId('tool_error');

      if (state.some((e) => e.id === newId)) {
        return state;
      }

      let calculatedDuration = durationMs;
      if (typeof calculatedDuration !== 'number') {
        const lastStart = [...state]
          .reverse()
          .find((e) => e.type === 'tool:start' && e.toolName === toolName);
        if (lastStart) {
          calculatedDuration = Math.max(0, timestamp - lastStart.timestamp);
        }
      }

      const event = {
        id: newId,
        type: 'tool:error',
        toolName: typeof toolName === 'string' ? toolName : 'unknown_tool',
        message: typeof message === 'string' ? message : (error?.message || 'Tool execution failed'),
        timestamp: typeof timestamp === 'number' ? timestamp : Date.now(),
        durationMs: typeof calculatedDuration === 'number' ? calculatedDuration : undefined,
        metadata: error ? { error: String(error) } : undefined,
      };

      return [...state, event];
    }

    case 'AGENT_STATUS': {
      const { status, message, timestamp = Date.now(), id } = action.payload || {};
      const newId = id || createEventId('agent_status');

      if (state.some((e) => e.id === newId)) {
        return state;
      }

      const event = {
        id: newId,
        type: 'agent:status',
        message: typeof message === 'string' ? message : undefined,
        timestamp: typeof timestamp === 'number' ? timestamp : Date.now(),
        metadata: { status },
      };

      return [...state, event];
    }

    case 'RESET': {
      return INITIAL_AGENT_EVENTS;
    }

    default:
      return state;
  }
};
