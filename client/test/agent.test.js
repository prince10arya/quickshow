import assert from 'node:assert/strict';
import test from 'node:test';
import {
  DEFAULT_TOOL_METADATA,
  getToolMetadata,
  TOOL_METADATA,
  TOOL_STEP_MAP,
} from '../src/components/chat/agent/toolMetadata.js';
import {
  agentEventReducer,
  INITIAL_AGENT_EVENTS,
} from '../src/components/chat/agent/eventReducer.js';
import {
  selectActivities,
  selectAgentStatus,
  selectCurrentActivity,
} from '../src/components/chat/agent/activityUtils.js';
import {
  BOOKING_STEPS,
  STEP_METADATA,
} from '../src/components/chat/agent/constants.js';
import {
  selectCompletedSteps,
  selectCurrentBookingStep,
} from '../src/components/chat/agent/bookingProgress.js';

// 1. Tool → Booking Step Mapping
test('1. tool -> booking step mapping correctly links tools to phases', () => {
  assert.equal(TOOL_STEP_MAP.list_all_movies, 'discover');
  assert.equal(TOOL_STEP_MAP.list_movies_by_genre, 'discover');
  assert.equal(TOOL_STEP_MAP.get_movie_details, 'movie');
  assert.equal(TOOL_STEP_MAP.search_upcoming_shows, 'show');
  assert.equal(TOOL_STEP_MAP.check_show_availability, 'show');
  assert.equal(TOOL_STEP_MAP.suggest_contiguous_seats, 'seats');
  assert.equal(TOOL_STEP_MAP.prepare_booking_summary, 'review');
});

// 2. Tool → Status Mapping
test('2. tool -> status mapping provides active and completed labels', () => {
  assert.equal(TOOL_METADATA.list_all_movies.label, 'Finding movies');
  assert.equal(TOOL_METADATA.search_upcoming_shows.label, 'Finding upcoming shows');
  assert.equal(TOOL_METADATA.check_show_availability.label, 'Checking show availability');
  assert.equal(TOOL_METADATA.suggest_contiguous_seats.label, 'Finding seats together');
  assert.equal(TOOL_METADATA.prepare_booking_summary.label, 'Preparing booking summary');
});

// 3. Tool Start Event Handling
test('3. tool:start event creates pending/running activity', () => {
  const events = agentEventReducer(INITIAL_AGENT_EVENTS, {
    type: 'TOOL_START',
    payload: {
      toolName: 'search_upcoming_shows',
      input: { query: 'Inception' },
      timestamp: 1000,
    },
  });

  assert.equal(events.length, 1);
  assert.equal(events[0].type, 'tool:start');
  assert.equal(events[0].toolName, 'search_upcoming_shows');

  const activities = selectActivities(events);
  assert.equal(activities.length, 1);
  assert.equal(activities[0].status, 'running');
  assert.equal(activities[0].label, 'Finding upcoming shows');
  assert.equal(activities[0].toolName, 'search_upcoming_shows');
});

// 4. Tool Success Event Handling & Duration
test('4. tool:success event calculates duration and marks activity success', () => {
  let events = agentEventReducer(INITIAL_AGENT_EVENTS, {
    type: 'TOOL_START',
    payload: { toolName: 'check_show_availability', timestamp: 1000 },
  });

  events = agentEventReducer(events, {
    type: 'TOOL_SUCCESS',
    payload: {
      toolName: 'check_show_availability',
      timestamp: 1420,
    },
  });

  assert.equal(events.length, 2);
  assert.equal(events[1].durationMs, 420);

  const activities = selectActivities(events);
  assert.equal(activities.length, 1);
  assert.equal(activities[0].status, 'success');
  assert.equal(activities[0].durationMs, 420);
  assert.equal(activities[0].label, 'Checked show availability');
});

// 5. Tool Error Event Handling
test('5. tool:error event records error message and marks activity failed', () => {
  let events = agentEventReducer(INITIAL_AGENT_EVENTS, {
    type: 'TOOL_START',
    payload: { toolName: 'check_show_availability', timestamp: 2000 },
  });

  events = agentEventReducer(events, {
    type: 'TOOL_ERROR',
    payload: {
      toolName: 'check_show_availability',
      message: 'Show is sold out',
      timestamp: 2300,
    },
  });

  const activities = selectActivities(events);
  assert.equal(activities.length, 1);
  assert.equal(activities[0].status, 'error');
  assert.equal(activities[0].durationMs, 300);
  assert.match(activities[0].label, /Show is sold out/);
});

// 6. Unknown Tool Fallback
test('6. unknown tool falls back gracefully without crashing', () => {
  const meta = getToolMetadata('non_existent_custom_tool');
  assert.equal(meta.step, 'discover');
  assert.equal(meta.label, DEFAULT_TOOL_METADATA.label);

  const events = agentEventReducer(INITIAL_AGENT_EVENTS, {
    type: 'TOOL_START',
    payload: { toolName: 'non_existent_custom_tool' },
  });

  const activities = selectActivities(events);
  assert.equal(activities.length, 1);
  assert.equal(activities[0].label, DEFAULT_TOOL_METADATA.label);
});

