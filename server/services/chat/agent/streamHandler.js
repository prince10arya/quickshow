import { reserveBudget, settleBudget } from '../budget/budget.service.js';
import { createBookingConciergeAgent } from './agent.factory.js';
import { buildSystemPrompt } from '../prompts/systemPrompt.js';
import { contextSerializer } from '../../../modules/context/context.serializer.js';
import { bookingSessionService } from '../../../modules/booking/bookingSession.service.js';
import { agentEventRepository } from '../../../repositories/agentEvent.repository.js';
import { AGENT_EVENT_STATUS, AGENT_EVENT_TYPE } from '../../../models/agentEvent.model.js';

const extractJsonPayload = (raw) => {
  let current = raw;
  for (let i = 0; i < 5; i++) {
    if (!current) break;
    if (typeof current === 'object') {
      if ('content' in current) {
        current = current.content;
        continue;
      }
      if (Array.isArray(current) && current[0]?.text) {
        current = current[0].text;
        continue;
      }
      if (typeof current.text === 'string') {
        current = current.text;
        continue;
      }
    }
    if (typeof current === 'string') {
      try {
        const parsed = JSON.parse(current);
        current = parsed;
        continue;
      } catch {
        break;
      }
    }
    break;
  }
  return current;
};

export const streamAgentExecution = async ({
  message,
  history = [],
  onEvent = () => {},
  userId,
  conversationId,
  context = null,
}) => {
  const month = await reserveBudget();

  // 1. Build prompt with serialized context if available
  let systemPrompt;
  if (context) {
    const serialized = contextSerializer.serialize(context, message);
    systemPrompt = buildSystemPrompt(serialized);
  }

  const agent = await createBookingConciergeAgent({ systemPrompt });

  const formattedHistory = (history || []).map((msg) => ({
    role: msg.role === 'assistant' ? 'assistant' : 'user',
    content: msg.content,
  }));

  const inputMessages = [...formattedHistory, { role: 'user', content: message }];

  console.log(
    `[Server:Agent] 🤖 Starting execution with [${agent.provider?.toUpperCase() || 'UNKNOWN'}] model: "${agent.modelName}" | msg: "${message.slice(0, 50)}${message.length > 50 ? '...' : ''}" | history: ${formattedHistory.length} msgs`
  );

  let accumulatedText = '';
  let activeBookingSummary = null;
  const generativeWidgets = [];
  const capturedMessages = [];
  const toolStartTimes = new Map();

  try {
    const eventStream = await agent.streamEvents(
      { messages: inputMessages },
      { version: 'v2', recursionLimit: 8 }
    );

    for await (const event of eventStream) {
      if (event.event === 'on_chat_model_start') {
        console.log(
          `[Server:Agent] 🧠 Invoking chat model: [${agent.provider?.toUpperCase() || 'UNKNOWN'}] "${agent.modelName}"`
        );
      } else if (event.event === 'on_chat_model_stream') {
        const chunk = event.data?.chunk;
        const text =
          typeof chunk?.content === 'string'
            ? chunk.content
            : Array.isArray(chunk?.content)
              ? chunk.content.map((c) => (typeof c === 'string' ? c : c.text || '')).join('')
              : '';

        if (text) {
          accumulatedText += text;
          onEvent({ type: 'token', token: text });
        }
      } else if (event.event === 'on_tool_start') {
        const toolStartTime = Date.now();
        toolStartTimes.set(event.name, toolStartTime);

        let input = event.data?.input;
        if (typeof input === 'string') {
          try {
            input = JSON.parse(input);
          } catch {
            // keep as string
          }
        }
        console.log(`[Server:Agent] 🛠️ on_tool_start: "${event.name}" | input:`, input);

        // Persist AgentEvent to MongoDB
        if (conversationId) {
          agentEventRepository
            .createEvent({
              conversationId,
              type: AGENT_EVENT_TYPE.TOOL_START,
              toolName: event.name,
              status: AGENT_EVENT_STATUS.RUNNING,
              metadata: { input },
              startedAt: new Date(toolStartTime),
            })
            .catch((err) => console.warn('[StreamHandler] AgentEvent save failed:', err.message));
        }

        onEvent({
          type: 'tool_start',
          tool: event.name,
          toolName: event.name,
          input,
          timestamp: toolStartTime,
        });
      } else if (event.event === 'on_tool_end') {
        const completedTime = Date.now();
        const startTime = toolStartTimes.get(event.name) || completedTime;
        const durationMs = Math.max(0, completedTime - startTime);
        toolStartTimes.delete(event.name);

        let parsedOutput = extractJsonPayload(event.data?.output);

        // Deterministic booking state update (Section 24: application code updates MongoDB)
        if (context?.bookingState) {
          try {
            const updated = await bookingSessionService.handleToolResult(
              context.bookingState,
              event.name,
              parsedOutput
            );
            context.bookingState = updated;
          } catch (toolStateErr) {
            console.warn('[StreamHandler] Booking state update from tool failed:', toolStateErr.message);
          }
        }

        let widget = null;
        if (parsedOutput && typeof parsedOutput === 'object') {
          if (Array.isArray(parsedOutput.movies) && parsedOutput.movies.length > 0) {
            widget = {
              type: 'movie_grid',
              genre: parsedOutput.genre || null,
              movies: parsedOutput.movies,
            };
            generativeWidgets.push(widget);
          } else if (Array.isArray(parsedOutput.shows) && parsedOutput.shows.length > 0) {
            widget = {
              type: 'showtimes',
              shows: parsedOutput.shows,
            };
            generativeWidgets.push(widget);
          } else if (parsedOutput.bookingSummary) {
            activeBookingSummary = parsedOutput.bookingSummary;
            widget = {
              type: 'booking_summary',
              bookingSummary: parsedOutput.bookingSummary,
            };
            generativeWidgets.push(widget);
          }
        }

        console.log(
          `[Server:Agent] 🛠️ on_tool_end: "${event.name}" (${durationMs}ms) | widget: ${widget ? widget.type : 'none'}`
        );

        // Persist AgentEvent to MongoDB
        if (conversationId) {
          agentEventRepository
            .createEvent({
              conversationId,
              type: AGENT_EVENT_TYPE.TOOL_SUCCESS,
              toolName: event.name,
              status: AGENT_EVENT_STATUS.SUCCESS,
              metadata: { output: parsedOutput },
              completedAt: new Date(completedTime),
              durationMs,
            })
            .catch((err) => console.warn('[StreamHandler] AgentEvent save failed:', err.message));
        }

        onEvent({
          type: 'tool_end',
          tool: event.name,
          toolName: event.name,
          output: parsedOutput,
          durationMs,
          widget,
        });

        if (widget) {
          onEvent({ type: 'ui', widget });
        }
      } else if (event.event === 'on_chain_end' && event.data?.output?.messages) {
        capturedMessages.push(...event.data.output.messages);
      }
    }

    console.log(
      `[Server:Agent] 🏁 Execution completed | chars: ${accumulatedText.length} | widgets: ${generativeWidgets.length} | summary: ${activeBookingSummary ? 'yes' : 'no'}`
    );

    return {
      message: accumulatedText.trim(),
      bookingSummary: activeBookingSummary,
      generativeWidgets,
      bookingState: context?.bookingState || null,
    };
  } catch (agentErr) {
    console.error(`[Server:Agent] ❌ Agent stream error:`, agentErr.message);
    throw agentErr;
  } finally {
    await settleBudget(month, capturedMessages).catch((err) => {
      console.error('[Server:Agent] Error settling budget:', err.message);
    });
  }
};
