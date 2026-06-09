"use client"
import * as React from "react"

export function useErrorBanner() {
  const [error, setError] = React.useState(null)

  const showError = (msg) => {
    setError(msg)
    setTimeout(() => setError(null), 3000)
  }

  return { error, showError }
}

export function ErrorBanner({ message }) {
  if (!message) return null

  return (
    <div style={{
      position: "fixed",
      top: 16,
      left: "50%",
      transform: "translateX(-50%)",
      zIndex: 9999,
      background: "rgba(239, 68, 68, 0.9)",
      color: "white",
      padding: "10px 24px",
      borderRadius: 8,
      fontFamily: "'IBM Plex Mono', monospace",
      fontSize: 13,
      letterSpacing: "0.03em",
      boxShadow: "0 4px 20px rgba(0,0,0,0.3)",
    }}>
      {message}
    </div>
  )
}