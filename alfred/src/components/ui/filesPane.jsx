import * as React from "react"
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"

const FILE_TYPE_MAP = {
  pdf: "PDF", doc: "DOC", docx: "DOCX",
  xls: "XLS", xlsx: "XLSX",
  ppt: "PPT", pptx: "PPTX",
  txt: "TXT", csv: "CSV", json: "JSON", md: "MD",
  js: "JS", ts: "TS", jsx: "JSX", tsx: "TSX",
  html: "HTML", css: "CSS",
}

const IMAGE_EXTENSIONS = ["png", "jpg", "jpeg", "gif", "webp"]

function getLabel(filename) {
  const ext = filename.split(".").pop()?.toLowerCase() || ""
  return FILE_TYPE_MAP[ext] || "FILE"
}

function truncateName(name, maxLen = 14) {
  if (name.length <= maxLen) return name
  const ext = name.includes(".") ? "." + name.split(".").pop() : ""
  const base = name.slice(0, maxLen - ext.length - 2)
  return base + "…" + ext
}

// ── Image Card ──────────────────────────────────────────────────────────────
function ImageCard({ file, onRemove }) {
  const [isHovered, setIsHovered] = React.useState(false)
  const progress = file.progress ?? 0
  const isDone = progress >= 100
  const isError = file.error

  const baseBorder = `1px solid ${isError ? "rgba(239,68,68,0.35)" : "rgba(255,255,255,0.12)"}`
  const hoverBorder = `1px solid ${isError ? "rgba(239,68,68,0.7)" : "rgba(255,255,255,0.7)"}`

  // build preview URL from base64 or object URL
  const previewSrc = file.base64
    ? `data:${file.mime_type};base64,${file.base64}`
    : file.previewUrl || null

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        width: 96,
        height: 96,
        borderRadius: 10,
        background: "transparent",
        border: isHovered ? hoverBorder : baseBorder,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "5px 5px 7px",
        flexShrink: 0,
        position: "relative",
        transition: "border-color 0.3s ease",
        cursor: "default",
        userSelect: "none",
        overflow: "hidden",
      }}
    >
      {/* ✕ Remove button */}
      <button
        onClick={() => onRemove(file.id)}
        style={{
          position: "absolute",
          top: 5,
          right: 5,
          width: 14,
          height: 14,
          borderRadius: "50%",
          background: "rgba(0,0,0,0.6)",
          border: "1px solid rgba(255,255,255,0.15)",
          color: "rgba(255,255,255,0.6)",
          fontSize: 8,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          lineHeight: 0,
          padding: 0,
          paddingBottom: 1,
          zIndex: 2,
          transition: "border-color 0.2s, color 0.2s",
        }}
        onMouseEnter={e => {
          e.currentTarget.style.borderColor = "rgba(239,68,68,0.5)"
          e.currentTarget.style.color = "#f87171"
        }}
        onMouseLeave={e => {
          e.currentTarget.style.borderColor = "rgba(255,255,255,0.15)"
          e.currentTarget.style.color = "rgba(255,255,255,0.6)"
        }}
      >
        ✕
      </button>

      {/* Thumbnail */}
      <div style={{
        width: "100%",
        flex: 1,
        borderRadius: 6,
        overflow: "hidden",
        marginBottom: 4,
        background: "rgba(255,255,255,0.04)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}>
        {previewSrc ? (
          <img
            src={previewSrc}
            alt={file.name}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              borderRadius: 6,
              opacity: isDone ? 1 : 0.5,
              transition: "opacity 0.3s ease",
            }}
          />
        ) : (
          <span style={{ fontSize: 20 }}>🖼️</span>
        )}
      </div>

      {/* File name */}
      <div style={{
        fontSize: 9.5,
        fontWeight: 500,
        color: "rgba(255,255,255,0.5)",
        textAlign: "center",
        lineHeight: 1.3,
        maxWidth: "100%",
        fontFamily: "'IBM Plex Mono', monospace",
        flexShrink: 0,
      }}>
        {truncateName(file.name)}
      </div>

      {/* Progress bar */}
      <div style={{ width: "100%", flexShrink: 0 }}>
        <div style={{
          width: "100%",
          height: 2,
          borderRadius: 99,
          background: "rgba(255,255,255,0.07)",
          overflow: "hidden",
        }}>
          <div style={{
            height: "100%",
            width: `${Math.min(progress, 100)}%`,
            borderRadius: 99,
            background: isError ? "rgba(239,68,68,0.6)" : "rgba(255,255,255,0.45)",
            transition: "width 0.35s cubic-bezier(0.4,0,0.2,1)",
          }} />
        </div>
        <div style={{
          fontSize: 8.5,
          color: isError
            ? "rgba(239,68,68,0.7)"
            : isDone
            ? "rgba(255,255,255,0.3)"
            : "rgba(255,255,255,0.25)",
          marginTop: 3,
          textAlign: "right",
          fontFamily: "'IBM Plex Mono', monospace",
        }}>
          {isError ? "failed - " + file.status : isDone ? "done" : `${Math.round(progress)}%`}
        </div>
      </div>
    </div>
  )
}

