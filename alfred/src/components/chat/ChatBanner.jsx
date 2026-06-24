// EmptyChatState.jsx
"use client"
import React from "react"
import { Sparkles, Lock, AlertTriangle } from "lucide-react"
import { user_contextStore } from "@/services/contextStrore"
import { useShallow } from "zustand/shallow"
import { useRouter } from "next/navigation"

export default function ChatBanner({ isGuest, firstName }) {
  const router = useRouter()
  const connectedModels = user_contextStore(useShallow((state) => state.connected_models))
  const hasNoModels = !isGuest && Object.keys(connectedModels).length === 0

  return (
    <div className="flex flex-col items-center justify-center h-full w-full md:w-[50%] gap-4 px-6 text-center">
      {hasNoModels && (
        <div className="w-full max-w-sm flex items-start gap-2.5 bg-red-950/30 border border-red-900/40 rounded-lg p-3 mb-1">
          <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
          <div className="text-left">
            <p className="text-[13px] text-red-300 font-medium">No models available</p>
            <p className="text-[12px] text-red-400/70 mt-0.5">
              Add a model from{" "}
              <button
                onClick={() => router.push("/settings/models")}
                className="underline hover:text-red-300 transition-colors"
              >
                Models settings
              </button>{" "}
              to start chatting.
            </p>
          </div>
        </div>
      )}

      <div className="p-3 rounded-full bg-violet-900/10 border border-violet-700/20">
        {isGuest ? (
          <Lock className="w-6 h-6 text-violet-400/70" />
        ) : (
          <Sparkles className="w-6 h-6 text-violet-400/70" />
        )}
      </div>

      <h2 className="text-lg font-medium text-[#ede9fe]">
        {isGuest
          ? "You're in Guest Mode"
          : firstName
          ? `Welcome back, ${firstName}`
          : "Welcome back"}
      </h2>

      <p className="text-sm text-zinc-500 max-w-sm leading-relaxed">
        {isGuest
          ? "          You can chat with Alfred using a basic model — no file uploads, or memory in this mode. Sign up for the full experience. You can get a demo of model with web search capability in this mode. Sign up for the full experience."
          : "Ask me anything — I can search the web, read your files, and remember what matters across our conversations."}
      </p>
    </div>
  )
}