"use client"

import { useState, useRef, useEffect } from "react"
import { Globe2, SlidersHorizontal } from "lucide-react"
import { Switch } from "@/components/ui/switch"
import { cn } from "@/lib/utils"
import { usechatStore } from "@/services/contextStrore"

const TOOL_TIPS = {
  web_search_enabled: "Allow Alfred to search the web for real-time information.",
  remembring_enabled:
    "Allow Alfred to build & access long-term memory across conversations. Slightly increases token usage.",
}

const SIZE     = 30
const EXPANDED = 120
const SIGN_PAD = 10
const TEXT_PAD = 12

export default function ToolsContextMenu({ toggleTools, toggleTool }) {
  const [open, setOpen]       = useState(false)
  const [hovered, setHovered] = useState(false)
  const [active, setActive]   = useState(false)
  const [tipId, setTipId]     = useState(null)
  const menuRef    = useRef(null)
  const triggerRef = useRef(null)
  const tools = toggleTools

  const toggle = (id) => toggleTool(id)

  useEffect(() => {
    const handler = (e) => {
      if (
        menuRef.current    && !menuRef.current.contains(e.target) &&
        triggerRef.current && !triggerRef.current.contains(e.target)
      ) setOpen(false)
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  return (
    <div className="relative">
      {open && (
        <div
          ref={menuRef}
          role="menu"
          aria-label="Tools"
          className={cn(
            "absolute bottom-[calc(100%+10px)] left-1/2 -translate-x-1/2 z-50",
            "w-56 p-1",
            "bg-zinc-900 border border-zinc-700 rounded-xl",
            "animate-in fade-in-0 zoom-in-95 slide-in-from-bottom-2 duration-150",
          )}
          style={{ transformOrigin: "bottom center" }}
        >
          <p className="text-[11px] text-zinc-500 uppercase tracking-widest px-2 pt-1.5 pb-1 select-none">
            Tools
          </p>

          {tools.map((tool, i) => (
            <div key={tool.id} className="relative">
              {i === 2 && <div className="h-px bg-zinc-800 my-1" />}

              {/* ── Tooltip ── */}
              {/* ── Tooltip ── */}
{tipId === tool.id && TOOL_TIPS[tool.id] && (
  <div
    className={cn(
      "absolute bottom-[calc(100%+8px)] left-1/2 -translate-x-1/2 z-[60]",
      "w-52 px-3 py-2 rounded-lg",
      "bg-zinc-900 border border-violet-600/60",
      "shadow-[0_4px_20px_rgba(0,0,0,0.4)]",
      "pointer-events-none",
      "animate-in fade-in-0 zoom-in-95 duration-150",
    )}
  >
    <p className="text-[11.5px] leading-[1.45] text-zinc-300">
      {TOOL_TIPS[tool.id]}
    </p>
    {/* Caret */}
    <div
      className="absolute left-1/2 -translate-x-1/2 -bottom-[5px]
                 w-[10px] h-[10px] rotate-45
                 bg-zinc-900 border-b border-r border-violet-600/60"
    />
  </div>
)}
              <div
                className="flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-zinc-800 transition-colors"
                role="menuitem"
                onMouseEnter={() => setTipId(tool.id)}
                onMouseLeave={() => setTipId(null)}
              >
                <div className="flex items-center gap-2">
                  <tool.icon size={16} className="text-violet-400" />
                  <span className="text-[13px] text-zinc-200 select-none">{tool.label}</span>
                </div>
                <Switch
                  checked={tool.enabled}
                  onCheckedChange={() => toggle(tool.id)}
                  aria-label={`Toggle ${tool.label}`}
                  className="data-[state=checked]:bg-violet-600 data-[state=unchecked]:bg-zinc-600"
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Trigger button — unchanged */}
      <button
        ref={triggerRef}
        aria-label="Toggle tools"
        aria-haspopup="true"
        aria-expanded={open}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => { setHovered(false); setActive(false) }}
        onMouseDown={() => setActive(true)}
        onMouseUp={() => setActive(false)}
        onClick={() => setOpen(o => !o)}
        style={{
          width:      hovered ? `${EXPANDED}px` : `${SIZE}px`,
          height:     `${SIZE}px`,
          transform:  active ? "translate(2px,2px)" : "none",
          flexShrink: 0,
        }}
        className={cn(
          "relative flex items-center justify-start overflow-hidden outline-none cursor-pointer",
          "border border-violet-700/70",
          hovered ? "rounded-[999px]" : "rounded-[20px]",
          active  ? "bg-violet-900"
          : hovered ? "bg-violet-950/90" : "bg-[#110d1f]",
          "transition-all duration-300 ease-[cubic-bezier(.4,0,.2,1)]",
        )}
      >
        <span
          style={{
            minWidth:    `${SIZE}px`,
            paddingLeft: hovered ? `${SIGN_PAD}px` : "0px",
            transition:  "padding .35s",
          }}
          className="flex items-center justify-center shrink-0 text-violet-200 select-none"
          aria-hidden="true"
        >
          <SlidersHorizontal size={SIZE * 0.45} strokeWidth={2} />
        </span>
        <span
          style={{
            maxWidth:     hovered ? `${EXPANDED - SIZE}px` : "0px",
            opacity:      hovered ? 1 : 0,
            paddingRight: hovered ? `${TEXT_PAD}px` : "0px",
            fontSize:     "13px",
            transition:   "opacity .25s, max-width .35s, padding .35s",
          }}
          className="text-violet-100 font-medium whitespace-nowrap select-none tracking-wide overflow-hidden"
        >
          Toggle tools
        </span>
      </button>
    </div>
  )
}