// 7. Repeated Tool Calls
test('7. repeated tool calls create distinct activities without ID collision', () => {
  let events = agentEventReducer(INITIAL_AGENT_EVENTS, {
    type: 'TOOL_START',
    payload: { toolName: 'check_show_availability', timestamp: 1000 },
  });
  events = agentEventReducer(events, {
    type: 'TOOL_SUCCESS',
    payload: { toolName: 'check_show_availability', timestamp: 1200 },
  });
  events = agentEventReducer(events, {
    type: 'TOOL_START',
    payload: { toolName: 'check_show_availability', timestamp: 1300 },
  });
  events = agentEventReducer(events, {
    type: 'TOOL_SUCCESS',
    payload: { toolName: 'check_show_availability', timestamp: 1550 },
  });

  const activities = selectActivities(events);
  assert.equal(activities.length, 2);
  assert.notEqual(activities[0].id, activities[1].id);
  assert.equal(activities[0].durationMs, 200);
  assert.equal(activities[1].durationMs, 250);
});

// 8. Concurrent Tool Calls
test('8. concurrent tool calls handle overlapping executions cleanly', () => {
  let events = agentEventReducer(INITIAL_AGENT_EVENTS, {
    type: 'TOOL_START',
    payload: { toolName: 'list_movies_by_genre', timestamp: 1000 },
  });
  events = agentEventReducer(events, {
    type: 'TOOL_START',
    payload: { toolName: 'search_upcoming_shows', timestamp: 1050 },
  });

  // list_movies_by_genre completes before search_upcoming_shows
  events = agentEventReducer(events, {
    type: 'TOOL_SUCCESS',
    payload: { toolName: 'list_movies_by_genre', timestamp: 1300 },
  });

  let activities = selectActivities(events);
  assert.equal(activities.length, 2);
  assert.equal(activities[0].status, 'success');
  assert.equal(activities[0].durationMs, 300);
  assert.equal(activities[1].status, 'running');

  // search_upcoming_shows finishes
  events = agentEventReducer(events, {
    type: 'TOOL_SUCCESS',
    payload: { toolName: 'search_upcoming_shows', timestamp: 1400 },
  });

  activities = selectActivities(events);
  assert.equal(activities[1].status, 'success');
  assert.equal(activities[1].durationMs, 350);
});

// 9. Incomplete Tool Calls
test('9. incomplete tool call retains running status gracefully', () => {
  const events = agentEventReducer(INITIAL_AGENT_EVENTS, {
    type: 'TOOL_START',
    payload: { toolName: 'suggest_contiguous_seats', timestamp: 1000 },
  });

  const current = selectCurrentActivity(events);
  assert.ok(current);
  assert.equal(current.status, 'running');

  const status = selectAgentStatus(events, true);
  assert.equal(status.status, 'running');
  assert.equal(status.label, 'Finding seats together...');
});

// 10. Step Progression State Machine
test('10. step progression advances from discover to review', () => {
  let events = [];
  assert.equal(selectCurrentBookingStep(events), 'discover');

  events = agentEventReducer(events, {
    type: 'TOOL_START',
    payload: { toolName: 'list_all_movies' },
  });
  assert.equal(selectCurrentBookingStep(events), 'discover');

  events = agentEventReducer(events, {
    type: 'TOOL_START',
    payload: { toolName: 'get_movie_details' },
  });
  assert.equal(selectCurrentBookingStep(events), 'movie');
  assert.deepEqual(selectCompletedSteps(events), ['discover']);

  events = agentEventReducer(events, {
    type: 'TOOL_START',
    payload: { toolName: 'search_upcoming_shows' },
  });
  assert.equal(selectCurrentBookingStep(events), 'show');
  assert.deepEqual(selectCompletedSteps(events), ['discover', 'movie']);

  events = agentEventReducer(events, {
    type: 'TOOL_START',
    payload: { toolName: 'suggest_contiguous_seats' },
  });
  assert.equal(selectCurrentBookingStep(events), 'seats');
  assert.deepEqual(selectCompletedSteps(events), ['discover', 'movie', 'show']);

  events = agentEventReducer(events, {
    type: 'TOOL_SUCCESS',
    payload: { toolName: 'prepare_booking_summary' },
  });
  assert.equal(selectCurrentBookingStep(events), 'review');
  assert.deepEqual(selectCompletedSteps(events), ['discover', 'movie', 'show', 'seats', 'review']);
});

// 11. Accessibility States and Constants
test('11. accessibility states and step metadata conform to UX specs', () => {
  assert.equal(BOOKING_STEPS.length, 5);
  for (const step of BOOKING_STEPS) {
    const meta = STEP_METADATA[step];
    assert.ok(meta);
    assert.ok(meta.label);
    assert.ok(meta.description);
    assert.equal(typeof meta.order, 'number');
  }
});
