
import React, { useState, useCallback, useMemo, useEffect } from "react";
import {
  Eye,
  EyeOff,
  Check,
  AlertCircle,
  Loader2,
  Zap,
} from "lucide-react";
import { user_contextStore } from "@/services/contextStrore";
import { saveProviderKey } from "@/services/fetch_info";
import { useRouter } from "next/navigation";

// ─── Static provider display data ─────────────────────────────────────────────
// Connection status comes from the Zustand store, NOT from this array.
// Only visual metadata lives here: dot color, description, model list.
export const DEFAULT_PROVIDERS = [
  {
    id: "google_ai_studio",
    name: "Google",
    dot: "#60a5fa",
    description: "Best for multimodal reasoning and long-context tasks",
    models: [
      { name: "Gemini 2.5 Flash", note: "Fast, cheap — primary driver for most tasks", thinking: true, vision: true, context: "1M" },
      { name: "Gemini 2.5 Flash Lite", note: "Ultra-lightweight, lowest cost per token", thinking: false, vision: true, context: "1M" },
      { name: "Gemini 2.5 Pro", note: "Strongest reasoning, best for complex chains", thinking: true, vision: true, context: "2M" },
    ],
  },
  {
    id: "groq",
    name: "Groq",
    dot: "#fb923c",
    description: "Best for ultra-low-latency inference",
    models: [
      { name: "Llama 3.3 70B", note: "Strong general-purpose, sub-second responses", thinking: false, vision: false, context: "128K" },
      { name: "Llama 3.1 8B Instant", note: "Tiny and fast, good for simple routing", thinking: false, vision: false, context: "128K" },
    ],
  },
  {
    id: "cerebras",
    name: "Cerebras",
    dot: "#c084fc",
    description: "Best for raw throughput on open models",
    models: [
      { name: "Llama 4 Scout", note: "High throughput, strong fallback option", thinking: false, vision: false, context: "128K" },
      { name: "Llama 3.3 70B", note: "Same weights as Groq, different latency profile", thinking: false, vision: false, context: "128K" },
    ],
  },
  {
    id: "mistral",
    name: "Mistral",
    dot: "#2dd4bf",
    description: "Best for efficient multilingual tasks",
    models: [
      { name: "Mistral Large", note: "Capable generalist, solid multilingual support", thinking: false, vision: false, context: "128K" },
      { name: "Mistral Small", note: "Lightweight fallback for simple queries", thinking: false, vision: false, context: "32K" },
    ],
  },
  {
    id: "openrouter_free",
    name: "OpenRouter",
    dot: "#f472b6",
    description: "Best for accessing frontier models through one key",
    models: [
      { name: "Claude Sonnet 4.6", note: "Frontier reasoning via OpenRouter passthrough", thinking: true, vision: true, context: "200K" },
      { name: "GPT-5.1", note: "Alternate frontier model for comparison runs", thinking: true, vision: true, context: "256K" },
    ],
  },
];

// ─── Injected CSS ─────────────────────────────────────────────────────────────
const INJECTED_CSS = `
@keyframes alfredIn {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}
.alfred-scroll::-webkit-scrollbar { width: 4px; }
.alfred-scroll::-webkit-scrollbar-track { background: transparent; }
.alfred-scroll::-webkit-scrollbar-thumb {
  background: rgba(255,255,255,0.08);
  border-radius: 999px;
}
.alfred-scroll::-webkit-scrollbar-thumb:hover {
  background: rgba(255,255,255,0.15);
}
.alfred-grain {
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='80'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.45'/%3E%3C/svg%3E");
  mix-blend-mode: overlay;
}
`;

// ─── Capsule badge (Thinking / Vision) ────────────────────────────────────────
function Capsule({ label, active }) {
  return (
    <span
      className={`inline-flex items-center rounded-md px-1.5 py-[2px] text-[10px] font-medium tracking-wide border transition-colors duration-150 ${
        active
          ? "border-violet-500/30 bg-violet-500/10 text-violet-300"
          : "border-white/5 bg-white/[0.02] text-white/[0.22]"
      }`}
    >
      {label}
    </span>
  );
}

