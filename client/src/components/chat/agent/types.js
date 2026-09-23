/**
 * @typedef {'discover' | 'movie' | 'show' | 'seats' | 'review'} BookingStep
 */

/**
 * @typedef {'idle' | 'running' | 'success' | 'error'} AgentStatus
 */

/**
 * @typedef {'tool_call' | 'tool_result' | 'reasoning' | 'status' | 'error'} ActivityType
 */

/**
 * @typedef {'pending' | 'running' | 'success' | 'error'} ActivityStatus
 */

/**
 * @typedef {Object} AgentActivity
 * @property {string} id
 * @property {ActivityType} type
 * @property {string} [toolName]
 * @property {string} label
 * @property {ActivityStatus} status
 * @property {number} timestamp
 * @property {number} [durationMs]
 * @property {Record<string, unknown>} [metadata]
 */

/**
 * @typedef {Object} AgentEvent
 * @property {string} id
 * @property {'tool:start' | 'tool:success' | 'tool:error' | 'agent:status'} type
 * @property {string} [toolName]
 * @property {string} [message]
 * @property {number} timestamp
 * @property {number} [durationMs]
 * @property {Record<string, unknown>} [metadata]
 */

/**
 * @typedef {Object} ToolMetadata
 * @property {string} label
 * @property {string} successLabel
 * @property {BookingStep} step
 * @property {React.ComponentType} [icon]
 * @property {string} [description]
 */

export {};
