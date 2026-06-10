// FileChip.jsx
import * as React from "react"

const FILE_TYPE_MAP = {
  pdf: "PDF", doc: "DOC", docx: "DOCX",
  xls: "XLS", xlsx: "XLSX",
  ppt: "PPT", pptx: "PPTX",
  txt: "TXT", csv: "CSV", json: "JSON", md: "MD",
  js: "JS", ts: "TS", jsx: "JSX", tsx: "TSX",
  html: "HTML", css: "CSS",
}

const IMAGE_EXTENSIONS = ["png", "jpg", "jpeg", "gif", "webp"]

function truncateName(name, maxLen = 18) {
  if (name.length <= maxLen) return name
  const ext = name.includes(".") ? "." + name.split(".").pop() : ""
  const base = name.slice(0, maxLen - ext.length - 2)
  return base + "…" + ext
}

function FileChip({ file }) {
  const ext = file.name.split(".").pop()?.toLowerCase() || ""
  const isImage = IMAGE_EXTENSIONS.includes(ext)
  const label = FILE_TYPE_MAP[ext] || "FILE"

  const previewSrc = file.base64
    ? `data:${file.mime_type};base64,${file.base64}`
    : file.previewUrl || null

  return (
    <div style={{
      display: "inline-flex",
      alignItems: "center",
      gap: 6,
      padding: "4px 8px 4px 5px",
      borderRadius: 8,
      border: "1px solid rgba(255,255,255,0.12)",
      background: "rgba(255,255,255,0.05)",
      maxWidth: 180,
      flexShrink: 0,
      userSelect: "none",
    }}>
      {/* Thumbnail or label box */}
      {isImage && previewSrc ? (
        <img
          src={previewSrc}
          alt={file.name}
          style={{
            width: 28,
            height: 28,
            borderRadius: 5,
            objectFit: "cover",
            flexShrink: 0,
          }}
        />
      ) : (
        <div style={{
          width: 28,
          height: 28,
          borderRadius: 5,
          border: "1px solid rgba(255,255,255,0.15)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}>
          <span style={{
            fontSize: 8,
            fontWeight: 700,
            color: "rgba(255,255,255,0.6)",
            fontFamily: "'IBM Plex Mono', monospace",
            letterSpacing: "0.04em",
          }}>{label}</span>
        </div>
      )}

      {/* File name */}
      <span style={{
        fontSize: 11,
        fontWeight: 500,
        color: "rgba(255,255,255,0.55)",
        fontFamily: "'IBM Plex Mono', monospace",
        whiteSpace: "nowrap",
        overflow: "hidden",
        textOverflow: "ellipsis",
      }}>
        {truncateName(file.name)}
      </span>
    </div>
  )
}

// Renders all chips for a message
export function MessageFileChips({ files }) {
  if (!files?.length) return null
  return (
    <div style={{
      display: "flex",
      flexWrap: "wrap",
      gap: 5,
      marginBottom: 6,
    }}>
      {files.map(file => (
        <FileChip key={file.id} file={file} />
      ))}
    </div>
  )
}

export default MessageFileChips