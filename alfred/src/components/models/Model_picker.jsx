"use client"

import { useState, useRef, useEffect } from "react"
import { Cpu, ChevronRight, Brain, Eye, Info } from "lucide-react"
import { cn } from "@/lib/utils"
import { usechatStore, user_contextStore } from "@/services/contextStrore"
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip"
import { useRouter } from "next/navigation"
import { useShallow } from "zustand/shallow"

const PROVIDER_DOT = {
  google_ai_studio: "#60a5fa",
  groq: "#fb923c",
  cerebras: "#c084fc",
  mistral: "#2dd4bf",
  openrouter_free: "#f472b6",
  openrouter_paid: "#f472b6",
}

const PROVIDER_LABEL = {
  google_ai_studio: "Google",
  groq: "Groq",
  cerebras: "Cerebras",
  mistral: "Mistral",
  openrouter_free: "OpenRouter",
  openrouter_paid: "OpenRouter",
}

const SIZE = 30
const EXPANDED = 130
const TEXT_PAD = 12

export function ModelPicker() {
  const [open, setOpen] = useState(false)
  const [hovered, setHovered] = useState(false)
  const [active, setActive] = useState(false)
  const menuRef = useRef(null)
  const triggerRef = useRef(null)
  const router = useRouter()

  useEffect(() => {
    const handler = (e) => {
      if (
        menuRef.current && !menuRef.current.contains(e.target) &&
        triggerRef.current && !triggerRef.current.contains(e.target)
      ) setOpen(false)
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  const availableModels = user_contextStore(useShallow((state) => state.connected_models))
  const selectedModel = usechatStore(useShallow((state) => state.selectedModel))
  const setSelectedModel = usechatStore(useShallow((state) => state.actions.setSelectedModel))
  const models = Object.entries(availableModels).map(([modelId, meta]) => ({ id: modelId, ...meta }))
  const isEmpty = models.length === 0
  const selectedMeta = models.find((m) => m.id === selectedModel)

  return (
    <div className="relative">
      {open && (
        <div
          ref={menuRef}
          role="radiogroup"
          aria-label="Select model"
          className={cn(
            "absolute bottom-[calc(100%+10px)] left-1/2 -translate-x-1/2 z-50",
            "w-72 p-1",
            "bg-zinc-900 border border-zinc-700 rounded-xl",
            "animate-in fade-in-0 zoom-in-95 slide-in-from-bottom-2 duration-150",
          )}
          style={{ transformOrigin: "bottom center" }}
        >
          <div className="flex items-center justify-between px-2 pt-1.5 pb-1">
            <p className="text-[11px] text-zinc-500 uppercase tracking-widest select-none">
              Models
            </p>
            <button
              onClick={() => { setOpen(false); router.push("/settings/models") }}
              className="flex items-center gap-0.5 text-[11px] text-violet-400 hover:text-violet-300 transition-colors cursor-pointer"
            >
              Configure
              <ChevronRight size={12} />
            </button>
          </div>

          <div
            className="flex flex-col gap-0.5 overflow-y-auto model-picker-scroll px-0.5 pb-0.5"
            style={{ maxHeight: 260 }}
          >
            {isEmpty && (
              <p className="text-[12px] text-zinc-500 text-center px-3 py-5 leading-relaxed">
                No models available yet.
                <br />
                Connect a provider to get started.
              </p>
            )}

            {models.map((model) => {
              const isSelected = model.id === selectedModel
              return (
                <Tooltip key={model.id} delayDuration={300}>
                  <TooltipTrigger asChild>
                    <button
                      role="radio"
                      aria-checked={isSelected}
                      onClick={() => { setSelectedModel(model.id); setOpen(false) }}
                      className={cn(
                        "flex items-center gap-2.5 px-2 py-2 rounded-lg transition-colors cursor-pointer text-left w-full",
                        isSelected ? "bg-violet-500/10" : "hover:bg-zinc-800",
                      )}
                    >
                      <span
                        className="flex items-center justify-center w-3.5 h-3.5 rounded-full border shrink-0"
                        style={{ borderColor: isSelected ? "#a78bfa" : "#52525b" }}
                      >
                        {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-violet-400" />}
                      </span>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span
                            className="w-1.5 h-1.5 rounded-full shrink-0"
                            style={{
                              background: PROVIDER_DOT[model.provider] ?? "#71717a",
                              boxShadow: `0 0 6px ${PROVIDER_DOT[model.provider] ?? "#71717a"}70`,
                            }}
                          />
                          <span className={cn("text-[13px] truncate", isSelected ? "text-zinc-100" : "text-zinc-300")}>
                            {model.id}
                          </span>
                        </div>
                        <p className="text-[11px] text-zinc-500 truncate">
                          {PROVIDER_LABEL[model.provider] ?? model.provider}
                          {model.context ? ` · ${model.context}` : ""}
                        </p>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        {model.thinking && <Brain size={12} className="text-violet-500/60" />}
                        {model.vision && <Eye size={12} className="text-violet-500/60" />}
                        <Info size={11} className="text-zinc-600" />
                      </div>
                    </button>
                  </TooltipTrigger>

                  <TooltipContent side="left" className="bg-zinc-900 text-zinc-200 border border-zinc-700 px-3 py-2.5">
                    <div className="flex flex-col gap-1 text-left min-w-[160px]">
                      <p className="text-[12px] font-medium text-zinc-100">{model.id}</p>
                      <div className="h-px bg-zinc-800 my-0.5" />
                      <Row label="Provider" value={PROVIDER_LABEL[model.provider] ?? model.provider} />
                      <Row label="Context" value={model.context ?? "—"} />
                      {model.tpm && <Row label="Tokens/min" value={model.tpm} />}
                      {model.rpm && <Row label="Req/min" value={String(model.rpm)} />}
                      {model.rps && <Row label="Req/sec" value={String(model.rps)} />}
                      <Row label="Thinking" value={model.thinking ? "Yes" : "No"} />
                      <Row label="Vision" value={model.vision ? "Yes" : "No"} />
                      <Row label="Tools" value={model.supports_tools === false ? "No" : "Yes"} />
                    </div>
                  </TooltipContent>
                </Tooltip>
              )}
            )}
          </div>
        </div>
      )}

      {/* Trigger — always expanded now */}
      <button
        ref={triggerRef}
        aria-label="Select model"
        aria-haspopup="true"
        aria-expanded={open}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => { setHovered(false); setActive(false) }}
        onMouseDown={() => setActive(true)}
        onMouseUp={() => setActive(false)}
        onClick={() => setOpen((o) => !o)}
        style={{
          width: `${EXPANDED}px`,
          height: `${SIZE}px`,
          transform: active ? "translate(2px, 2px)" : "none",
          flexShrink: 0,
        }}
        className={cn(
          "relative flex items-center justify-start overflow-hidden outline-none cursor-pointer",
          "border border-violet-700/70",
          "rounded-[20px]",
          active ? "bg-violet-900"
            : hovered ? "bg-violet-950/90" : "bg-[#110d1f]",
          "transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]",
        )}
      >
        <span
          style={{
            width: `${SIZE}px`,
            height: `${SIZE}px`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
          className="text-violet-200 select-none"
          aria-hidden="true"
        >
          <Cpu size={SIZE * 0.5} strokeWidth={2} />
        </span>

        <span
          style={{
            maxWidth: `${EXPANDED - SIZE - TEXT_PAD}px`,
            opacity: 1,
            paddingRight: `${TEXT_PAD}px`,
            fontSize: "13px",
          }}
          className="text-violet-100 font-medium whitespace-nowrap select-none tracking-wide overflow-hidden truncate"
        >
          {selectedMeta ? selectedMeta.id : "Select model"}
        </span>
      </button>

      <style>{`
        .model-picker-scroll::-webkit-scrollbar { width: 4px; }
        .model-picker-scroll::-webkit-scrollbar-track { background: transparent; }
        .model-picker-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); border-radius: 999px; }
        .model-picker-scroll::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.15); }
      `}</style>
    </div>
  )
}

function Row({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-[11px] text-zinc-500">{label}</span>
      <span className="text-[11px] text-zinc-300 font-medium">{value}</span>
    </div>
  )
}