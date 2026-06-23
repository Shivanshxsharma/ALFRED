import { fetchEventSource } from '@microsoft/fetch-event-source';
import { user_contextStore, usechatStore } from './contextStrore';
import { ensureFreshToken } from './fetch_info';

class FatalError extends Error {}

export const streamChatResponse = async (
  chatId, prompt, onChunk, onComplete, isnew_Chat, signal
) => {
  // Track whether onComplete was already called to prevent double-firing
  let completed = false;
  const safeComplete = (val) => {
    if (!completed) {
      completed = true;
      onComplete(val);
    }
  };

  try {
    await ensureFreshToken();

    await fetchEventSource(`${process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000"}/stream`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      signal,
      body: JSON.stringify({
        is_new_chat: isnew_Chat,
        chatId,
        prompt
      }),

      async onopen(response) {
        if (response.ok) return;

        if (response.status === 401) {
          // ensureFreshToken already ran before connecting —
          // if we still get 401 here, refresh cookie is also dead
          onChunk("\n[Error]: Session expired. Please log in again.");
          safeComplete(false);
          throw new FatalError("auth_failed");
        }

        if (response.status === 429) {
          onChunk("\n[Error]: Rate limit exceeded. Please try again later.");
          safeComplete(false);
          throw new FatalError("rate_limit");
        }

        if (response.status === 503) {
          onChunk("\n[Error]: Model is overloaded. Please try again later.");
          safeComplete(false);
          throw new FatalError("service_unavailable");
        }

        if (response.status >= 500) {
          onChunk("\n[Error]: Server error. Please try again later.");
          safeComplete(false);
          throw new FatalError("server_error");
        }

        if (response.status >= 400) {
          onChunk("\n[Error]: Request failed. Please try again.");
          safeComplete(false);
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
          // ✅ No tool_name on complete — backend sends content/meta_data/toolcalls
          if (isnew_Chat) {
            user_contextStore.setState((state) => ({
              ...state,
              updateHistory: !state.updateHistory
            }));
          }
          safeComplete(false);
        }

        if (data.type === 'aborted') {
          safeComplete(false);
        }

        if (data.type === 'error') {
          const { status } = data;
          console.error("Server-sent error:", status);

          // ✅ Backend sends str(error_code) so compare as strings
          // but also coerce to string just in case
          const code = String(status);

          if (code === "429") {
            onChunk("\n[Error]: Rate limit exceeded. Please try again after recharging keys.");
          } else if (code === "503") {
            onChunk("\n[Error]: Model is overloaded. Please try again later.");
          } else if (code === "500") {
            onChunk("\n[Error]: Internal server error. Please try again later.");
          } else if (code === "ConnectError") {
            onChunk("\n[Error]: No internet connection. Please check your connection.");
          } else {
            onChunk(`\n[Error]: Something went wrong (${code ?? 'unknown'}).`);
          }

          safeComplete(false);
          throw new FatalError("server_sent_error");
        }
      },

      onerror(err) {
        // ✅ AbortError = user cancelled — don't show error, just clean up
        if (err.name === 'AbortError') {
          safeComplete(false); // safeComplete guards against double-fire
          throw err;
        }

        // FatalError already handled above — just stop retrying
        if (err instanceof FatalError) {
          throw err;
        }

        // Genuine network drop
        console.error("SSE connection error:", err);
        onChunk("\n[Error]: Connection lost. Please check your internet.");
        safeComplete(false);
        throw err; // stop retrying
      }
    });

  } catch (err) {
    if (err instanceof FatalError || err.name === 'AbortError') return;
    console.error("Unhandled stream error:", err);
  }
};

export const abortStream = async (chatId) => {
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000"}/abort/${chatId}`,
      { method: 'POST', credentials: 'include' }  // ✅ added credentials
    );
    const result = await response.json();
    console.log("Abort result:", result);
  } catch (error) {
    console.error("Error aborting stream:", error);
  }
};