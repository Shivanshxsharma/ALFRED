import { useState, useEffect, useRef } from "react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import { Copy, Check } from "lucide-react";
import mermaid from "mermaid";
import { useShallow } from "zustand/shallow";
import { usechatStore } from "@/services/contextStrore";
import { ChartBlock } from "@/components/common/ChartBlock";

const FONT = "'IBM Plex Mono', monospace"

mermaid.initialize({
  startOnLoad: false,
  theme: "dark",
  themeVariables: {
    // primary — violet (matches chart COLORS[0])
    primaryColor: "#1a0533",
    primaryTextColor: "#e2e8f0",
    primaryBorderColor: "#7c3aed",

    // edges and lines — violet lighter
    lineColor: "#a78bfa",

    // secondary nodes — emerald tint (matches chart COLORS[1])
    secondaryColor: "#0a1a10",
    secondaryTextColor: "#e2e8f0",
    secondaryBorderColor: "#10b981",

    // tertiary — amber tint (matches chart COLORS[2])
    tertiaryColor: "#1a150a",
    tertiaryTextColor: "#e2e8f0",
    tertiaryBorderColor: "#f59e0b",

    // background
    background: "#000000",
    mainBkg: "#0d0d0d",
    clusterBkg: "#0d0d0d",
    edgeLabelBackground: "#000000",

    // node borders
    nodeBorder: "#7c3aed",

    // title
    titleColor: "#a78bfa",

    // fill types — rotate through chart color palette
    fillType0: "#1a0533",   // violet (COLORS[0])
    fillType1: "#0a1a10",   // emerald (COLORS[1])
    fillType2: "#1a1200",   // amber (COLORS[2])
    fillType3: "#0a0f1a",   // blue (COLORS[3])
    fillType4: "#1a0a0a",   // red (COLORS[4])
    fillType5: "#1a0a12",   // pink (COLORS[5])
    fillType6: "#0a1a1a",   // teal (COLORS[6])
    fillType7: "#1a0f0a",   // orange (COLORS[7])

    fontFamily: FONT,
    fontSize: "13px",
  },
  flowchart: {
    nodeSpacing: 60,
    rankSpacing: 80,
    curve: "basis",
    padding: 20,
    useMaxWidth: false,
  },
  sequence: {
    nodeSpacing: 80,
    actorMargin: 80,
    useMaxWidth: false,
  },
}) 

