"use client"

import { Cpu, Plus, SlidersHorizontal } from "lucide-react"
import { useState } from "react"

export default function VioletButton({
  label = "Add new",
  icon = "plus",
  size = 52,
  bare = false,
  onClick,
}) {
  const [hovered, setHovered] = useState(false)
  const [active, setActive] = useState(false)

  const icons = {
    plus: <Plus size={size * 0.6} strokeWidth={2.5} />,
    cpu: <Cpu size={size * 0.5} strokeWidth={1.5} />,
    tools: <SlidersHorizontal size={size * 0.6} strokeWidth={2.5} />,
  }

  const scale = size / 52
  const collapsedPx = size
  const expandedPx = Math.round(140 * scale)
  const heightPx = size
  const fontSizeEm = (2 * scale).toFixed(2)
  const textSizeEm = (1 * scale).toFixed(2)
  const iconPadPx = Math.round(14 * scale)
  const textPadPx = Math.round(16 * scale)

  const btn = (
    <button
      aria-label={label}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => {
        setHovered(false)
        setActive(false)
      }}
      onMouseDown={() => setActive(true)}
      onMouseUp={() => setActive(false)}
      onClick={onClick}
      style={{
        width: hovered ? `${expandedPx}px` : `${collapsedPx}px`,
        height: `${heightPx}px`,
        fontSize: `${fontSizeEm}em`,
        transform: active ? "translate(2px, 2px)" : "none",
        flexShrink: 0,
      }}
      className={[
        // layout
        "relative flex items-center justify-start overflow-hidden",
        // shape — consistent rounded corners
        "rounded-[20px]",
        // border — consistent violet ring
        "border border-violet-700/70",
        // bg — consistent dark purple
        active
          ? "bg-violet-900"
          : hovered
          ? "bg-violet-950/90"
          : "bg-[#110d1f]",
        // motion
        "transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]",
        "outline-none cursor-pointer",
      ].join(" ")}
    >
      {/* icon container — fixed width, centered content */}
      <span
        style={{
          width: `${collapsedPx}px`,
          height: `${heightPx}px`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
        className="text-violet-200 select-none"
        aria-hidden="true"
      >
        {icons[icon] || icons["plus"]}
      </span>

      {/* label — fixed animation timing */}
      <span
        style={{
          maxWidth: hovered ? `${expandedPx - collapsedPx - textPadPx}px` : "0px",
          opacity: hovered ? 1 : 0,
          paddingRight: hovered ? `${textPadPx}px` : "0px",
          fontSize: `${textSizeEm}em`,
          transition: "opacity 0.3s ease-[cubic-bezier(0.4,0,0.2,1)], max-width 0.3s ease-[cubic-bezier(0.4,0,0.2,1)], padding 0.3s ease-[cubic-bezier(0.4,0,0.2,1)]",
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