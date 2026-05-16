import { useState } from "react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import { Copy, Check } from "lucide-react";

export function CodeBlock({ language, children }) {
  const [copied, setCopied] = useState(false);
  const [hovered, setHovered] = useState(false);

  const showLang = language && language !== "text";

  const copy = () => {
    navigator.clipboard.writeText(children);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className="relative my-3 rounded-lg w-180 overflow-hidden border border-white/8"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Top left language badge */}
      {showLang && (
        <span className="absolute top-2.5 left-3 z-10 text-xs font-mono px-2 py-0.5 rounded-md bg-white/5 border border-white/8 text-zinc-500">
          {language}
        </span>
      )}

      {/* Top right copy icon button */}
      <button
        onClick={copy}
        className={`absolute top-2 right-2.5 z-10 p-1.5 rounded-md border transition-all duration-200
          ${copied
            ? "opacity-100 border-green-500/30 text-green-400 bg-green-500/10"
            : "border-white/8 text-zinc-500 bg-zinc-900/60 hover:text-white hover:border-white/20"
          }
          ${hovered || copied ? "opacity-100" : "opacity-0"}
        `}
      >
        {copied ? <Check size={13} /> : <Copy size={13} />}
      </button>

      {/* Code */}
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
        }}
      >
        {children}
      </SyntaxHighlighter>
    </div>
  );
}