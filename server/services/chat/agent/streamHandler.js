import { reserveBudget, settleBudget } from '../budget/budget.service.js';
import { createBookingConciergeAgent } from './agent.factory.js';

export const streamAgentExecution = async ({ message, history = [], onEvent }) => {
  const month = await reserveBudget();
  const agent = await createBookingConciergeAgent();

  const formattedHistory = (history || []).map((msg) => ({
    role: msg.role === 'assistant' ? 'assistant' : 'user',
    content: msg.content,
  }));

  const inputMessages = [...formattedHistory, { role: 'user', content: message }];

  console.log(
    `[Server:Agent] 🤖 Starting execution | msg: "${message.slice(0, 50)}${message.length > 50 ? '...' : ''}" | history: ${formattedHistory.length} msgs`
  );

  let accumulatedText = '';
  let activeBookingSummary = null;
  const generativeWidgets = [];
  const capturedMessages = [];

  try {
    const eventStream = await agent.streamEvents(
      { messages: inputMessages },
      { version: 'v2', recursionLimit: 8 }
    );

    for await (const event of eventStream) {
      if (event.event === 'on_chat_model_stream') {
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
        let input = event.data?.input;
        if (typeof input === 'string') {
          try {
            input = JSON.parse(input);
          } catch {
            // keep as string
          }
        }
        console.log(`[Server:Agent] 🛠️ on_tool_start: "${event.name}" | input:`, input);
        onEvent({
          type: 'tool_start',
          tool: event.name,
          input,
        });
      } else if (event.event === 'on_tool_end') {
        let parsedOutput = event.data?.output;
        if (parsedOutput && typeof parsedOutput === 'object' && 'content' in parsedOutput) {
          parsedOutput = parsedOutput.content;
        }
        if (Array.isArray(parsedOutput) && parsedOutput[0]?.text) {
          parsedOutput = parsedOutput[0].text;
        } else if (parsedOutput && typeof parsedOutput === 'object' && typeof parsedOutput.text === 'string') {
          parsedOutput = parsedOutput.text;
        }
        if (typeof parsedOutput === 'string') {
          try {
            parsedOutput = JSON.parse(parsedOutput);
          } catch {
            // raw string
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
          `[Server:Agent] 🛠️ on_tool_end: "${event.name}" | widget: ${widget ? widget.type : 'none'}`
        );

        onEvent({
          type: 'tool_end',
          tool: event.name,
          output: parsedOutput,
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
