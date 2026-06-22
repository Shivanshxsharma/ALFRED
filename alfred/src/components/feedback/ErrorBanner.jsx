"use client"
import { usechatStore } from "@/services/contextStrore"
import * as React from "react"
import { useShallow } from "zustand/shallow"

export function useErrorBanner() {
  const [error, setError] = React.useState(null)

  const showError = (msg) => {
    setError(msg)
    setTimeout(() => setError(null), 3000)
  }

  return { error, showError }
}

export function ErrorBanner({ message }) {
  const storeError = usechatStore(useShallow((state) => state.error));
  const displayMessage = message ?? storeError;

  if (!displayMessage) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 16,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        gap: 10,
        background: "rgba(20, 8, 8, 0.92)",
        border: "1px solid rgba(239, 68, 68, 0.35)",
        color: "#fca5a5",
        padding: "10px 18px",
        borderRadius: 10,
        fontFamily: "'IBM Plex Mono', monospace",
        fontSize: 13,
        letterSpacing: "0.02em",
        backdropFilter: "blur(8px)",
        maxWidth: "min(480px, 90vw)",
      }}
    >
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: "50%",
          background: "#ef4444",
          flexShrink: 0,
        }}
      />
      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {displayMessage}
      </span>
    </div>
  )
}