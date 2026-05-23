import { useState, useEffect, useRef } from "react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import { Copy, Check } from "lucide-react";
import mermaid from "mermaid";
import { useShallow } from "zustand/shallow";
import { usechatStore } from "@/services/contextStrore";
import { ChartBlock } from "./ChartBlock";
// import { i } from "framer-motion/dist/types.d-DagZKalS";

mermaid.initialize({
  startOnLoad: false,
  theme: "dark",
  themeVariables: {
    primaryColor: "#7c3aed",
    primaryTextColor: "#e2e8f0",
    primaryBorderColor: "#6d28d9",
    lineColor: "#a78bfa",
    secondaryColor: "#1e1b4b",
    tertiaryColor: "#0f0a1e",
    background: "#000000",
    mainBkg: "#0d0d0d",
    nodeBorder: "#7c3aed",
    clusterBkg: "#0d0d0d",
    titleColor: "#a78bfa",
    edgeLabelBackground: "#000000",
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: "13px",
    fillType0: "#1a0533",
    fillType1: "#0a0a1a",
    fillType2: "#0f1a2e",
    fillType3: "#1a1a0a",
    fillType4: "#0a1a0a",
    fillType5: "#1a0a0a",
    tertiaryTextColor: "#e2e8f0",
    tertiaryBorderColor: "#6d28d9",
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
});

function sanitizeMermaid(code) {
  return code
    .replace(/\(([^)]*)\)/g, "$1")           // remove parentheses
    .replace(/^\s*(\d+)([A-Za-z])/gm, "$2$1") // flip "1A" → "A1"
    .replace(/\b(\d+)\[/g, "N$1[")            // "1[" → "N1["
    .replace(/\b(\d+)\{/g, "N$1{")            // "1{" → "N1{"
    .replace(/\b(\d+)\(/g, "N$1(")            // "1(" → "N1("
    .replace(/ --> (\d+)/g, " --> N$1")        // fix edge targets too
    .replace(/ --> (\d+)\[/g, " --> N$1[")
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
      // keep SVG's natural width, just make height auto
      const naturalWidth = svgEl.getAttribute("width") || "100%"
      svgEl.style.cssText = `
        display: block;
        min-width: 100%;
        height: auto;
      `
      svgEl.removeAttribute("height")
      // keep width attribute so SVG renders at its natural size
    }
    setError(null)
  })
      .catch((err) => {
        console.error("Mermaid render error:", err)
        setError(safeCode)
      })
  }, [code, isStreaming])

  if (!code?.trim()) return null

  const copy = () => {
    navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

if (isStreaming) {
  return (
    <div style={{
      width: "100%",
      background: "#000000",
      border: "1px solid rgba(255,255,255,0.08)",
      borderRadius: 10,
      padding: "2rem",
      margin: "12px 0",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
    }}>
      {[0, 1, 2].map(i => (
        <div
          key={i}
          style={{
            width: 5,
            height: 5,
            borderRadius: "50%",
            background: "rgba(167,139,250,0.5)",
            animation: "mermaidDot 1.2s ease-in-out infinite",
            animationDelay: `${i * 0.2}s`,
          }}
        />
      ))}
      <style>{`
        @keyframes mermaidDot {
          0%, 80%, 100% { transform: scale(0.6); opacity: 0.3; }
          40% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  )
}

  if (error) {
    return (
      <div style={{
        width: "100%", margin: "12px 0", borderRadius: 10,
        border: "1px solid rgba(239,68,68,0.2)",
        background: "rgba(239,68,68,0.05)", overflow: "hidden",
      }}>
        <div style={{
          padding: "8px 12px",
          borderBottom: "1px solid rgba(239,68,68,0.15)",
          fontSize: 11, fontFamily: "'IBM Plex Mono', monospace",
          color: "rgba(239,68,68,0.7)",
        }}>
          diagram parse error — raw code
        </div>
        <pre style={{
          padding: "1rem", margin: 0, fontSize: 11,
          fontFamily: "'IBM Plex Mono', monospace",
          color: "rgba(255,255,255,0.3)",
          whiteSpace: "pre-wrap", overflowX: "auto",
        }}>
          {error}
        </pre>
      </div>
    )
  }

return (
  <div
    className="mermaid-wrap not-prose"
    onMouseEnter={() => setHovered(true)}
    onMouseLeave={() => setHovered(false)}
    style={{
      position: "relative",
      width: "100%",
      margin: "12px 0",
      borderRadius: 10,
      border: "1px solid rgba(255,255,255,0.08)",
      background: "#000000",
    }}
  >
    {/* badge */}
    <span style={{
      position: "absolute", top: 10, left: 12, zIndex: 10,
      fontSize: 11, fontFamily: "'IBM Plex Mono', monospace",
      color: "rgba(161,161,170,0.5)",
      background: "rgba(255,255,255,0.04)",
      border: "1px solid rgba(255,255,255,0.08)",
      padding: "2px 8px", borderRadius: 6,
    }}>
      diagram
    </span>

    {/* copy */}
    <button
      onClick={copy}
      style={{
        position: "absolute", top: 8, right: 10, zIndex: 10,
        padding: "6px", borderRadius: 6,
        border: copied ? "1px solid rgba(124,58,237,0.3)" : "1px solid rgba(255,255,255,0.08)",
        background: copied ? "rgba(124,58,237,0.1)" : "rgba(24,24,27,0.6)",
        color: copied ? "#a78bfa" : "rgba(161,161,170,0.6)",
        cursor: "pointer", opacity: hovered || copied ? 1 : 0,
        transition: "all 0.2s ease",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}
    >
      {copied ? <Check size={13} /> : <Copy size={13} />}
    </button>

    {/* scroll wrapper — this is the key */}
    <div style={{
      width: "100%",
      overflowX: "auto",   // ← horizontal scroll here
      overflowY: "visible",
      paddingTop: "2.5rem",
      paddingBottom: "1rem",
      background: "#000000",
      borderRadius: 10,
    }}>
      {/* inner div that can be wider than parent */}
      <div
        ref={ref}
        style={{
          minWidth: "100%",   // ← at least full width
          width: "max-content", // ← grows as wide as SVG needs
          padding: "0 1rem",
        }}
      />
    </div>
  </div>
)
}

export function CodeBlock({ language, children }) {
  const [copied, setCopied] = useState(false);
  const [hovered, setHovered] = useState(false);
  const isStreaming = usechatStore(useShallow(state => state.isStreaming))
  if (language === "mermaid") {
    return <MermaidBlock code={String(children || "").trim()} />
  }
   
  



// CodeBlock.jsx — remove isStreaming from chart handling
if (language === "chart") {
  const raw = String(children || "").trim()
  try {
    const data = JSON.parse(raw)
    console.log("Parsed chart data:", data)
    return <ChartBlock data={data} />   // ← no isStreaming prop
  } catch {
    return (
      <div style={{
        padding: "1rem", borderRadius: 8, margin: "12px 0",
        border: "1px solid rgba(239,68,68,0.2)",
        background: "rgba(239,68,68,0.05)",
        fontSize: 11, fontFamily: "'IBM Plex Mono', monospace",
        color: "rgba(239,68,68,0.6)",
      }}>
        {isStreaming ? (
          // dots while streaming incomplete JSON
          <div style={{ display: "flex", gap: 6, justifyContent: "center", padding: "1rem" }}>
            {[0,1,2].map(i => (
              <div key={i} style={{
                width: 5, height: 5, borderRadius: "50%",
                background: "rgba(167,139,250,0.5)",
                animation: "chartDot 1.2s ease-in-out infinite",
                animationDelay: `${i * 0.2}s`,
              }} />
            ))}
            <style>{`@keyframes chartDot { 0%,80%,100%{transform:scale(0.6);opacity:0.3} 40%{transform:scale(1);opacity:1} }`}</style>
          </div>
        ) : "chart parse error — invalid JSON"}
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
        }}
      >
        {children}
      </SyntaxHighlighter>
    </div>
  );
}