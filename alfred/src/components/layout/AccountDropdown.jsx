// components/ui/AccountDropdown.jsx
"use client"
import { useState, useRef, useCallback } from "react"
import { Settings, LogOut } from "lucide-react"
import { useRouter } from "next/navigation"
import { logoutUser } from "@/services/fetch_info"
import { user_contextStore } from "@/services/contextStrore"

const LONG_PRESS_MS = 450

export default function AccountDropdown({ trigger }) {
  const [open, setOpen] = useState(false)
  const router = useRouter()
  const pressTimer = useRef(null)

  const handleLogout = async () => {
    try {
      await logoutUser(router)
      user_contextStore.getState().actions.resetUser?.()
      router.push("/auth")
    } catch (err) {
      console.error("Failed to log out:", err)
    } finally {
      setOpen(false)
    }
  }

  const handleSettings = () => {
    setOpen(false)
    router.push("/settings/models")
  }

  const startPress = useCallback(() => {
    pressTimer.current = setTimeout(() => setOpen(true), LONG_PRESS_MS)
  }, [])

  const cancelPress = useCallback(() => {
    if (pressTimer.current) {
      clearTimeout(pressTimer.current)
      pressTimer.current = null
    }
  }, [])

  return (
    <div className="relative">
      <div
        onClick={() => setOpen((o) => !o)}
        onTouchStart={startPress}
        onTouchEnd={cancelPress}
        onTouchMove={cancelPress}
        onContextMenu={(e) => e.preventDefault()}
      >
        {trigger}
      </div>

      {open && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setOpen(false)}
        />
      )}

      {/* ✅ CHANGED: positioned below the trigger, animated in/out instead of conditional mount */}
      <div
        className={`absolute left-0 top-full mt-2 z-50 w-56 rounded-lg border border-zinc-700 bg-zinc-900 shadow-xl py-1 origin-top transition-all duration-150 ease-out ${
          open
            ? "opacity-100 scale-100 translate-y-0"
            : "opacity-0 scale-95 -translate-y-1 pointer-events-none"
        }`}
      >
        <button
          onClick={handleSettings}
          className="flex w-full items-center gap-2 px-3 py-2 text-sm text-zinc-200 hover:bg-zinc-800 transition-colors"
        >
          <Settings className="w-4 h-4" />
          Model settings
        </button>
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-zinc-800 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Log out
        </button>
      </div>
    </div>
  )
}