export function ModelManagerTable({
  providers = DEFAULT_PROVIDERS,
  onSaveKey,
}) {
  const router = useRouter();

  useEffect(() => {
    user_contextStore.getState().actions.fetchUserInfo(router);
  }, []);

  const connectedProviders =
    user_contextStore((state) => state.connected_providers) ?? [];

  const connectedMap = useMemo(() => {
    const map = {};
    connectedProviders.forEach((p) => {
      map[p.provider] = p;
    });
    return map;
  }, [connectedProviders]);

  // ── Local UI state ────────────────────────────────────────────
  const [keys, setKeys] = useState({});
  const [showKeys, setShowKeys] = useState({});
  const [saveStates, setSaveStates] = useState({}); // null | "saving" | "success" | "error"

  // ────────────────────────────────────────────────────────────────
  // Handlers
  // ────────────────────────────────────────────────────────────────
  const handleKeyChange = useCallback((id, value) => {
    setKeys((prev) => ({ ...prev, [id]: value }));
    setSaveStates((prev) => (prev[id] ? { ...prev, [id]: null } : prev));
  }, []);

  const toggleShowKey = useCallback((id) => {
    setShowKeys((prev) => ({ ...prev, [id]: !prev[id] }));
  }, []);

  const handleSave = useCallback(
    async (provider) => {
      const key = keys[provider.id]?.trim();
      if (!key || key.length < 8) return;
      setSaveStates((prev) => ({ ...prev, [provider.id]: "saving" }));
      try {
        const result = await saveProviderKey(provider.id, key);
        const current =
          user_contextStore.getState().connected_providers || [];
        user_contextStore.setState({
          connected_providers: [
            ...current.filter((p) => p.provider !== provider.id),
            result,
          ],
        });
        setKeys((prev) => ({ ...prev, [provider.id]: "" }));
        setSaveStates((prev) => ({ ...prev, [provider.id]: "success" }));
        onSaveKey?.(provider.name, result.key_hint);
        setTimeout(() => {
          setSaveStates((prev) => ({ ...prev, [provider.id]: null }));
        }, 1500);
      } catch (err) {
        console.error(`[Alfred] Failed to save ${provider.name} key:`, err);
        setSaveStates((prev) => ({ ...prev, [provider.id]: "error" }));
        setTimeout(() => {
          setSaveStates((prev) => ({ ...prev, [provider.id]: null }));
        }, 3000);
      }
    },
    [keys, onSaveKey]
  );

  // ── Validation helpers ────────────────────────────────────────
  const getKey = (id) => keys[id] || "";
  const isDirty = (id) => getKey(id).trim().length > 0;
  const isValid = (id) => {
    const k = getKey(id).trim();
    return k.length >= 8 && k.length <= 256;
  };

  // ================================================================
  // Render
  // ================================================================
  return (
    <>
      <style>{INJECTED_CSS}</style>
      <div
        className="h-screen flex flex-col overflow-hidden font-sans antialiased"
        style={{ background: "#0a0a0b", color: "#fff" }}
      >
        {/* ─────────────────────────────────────────────────────
            Header — logo + title only
        ───────────────────────────────────────────────────── */}
        <header
          className="flex items-center px-6 lg:px-8 py-5 lg:py-6 shrink-0"
          style={{ animation: "alfredIn 400ms ease-out both" }}
        >
          <div className="flex items-center gap-3">
            <div
              className="flex items-center justify-center w-9 h-9 rounded-xl"
              style={{
                background: "rgba(124,58,237,0.15)",
                border: "1px solid rgba(139,92,246,0.2)",
              }}
            >
              <Zap className="w-[18px] h-[18px] text-violet-400" />
            </div>
            <div>
              <h1 className="text-[20px] font-semibold leading-tight">
                Providers
              </h1>
              <p className="text-[13px] text-white/40 mt-0.5">
                Manage API keys and model access for Alfred.
              </p>
            </div>
          </div>
        </header>

        {/* ─────────────────────────────────────────────────────
            Provider card grid
        ───────────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto min-h-0 px-6 lg:px-8 pb-8 alfred-scroll">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {providers.map((provider, i) => {
              const key = getKey(provider.id);
              const dirty = isDirty(provider.id);
              const valid = isValid(provider.id);
              const saveState = saveStates[provider.id];
              const showKey = !!showKeys[provider.id];
              const canSave =
                dirty && valid && saveState !== "saving" && saveState !== "success";
              const connection = connectedMap[provider.id];
              const modelCount = provider.models.length;

              return (
                <div
                  key={provider.id}
                  className="flex flex-col rounded-[28px] overflow-hidden"
                  style={{
                    background: "#08080a",
                    border: "1px solid rgba(255,255,255,0.08)",
                    boxShadow:
                      "0 0 0 1px rgba(0,0,0,0.4), 0 24px 48px -24px rgba(0,0,0,0.6)",
                    height: "min(70vh, 600px)",
                    minHeight: 500,
                    animation: `alfredIn 400ms ease-out ${i * 60}ms both`,
                  }}
                >
                  {/* ── Art zone — gradient glow in provider color ── */}
                  <div
                    className="relative shrink-0 px-5 pt-5"
                    style={{ height: 132 }}
                  >
                    <div
                      className="absolute inset-0"
                      style={{
                        background: `
                          radial-gradient(120% 140% at 15% 20%, ${provider.dot}55 0%, transparent 55%),
                          radial-gradient(100% 120% at 85% 80%, ${provider.dot}40 0%, transparent 60%),
                          linear-gradient(135deg, ${provider.dot}25, #0a0a0b 85%)
                        `,
                      }}
                    />
                    <div className="absolute inset-0 alfred-grain opacity-30" />

                    {/* Provider identity, top-right like the reference */}
                    <div className="relative z-10 flex items-start justify-between">
                      <span
                        className="w-2.5 h-2.5 rounded-full mt-0.5"
                        style={{
                          background: provider.dot,
                          boxShadow: `0 0 10px ${provider.dot}`,
                        }}
                      />
                      <div className="text-right">
                        <p className="text-[14px] font-semibold text-white leading-tight drop-shadow-sm">
                          {provider.name}
                        </p>
                        <p className="text-[14px] font-semibold text-white/85 leading-tight drop-shadow-sm">
                          Provider
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* ── Overlapping dark tab — name + description ── */}
                  <div
                    className="relative z-10 px-5 pt-4 pb-3 shrink-0"
                    style={{
                      background: "#101013",
                      borderTopLeftRadius: 22,
                      marginTop: -28,
                      boxShadow: "0 -8px 24px -16px rgba(0,0,0,0.5)",
                    }}
                  >
                    <h3 className="text-[16px] font-semibold text-white tracking-tight">
                      {provider.name}
                    </h3>
                    <p className="text-[13px] text-white/40 leading-relaxed mt-0.5">
                      {provider.description}
                    </p>
                  </div>

                  {/* ── Scrollable model list ───────────────── */}
                  <div
                    className="flex-1 overflow-y-auto px-5 pb-2 min-h-0 alfred-scroll"
                    style={{ background: "#101013" }}
                  >
                    <p
                      className="sticky top-0 text-[10px] uppercase font-medium text-white/30 tracking-[0.06em] py-1 mb-2"
                      style={{ background: "#101013" }}
                    >
                      Available models
                    </p>
                    <div className="flex flex-col gap-1.5 pb-2">
                      {provider.models.map((m) => (
                        <div
                          key={m.name}
                          className="rounded-xl border border-white/5 bg-white/[0.015] p-3 hover:bg-white/[0.03] hover:border-white/[0.08] transition-all duration-200"
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[13px] font-medium text-white/90">
                              {m.name}
                            </span>
                            <span className="text-[10px] text-white/25 font-mono">
                              {m.context}
                            </span>
                          </div>
                          <p className="text-[12px] text-white/40 leading-relaxed mb-2">
                            {m.note}
                          </p>
                          <div className="flex gap-1.5">
                            <Capsule label="Thinking" active={m.thinking} />
                            <Capsule label="Vision" active={m.vision} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* ── Stat footer — big number, like "05 Doc" / "1270 Notes" ── */}
                  <div
                    className="flex items-end justify-between px-5 py-4 shrink-0 border-t border-white/[0.06]"
                    style={{ background: "#0c0c0e" }}
                  >
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-[28px] font-bold text-white leading-none tabular-nums">
                        {String(modelCount).padStart(2, "0")}
                      </span>
                      <span className="text-[12px] text-white/35 font-medium">
                        {modelCount === 1 ? "Model" : "Models"}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span
                        className="w-1.5 h-1.5 rounded-full"
                        style={{
                          background: connection ? "#34d399" : "rgba(255,255,255,0.2)",
                          boxShadow: connection ? "0 0 6px #34d39990" : "none",
                        }}
                      />
                      <span
                        className={`text-[13px] font-medium ${
                          connection ? "text-emerald-400/90" : "text-white/35"
                        }`}
                      >
                        {connection ? `Connected · ${connection.key_hint}` : "Not connected"}
                      </span>
                    </div>
                  </div>

                  {/* ── API key section ─────────────────────── */}
                  <div
                    className="px-5 py-4 border-t border-white/[0.06] shrink-0"
                    style={{ background: "#08080a" }}
                  >
                    <p className="text-[10px] uppercase font-medium text-white/30 tracking-[0.06em] mb-2">
                      API key
                    </p>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <input
                          type={showKey ? "text" : "password"}
                          value={key}
                          onChange={(e) =>
                            handleKeyChange(provider.id, e.target.value)
                          }
                          placeholder={
                            connection
                              ? `Update ${provider.name} key...`
                              : `Enter ${provider.name} API key...`
                          }
                          spellCheck={false}
                          autoComplete="off"
                          className="w-full rounded-[10px] border border-white/10 py-2.5 pl-3.5 pr-9 text-[13px] text-white placeholder:text-white/30 outline-none transition-all duration-200"
                          style={{ background: "#0a0a0b" }}
                          onFocus={(e) => {
                            e.target.style.borderColor = "rgba(139,92,246,0.6)";
                            e.target.style.boxShadow =
                              "0 0 0 3px rgba(139,92,246,0.12)";
                          }}
                          onBlur={(e) => {
                            e.target.style.borderColor = "rgba(255,255,255,0.1)";
                            e.target.style.boxShadow = "none";
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => toggleShowKey(provider.id)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/50 transition-colors duration-150 cursor-pointer"
                          aria-label={showKey ? "Hide API key" : "Show API key"}
                        >
                          {showKey ? (
                            <EyeOff className="w-[15px] h-[15px]" />
                          ) : (
                            <Eye className="w-[15px] h-[15px]" />
                          )}
                        </button>
                      </div>

                      <button
                        onClick={() => handleSave(provider)}
                        disabled={!canSave && saveState !== "error"}
                        className="shrink-0 flex items-center justify-center gap-1.5 rounded-[10px] px-[18px] py-2.5 text-[13px] font-medium min-w-[80px] border-none transition-all duration-200 cursor-pointer disabled:cursor-not-allowed active:scale-[0.97]"
                        style={{
                          background:
                            saveState === "saving"
                              ? "#7c3aed"
                              : saveState === "success"
                                ? "rgba(52,211,153,0.15)"
                                : saveState === "error"
                                  ? "rgba(239,68,68,0.15)"
                                  : !dirty || !valid
                                    ? "rgba(255,255,255,0.04)"
                                    : "#7c3aed",
                          color:
                            saveState === "success"
                              ? "#6ee7b7"
                              : saveState === "error"
                                ? "#fca5a5"
                                : !dirty || !valid
                                  ? "rgba(255,255,255,0.25)"
                                  : "#fff",
                        }}
                      >
                        {saveState === "saving" ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : saveState === "success" ? (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            Saved
                          </>
                        ) : saveState === "error" ? (
                          <>
                            <AlertCircle className="w-3.5 h-3.5" />
                            Failed
                          </>
                        ) : (
                          "Save"
                        )}
                      </button>
                    </div>
                    {key.length > 0 && !isValid(provider.id) && (
                      <p className="text-[11px] text-amber-400/60 flex items-center gap-1 mt-2">
                        <AlertCircle className="w-3 h-3 shrink-0" />
                        Must be 8–256 characters
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* ── Footer ──────────────────────────────────────── */}
          <p
            className="text-center text-[12px] text-white/25 mt-6 mb-2"
            style={{
              animation: `alfredIn 400ms ease-out ${
                providers.length * 60 + 100
              }ms both`,
            }}
          >
            Keys are encrypted at rest and never leave your Alfred instance.
          </p>
        </div>
      </div>
    </>
  );
}