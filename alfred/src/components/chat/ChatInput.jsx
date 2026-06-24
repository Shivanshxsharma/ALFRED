"use client"

import React, { useState, useRef } from "react"
import { CircleArrowUp, StopCircle } from "lucide-react"
import { useChatActions, usechatStore, user_contextStore } from "@/services/contextStrore"
import { cn } from "@/lib/utils"
import VioletButton from "@/components/common/VioletButton"
import UploadButton from "./UploadButton"
import FileUploadScrollArea from "./filesPane"
import { useShallow } from "zustand/shallow"
import { progress } from "framer-motion"
import { uploadFile } from "@/services/fileUpload"
import { Toggle } from "radix-ui"
import ToolsContextMenu from "./ToggleTools"
import { ModelPicker } from "@/components/models/Model_picker"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "@/components/ui/tooltip"

const MAX_HEIGHT = 200

export default function ChatInput({ router }) {
    const { addFile, updateFileProgress, setFileError ,toggleTool ,setFileServerData, stopStreaming } = usechatStore.getState().actions;

  const files_array=usechatStore(useShallow((state) => state.files_array));
  const toggleTools = usechatStore(useShallow((state) => state.toggleTools));
  const isStreaming = usechatStore(useShallow((state) => state.isStreaming));
  const isGuest = user_contextStore(useShallow((state) => state.is_guest));

  const { submitHandler } = useChatActions()
  const [allowInput, setAllowInput] = useState(false)
  const textareaRef = useRef(null)

  const handleChange = (e) => {
    setAllowInput(e.target.value.trim().length > 0)
  }

  const handleInput = () => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = "auto"
    el.style.height = Math.min(el.scrollHeight, MAX_HEIGHT) + "px"
  }

  const handleSubmit = () => {
    if (!allowInput) return
    submitHandler(textareaRef.current.value, router)
    textareaRef.current.value = ""
    textareaRef.current.style.height = "auto"
    setAllowInput(false)
  }

  return (
    <div className="w-full min-h-full  transition-all duration-500 ease-in-out absolute bottom-0 flex flex-col items-center border-2 bg-sidebar border-b-violet-900/80 rounded-2xl p-1">
      <div className={`w-full transition-all duration-300 ease-in-out bg-transparent mb-2 ${files_array.length > 0 ? "h-30" : "h-0"}`}>
          <FileUploadScrollArea
            files={files_array}
            onRemove={usechatStore.getState().actions.removeFile}
          />
        </div>
      
      {/* Textarea grows upward; bottom toolbar is absolute so mb pushes textarea above it} */}
      <div className="flex mb-10 sm:mb-14 items-end w-[98%] sm:min-h-11">
        <textarea
          ref={textareaRef}
          rows={1}
          onChange={handleChange}
          onInput={handleInput}
          placeholder="Ask me anything Master"
          className={cn(
            "w-full resize-none py-2 pl-2 rounded-md outline-none focus:outline-none focus:ring-0 overflow-y-auto bg-transparent",
            "[&::-webkit-scrollbar]:w-1",
            "[&::-webkit-scrollbar-track]:bg-zinc-900",
            "[&::-webkit-scrollbar-thumb]:bg-zinc-500",
            "[&::-webkit-scrollbar-thumb]:rounded-full",
            "hover:[&::-webkit-scrollbar-thumb]:bg-gray-600",
          )}
        />
      </div>

      {/* Bottom toolbar */}
      <div className="rounded-xl w-[98%] h-9 sm:h-12 absolute bottom-1 flex justify-between items-center bg-background p-0.5 sm:p-1.5">
        <div className="w-[20%] h-full gap-3 flex items-center">
        {isGuest ? (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="inline-flex cursor-not-allowed opacity-50">
                  <UploadButton onFile={() => {}} disabled />
                </span>
              </TooltipTrigger>
              <TooltipContent className="bg-red-950 border border-red-800 text-red-300">
                File uploads aren't available in guest mode — sign up to use this feature
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ) : (
          <UploadButton
            onFile={(rawFile) => {
              const id = addFile(rawFile)   
              uploadFile({ raw: rawFile }, (percent) => {
                updateFileProgress(id, percent)
              })
                .then((res) => {
                  updateFileProgress(id, 100)
                  console.log("File uploaded successfully:", res)
                  setFileServerData(id, res)
                })
                .catch(() => setFileError(id))
            }}
          />
        )}

        <ToolsContextMenu  toggleTools={toggleTools}  toggleTool={toggleTool}/>
        <ModelPicker  />
        </div>


        {

          !isStreaming?
          <button
          disabled={!allowInput}
          onClick={handleSubmit}
          className={cn(
            "w-fit h-fit rounded-full p-1 transition-all ease-in-out duration-200",
            allowInput ? "opacity-100 hover:bg-accent" : "opacity-50 cursor-not-allowed"
          )}
        >
          <CircleArrowUp />
        </button>:
        <button
        onClick={() => stopStreaming()}
        className={cn(
          "w-fit h-fit rounded-full p-1 transition-all ease-in-out duration-200"
        )}
        >
          <StopCircle />
        </button>
        
        }
      </div>

    </div>
  )
}