// ── File Card (unchanged) ────────────────────────────────────────────────────
function FileCard({ file, onRemove }) {
  const [isHovered, setIsHovered] = React.useState(false)
  const label = getLabel(file.name)
  const progress = file.progress ?? 0
  const isDone = progress >= 100
  const isError = file.error
  const baseBorder = `1px solid ${isError ? "rgba(239,68,68,0.35)" : "rgba(255,255,255,0.12)"}`
  const hoverBorder = `1px solid ${isError ? "rgba(239,68,68,0.7)" : "rgba(255,255,255,0.7)"}`

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        width: 96, height: 96, borderRadius: 10,
        background: "transparent",
        border: isHovered ? hoverBorder : baseBorder,
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "space-between",
        padding: "8px 8px 7px", flexShrink: 0,
        position: "relative",
        transition: "border-color 0.3s ease",
        cursor: "default", userSelect: "none",
      }}
    >
      <button
        onClick={() => onRemove(file.id)}
        style={{
          position: "absolute", top: 5, right: 5,
          width: 14, height: 14, borderRadius: "50%",
          background: "transparent",
          border: "1px solid rgba(255,255,255,0.15)",
          color: "rgba(255,255,255,0.4)", fontSize: 8,
          display: "flex", alignItems: "center", justifyContent: "center",
          cursor: "pointer", lineHeight: 0, padding: 0, paddingBottom: 1,
          transition: "border-color 0.2s, color 0.2s",
        }}
        onMouseEnter={e => {
          e.currentTarget.style.borderColor = "rgba(239,68,68,0.5)"
          e.currentTarget.style.color = "#f87171"
        }}
        onMouseLeave={e => {
          e.currentTarget.style.borderColor = "rgba(255,255,255,0.15)"
          e.currentTarget.style.color = "rgba(255,255,255,0.4)"
        }}
      >✕</button>

      <div style={{
        width: 38, height: 32, borderRadius: 6,
        border: "1px solid rgba(255,255,255,0.15)",
        background: "transparent",
        display: "flex", alignItems: "center", justifyContent: "center",
        marginTop: 2,
      }}>
        <span style={{
          fontSize: 9, fontWeight: 700,
          color: "rgba(255,255,255,0.65)",
          letterSpacing: "0.05em",
          fontFamily: "'IBM Plex Mono', monospace",
        }}>{label}</span>
      </div>

      <div style={{
        fontSize: 9.5, fontWeight: 500,
        color: "rgba(255,255,255,0.5)",
        textAlign: "center", lineHeight: 1.3,
        maxWidth: "100%",
        fontFamily: "'IBM Plex Mono', monospace",
      }}>{truncateName(file.name)}</div>

      <div style={{ width: "100%" }}>
        <div style={{
          width: "100%", height: 2, borderRadius: 99,
          background: "rgba(255,255,255,0.07)", overflow: "hidden",
        }}>
          <div style={{
            height: "100%",
            width: `${Math.min(progress, 100)}%`,
            borderRadius: 99,
            background: isError ? "rgba(239,68,68,0.6)" : "rgba(255,255,255,0.45)",
            transition: "width 0.35s cubic-bezier(0.4,0,0.2,1)",
          }} />
        </div>
        <div style={{
          fontSize: 8.5,
          color: isError ? "rgba(239,68,68,0.7)" : isDone ? "rgba(255,255,255,0.3)" : "rgba(255,255,255,0.25)",
          marginTop: 3, textAlign: "right",
          fontFamily: "'IBM Plex Mono', monospace",
        }}>
          {isError ? "failed" : isDone ? "done" : `${Math.round(progress)}%`}
        </div>
      </div>
    </div>
  )
}

// ── Main component ───────────────────────────────────────────────────────────
export function FileUploadScrollArea({ files: externalFiles, onRemove: externalRemove }) {
  const files = externalFiles || []

  const handleRemove = (id) => {
    if (externalRemove) externalRemove(id)
  }

  if (!files.length) return null

  return (
    <div style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
      <link
        href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;700&display=swap"
        rel="stylesheet"
      />
      <ScrollArea className="w-full">
        <div style={{
          display: "flex", gap: 6,
          padding: "6px 4px 4px",
          width: "max-content",
        }}>
          {files.map(file => {
            const ext = file.name.split(".").pop()?.toLowerCase() || ""
            const isImage = IMAGE_EXTENSIONS.includes(ext)

            return isImage
              ? <ImageCard key={file.id} file={file} onRemove={handleRemove} />
              : <FileCard  key={file.id} file={file} onRemove={handleRemove} />
          })}
        </div>
        <ScrollBar
          orientation="horizontal"
          className="h-1 bg-transparent [&>div]:bg-zinc-500 [&>div]:rounded-full hover:[&>div]:bg-zinc-400 [&>div]:transition-colors"
        />
      </ScrollArea>
    </div>
  )
}

export default FileUploadScrollArea