"use client"

import React, { useState, useRef, use } from "react"
import { CircleArrowUp } from "lucide-react"
import { useChatActions, usechatStore } from "@/services/contextStrore"
import { cn } from "@/lib/utils"
import VioletButton from "./VioletButton"
import UploadButton from "./UploadButton"
import FileUploadScrollArea from "./filesPane"
import { useShallow } from "zustand/shallow"
import { progress } from "framer-motion"

const MAX_HEIGHT = 200


export default function ChatInput({ router }) {
    const { addFile, updateFileProgress, setFileError } = usechatStore.getState().actions;

  const files_array=usechatStore(useShallow((state) => state.files_array));

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
    <div className="w-full min-h-full absolute bottom-0 flex flex-col items-center border-2 bg-sidebar border-b-violet-900/80 rounded-2xl p-1">
      {files_array.length>0 &&<div className= {` w-full   h-30 bg-transparent mb-2 `} >
      <FileUploadScrollArea  files={files_array} onRemove={usechatStore.getState().actions.removeFile}  />
      </div> }
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


<UploadButton
  onFile={(file) => {

    
    addFile(file) 

    uploadFile(file, (percent) => {
      updateFileProgress(file.id, percent)
    })
    .then((res) => {
      updateFileProgress(file.id, 100)
      
    })
    .catch(() => {
      setFileError(file.id) 
    })
  }}
/>


        <button
          disabled={!allowInput}
          onClick={handleSubmit}
          className={cn(
            "w-fit h-fit rounded-full p-1 transition-all ease-in-out duration-200",
            allowInput ? "opacity-100 hover:bg-accent" : "opacity-50 cursor-not-allowed"
          )}
        >
          <CircleArrowUp />
        </button>

      </div>
    </div>
  )
}