function sanitizeMermaid(code) {
  return code
    .replace(/\(([^)]*)\)/g, "$1")
    .replace(/^\s*(\d+)([A-Za-z])/gm, "$2$1")
    .replace(/\b(\d+)\[/g, "N$1[")
    .replace(/\b(\d+)\{/g, "N$1{")
    .replace(/\b(\d+)\(/g, "N$1(")
    .replace(/ --> (\d+)/g, " --> N$1")
    .replace(/ --> (\d+)\[/g, " --> N$1[")
}

// shared block shell — same design for both mermaid and chart
function BlockShell({ type, copied, hovered, onCopy, onMouseEnter, onMouseLeave, children }) {
  return (
    <div
      className="not-prose"
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      style={{
        position: "relative",
        width: "100%",
        margin: "12px 0",
        borderRadius: 10,
        border: "1px solid rgba(255,255,255,0.08)",
        background: "#000000",
        boxSizing: "border-box",
      }}
    >
      {/* badge */}
      <span style={{
        position: "absolute", top: 10, left: 12, zIndex: 10,
        fontSize: 11, fontFamily: FONT,
        color: "rgba(161,161,170,0.5)",
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.08)",
        padding: "2px 8px", borderRadius: 6,
      }}>
        {type}
      </span>

      {/* copy button */}
      <button
        onClick={onCopy}
        style={{
          position: "absolute", top: 8, right: 10, zIndex: 10,
          padding: "6px", borderRadius: 6,
          border: copied ? "1px solid rgba(124,58,237,0.3)" : "1px solid rgba(255,255,255,0.08)",
          background: copied ? "rgba(124,58,237,0.1)" : "rgba(24,24,27,0.6)",
          color: copied ? "#a78bfa" : "rgba(161,161,170,0.6)",
          cursor: "pointer",
          opacity: hovered || copied ? 1 : 0,
          transition: "all 0.2s ease",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}
      >
        {copied ? <Check size={13} /> : <Copy size={13} />}
      </button>

      {children}
    </div>
  )
}

// shared dot loader
function DotLoader() {
  return (
    <div style={{
      width: "100%",
      padding: "2rem",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
    }}>
      {[0, 1, 2].map(i => (
        <div key={i} style={{
          width: 5, height: 5, borderRadius: "50%",
          background: "rgba(167,139,250,0.5)",
          animation: "blockDot 1.2s ease-in-out infinite",
          animationDelay: `${i * 0.2}s`,
        }} />
      ))}
      <style>{`
        @keyframes blockDot {
          0%, 80%, 100% { transform: scale(0.6); opacity: 0.3; }
          40% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  )
}

// shared scroll wrapper
function ScrollWrap({ children }) {
  return (
    <div style={{
      width: "100%",
      overflowX: "auto",
      overflowY: "hidden",
      scrollbarWidth: "thin",
      scrollbarColor: "rgba(124,58,237,0.3) transparent",
    }}>
      {children}
    </div>
  )
}

function MermaidBlock({ code }) {
  const ref = useRef(null)
  const [error, setError] = useState(null)
  const [copied, setCopied] = useState(false)
  const [hovered, setHovered] = useState(false)
  const isStreaming = usechatStore(useShallow(state => state.isStreaming))

  useEffect(() => {
    if (!ref.current || !code?.trim()) return
    if (isStreaming) return

    const id = "mermaid-" + Math.random().toString(36).slice(2)
    const safeCode = sanitizeMermaid(code)

    mermaid.render(id, safeCode)
      .then(({ svg }) => {
        if (!ref.current) return
        ref.current.innerHTML = svg
        const svgEl = ref.current.querySelector("svg")
        if (svgEl) {
          svgEl.style.cssText = "display: block; min-width: 100%; height: auto;"
          svgEl.removeAttribute("height")
        }
        setError(null)
      })
      .catch((err) => {
        console.error("Mermaid render error:", err)
        setError(safeCode)
      })
  }, [code, isStreaming])   // ← isStreaming in deps — fires when streaming stops

  if (!code?.trim()) return null

  const copy = () => {
    navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // ← always render BlockShell so ref div is always mounted
  return (
    <BlockShell
      type="diagram"
      copied={copied} hovered={hovered}
      onCopy={copy}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {isStreaming ? (
        <DotLoader />
      ) : error ? (
        <>
          <div style={{
            marginTop: "2.5rem",
            borderTop: "1px solid rgba(239,68,68,0.15)",
            padding: "8px 12px 4px",
            fontSize: 11, fontFamily: FONT,
            color: "rgba(239,68,68,0.7)",
          }}>
            diagram parse error — raw code
          </div>
          <pre style={{
            padding: "0.5rem 1rem 1rem",
            margin: 0, fontSize: 11, fontFamily: FONT,
            color: "rgba(255,255,255,0.3)",
            whiteSpace: "pre-wrap", overflowX: "auto",
          }}>
            {error}
          </pre>
        </>
      ) : (
        <ScrollWrap>
          <div
            ref={ref}
            style={{
              minWidth: "100%",
              width: "max-content",
              padding: "2.5rem 1rem 1rem",
            }}
          />
        </ScrollWrap>
      )}
    </BlockShell>
  )
}

export function CodeBlock({ language, children }) {
  const [copied, setCopied] = useState(false);
  const [hovered, setHovered] = useState(false);
  const isStreaming = usechatStore(useShallow(state => state.isStreaming))

  if (language === "mermaid") {
    return <MermaidBlock code={String(children || "").trim()} />
  }

  if (language === "chart") {
    const raw = String(children || "").trim()
    try {
      const data = JSON.parse(raw)
      return <ChartBlock data={data} />
    } catch {
      return (
        <div style={{
          padding: "1rem", borderRadius: 8, margin: "12px 0",
          border: "1px solid rgba(239,68,68,0.2)",
          background: "rgba(239,68,68,0.05)",
          fontSize: 11, fontFamily: FONT,
          color: "rgba(239,68,68,0.6)",
        }}>
          {isStreaming
            ? <DotLoader />
            : "chart parse error — invalid JSON"
          }
        </div>
      )
    }
  }

  const showLang = language && language !== "text";

  const copy = () => {
    navigator.clipboard.writeText(children);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
<div
  className="relative my-3 rounded-lg max-w-full overflow-hidden border border-white/8"
  style={{ WebkitOverflowScrolling: "touch" }}
  onMouseEnter={() => setHovered(true)}
  onMouseLeave={() => setHovered(false)}
>
      {showLang && (
        <span className="absolute top-2.5 left-3 z-10 text-xs font-mono px-2 py-0.5 rounded-md bg-white/5 border border-white/8 text-zinc-500">
          {language}
        </span>
      )}

      <button
        onClick={copy}
        className={`absolute top-2 right-2.5 z-10 p-1.5 rounded-md border transition-all duration-200
          ${copied
            ? "opacity-100 border-violet-700/30 text-violet-400 bg-violet-700/10"
            : "border-white/8 text-zinc-500 bg-zinc-900/60 hover:text-white hover:border-white/20"
          }
          ${hovered || copied ? "opacity-100" : "opacity-0"}
        `}
      >
        {copied ? <Check size={13} /> : <Copy size={13} />}
      </button>

      <SyntaxHighlighter
        language={language}
        style={vscDarkPlus}
        PreTag="div"
customStyle={{
  margin: 0,
  borderRadius: 0,
  padding: showLang ? "3rem 1.25rem 1rem" : "1rem 1.25rem",
  fontSize: "13px",
  lineHeight: "1.7",
  background: "transparent",
  overflowX: "auto",
  wordBreak: "normal",
  overflowWrap: "normal",
  whiteSpace: "pre",
}}
      >
        {children}
      </SyntaxHighlighter>
    </div>
  );
}