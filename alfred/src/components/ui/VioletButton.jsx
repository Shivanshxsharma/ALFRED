"use client"

import { DiamondPlus, Plus } from "lucide-react"
import { useState } from "react"

export default function VioletButton({
  label = "Add new",
  icon = "+",
  size = 52,
  bare = false,
  onClick,
}) {
  const [hovered, setHovered] = useState(false)
  const [active, setActive]   = useState(false)

  const scale        = size / 52
  const collapsedPx  = size-1;
  const expandedPx   = Math.round(140 * scale)
  const heightPx     = size
  const fontSizeEm   = (2  * scale).toFixed(2)
  const textSizeEm   = (1 * scale).toFixed(2)
  const signPadPx    = Math.round(14 * scale)
  const textPadPx    = Math.round(16 * scale)

  const btn = (
    <button
      aria-label={label}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); setActive(false) }}
      onMouseDown={() => setActive(true)}
      onMouseUp={() => setActive(false)}
      onClick={onClick}
      style={{
        width:        hovered ? `${expandedPx}px` : `${collapsedPx}px`,
        height:       `${heightPx}px`,
        fontSize:     `${fontSizeEm}em`,
        transform:    active ? "translate(2px,2px)" : "none",
        flexShrink:   0,
      }}
      className={[
        // layout
        "relative flex items-center justify-start overflow-hidden",
        // shape — pill-ish matching the screenshot
        hovered ? "rounded-[999px]" : "rounded-[20px]",
        // border — thin violet ring with a faint outer glow
        "border border-violet-700/70",
        // bg — very dark purple, matches screenshot
        active  ? "bg-violet-900"
                : hovered ? "bg-violet-950/90" : "bg-[#110d1f]",
        // motion
        "transition-all duration-300 ease-[cubic-bezier(.4,0,.2,1)]",
        "outline-none cursor-pointer",
      ].join(" ")}
    >
      {/* icon */}
<span
  style={{
    minWidth:    `${collapsedPx}px`,   // always holds exactly one button-width
    paddingLeft: hovered ? `${signPadPx}px` : "0px",
    transition:  "padding .35s",
  }}
  className="flex items-center justify-center shrink-0 text-violet-200 select-none"
  aria-hidden="true"
>
  <Plus size={size * 0.6} strokeWidth={2.5} />
</span>

{/* label — no longer absolute */}
<span
  style={{
    maxWidth:     hovered ? `${expandedPx - collapsedPx}px` : "0px",
    opacity:      hovered ? 1 : 0,
    paddingRight: hovered ? `${textPadPx}px` : "0px",
    fontSize:     `${textSizeEm}em`,
    transition:   "opacity .25s, max-width .35s, padding .35s",
  }}
  className="text-violet-100 font-medium whitespace-nowrap select-none tracking-wide overflow-hidden"
>
  {label}
</span>
    </button>
  )

  if (bare) return btn

  return (
    <div className="flex items-center justify-center py-12">
      {btn}
    </div>
  )
}
