"use client"
import { useState, useRef, useEffect } from "react";
import { ChevronDown, Loader2, Check } from "lucide-react";

export default function ToolBar({ tools }) {
  const [open, setOpen] = useState(false);
  const contentRef = useRef(null);
  const [height, setHeight] = useState(0);

  useEffect(() => {
    if (contentRef.current) {
      setHeight(open ? contentRef.current.scrollHeight + 8 : 0);
    }
  }, [open, tools]);

  if (!tools || tools.length === 0) return null;

  const runningTool = tools.find(t => t.status === "running");

  return (
    <div className="w-full mb-3">
      {/* Trigger */}
      <div
        onClick={() => setOpen(p => !p)}
        className="flex items-center justify-between px-4 py-2.5 rounded-lg border border-zinc-700/60 bg-zinc-800/40 hover:bg-zinc-800/70 transition-colors duration-200 cursor-pointer w-full"
      >
        <div className="flex items-center gap-x-2.5">
          {runningTool ? (
            <>
              <Loader2 size={13} className="text-zinc-300 animate-spin" />
              <span className="text-xs text-zinc-300 font-mono">{runningTool.name}</span>
              <span className="text-xs text-zinc-400">running...</span>
            </>
          ) : (
            <>
              <Check size={13} className="text-zinc-300" />
              <span className="text-xs text-zinc-300 font-medium">
                {tools.length} tool{tools.length > 1 ? "s" : ""} used
              </span>
            </>
          )}
        </div>

        <div className="flex items-center gap-x-2">
          <span className="text-xs text-zinc-500 font-mono">{tools.length}</span>
          <ChevronDown
            size={13}
            className="text-zinc-400 transition-transform duration-300 ease-in-out"
            style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)" }}
          />
        </div>
      </div>

      {/* Animated content */}
      <div
        style={{
          height: `${height}px`,
          overflow: "hidden",
          transition: "height 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
        }}
      >
        <div ref={contentRef} className="pt-1">
          <div className="rounded-lg border border-zinc-700/60 bg-zinc-800/40 overflow-hidden">
            {tools.map((tool, i) => (
              <div
                key={i}
                className={`flex items-start gap-x-3 px-4 py-3
                  ${i !== tools.length - 1 ? "border-b border-zinc-700/40" : ""}
                `}
              >
                {/* Status icon */}
                <div className="mt-0.5 shrink-0">
                  {tool.status === "running"
                    ? <Loader2 size={13} className="text-zinc-300 animate-spin" />
                    : <Check size={13} className="text-zinc-400" />
                  }
                </div>

                {/* Tool info */}
                <div className="flex flex-col gap-y-1 min-w-0">
                  <span className="text-xs font-mono text-zinc-200">{tool.name}</span>

                </div>

                {/* Status */}
                <span className={`ml-auto text-xs shrink-0 ${
                  tool.status === "running" ? "text-zinc-400" : "text-zinc-500"
                }`}>
                  {tool.status === "running" ? "running..." : "done"}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}