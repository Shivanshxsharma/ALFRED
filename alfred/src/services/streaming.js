import { fetchEventSource } from '@microsoft/fetch-event-source';
import { user_contextStore, usechatStore } from './contextStrore';

class FatalError extends Error {}

export const streamChatResponse = async (
  chatId, prompt, onChunk, onComplete, isnew_Chat, user_id, signal
) => {
  try {
    await fetchEventSource('http://127.0.0.1:8000/stream', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal,
      body: JSON.stringify({
        is_new_chat: isnew_Chat,
        user_id,
        chatId,
        prompt
      }),

      // stop retrying on non-2xx responses
      async onopen(response) {
        if (response.ok) return;

        if (response.status === 429) {
          onChunk("\n[Error]: Rate limit exceeded. Please try again later.");
          throw new FatalError("rate_limit");
        }
        if (response.status >= 500) {
          onChunk("\n[Error]: Server error. Please try again later.");
          throw new FatalError("server_error");
        }
        if (response.status >= 400) {
          onChunk("\n[Error]: Request failed. Please try again.");
          throw new FatalError("client_error");
        }
      },

      onmessage(ev) {
        let data;
        try {
          data = JSON.parse(ev.data);
        } catch {
          console.warn("Unparseable SSE message:", ev.data);
          return;
        }

        console.log("Received data:", data);

        if (data.type === 'stream') {
          onChunk(data.content);
        }

        if (data.type === 'tool_start') {
          usechatStore.getState().actions.addTool({
            name: data.tool_name,
            status: "running"
          });
        }

        if (data.type === 'tool_end') {
          usechatStore.getState().actions.updateTool(
            data.tool_name, { status: "done" }
          );
        }

        if (data.type === 'complete') {
            usechatStore.getState().actions.updateTool(
            data.tool_name, { status: "done" }
          );
          if (isnew_Chat) {
            user_contextStore.setState((state) => ({
              ...state,
              updateHistory: !state.updateHistory
            }));
          }
          onComplete(false);
        }

        if (data.type === 'error') {
          const { status } = data;
          console.error("Server-sent error:", status);

          if (status === "ChatGoogleGenerativeAIError" || status === "429") {
            onChunk("\n[Error]: Rate limit exceeded. Please try again after recharging keys.");
          }else if (status === "503") {
            onChunk("\n[Error]: Service unavailable. Please try again later.");
          } else if (status === "500") {
            onChunk("\n[Error]: Internal Server Error. Please try again later.");
          } else if (status === "ConnectError") {
            onChunk("\n[Error]: No Internet Connection. Please check your connection.");
          } else {
            onChunk(`\n[Error]: Something went wrong (${status ?? 'unknown'}).`);
          }

          onComplete(false);
          throw new FatalError("server_sent_error"); // stop retrying
        }
      },

      onerror(err) {
        // AbortError = user cancelled — silent exit
        if (err.name === 'AbortError') {
          onComplete(false);
          throw err; // must throw to stop fetchEventSource loop
        }

        
        if (err instanceof FatalError) {
          throw err; 
        }
        console.error("SSE connection error:", err);
        onChunk("\n[Error]: Connection lost. Please check your internet.");
        onComplete(false);
        throw err; 
      }
    });

  } catch (err) {
    if (err instanceof FatalError || err.name === 'AbortError') return;
    console.error("Unhandled stream error:", err);
  }
};

export const abortStream = async (chatId) => {
  try {
    const response = await fetch(`http://127.0.0.1:8000/abort/${chatId}`, {
      method: 'POST'
    });
    const result = await response.json();
    console.log("Abort result:", result);
  } catch (error) {
    console.error("Error aborting stream:", error);
  }
};