"use client"

import React, { useState,useRef } from "react"
import {LucideArrowUpFromDot,DiamondPlusIcon,tie, ArrowUpCircleIcon, SquareArrowUpIcon, ArrowBigUpIcon, CircleArrowUp} from "lucide-react"
import { useChatActions } from "@/services/contextStrore";
import { cn } from "@/lib/utils";
import { all } from "axios";
const MAX_HEIGHT = 200

export default function ChatInput({router}) {


const {submitHandler}
  = useChatActions();

  const [allowInput, setallowInput] = useState(false)


  const handleChange=(e)=>{
    // const el = textareaRef.current
    if(e.target.value.trim().length>0){
      setallowInput(true)}
      else{
        setallowInput(false)
      }}





  const textareaRef = useRef(null)

  const handleInput = () => {
    const el = textareaRef.current
    if (!el) return

    el.style.height = "auto"
    el.style.height = Math.min(el.scrollHeight, MAX_HEIGHT) + "px"
  }

  return (
    <div   className="w-full min-h-full absolute bottom-0    flex  flex-col items-center  border-2 bg-sidebar border-b-violet-900/80 rounded-2xl   p-1">
      <div    className="flex mb-10 sm:mb-14  items-end w-[98%]  sm:min-h-11">  
        {/* ass positioned items do not interact with each means therir change in height wont cause other elements to change their height so we use mb-17 not absolute -17 */}
        <textarea
           ref={textareaRef}
          rows={1}
          onChange={handleChange}
          onInput={handleInput}
          placeholder="Ask me anything Master"
className={cn(
  
  "w-full resize-none py-2 pl-2  rounded-md outline-none focus:outline-none focus:ring-0 overflow-y-auto",
  // Scrollbar styles broken into logical chunks
  "[&::-webkit-scrollbar]:w-1",
  "[&::-webkit-scrollbar-track]:bg-zinc-900",
  "[&::-webkit-scrollbar-thumb]:bg-zinc-500",
  "[&::-webkit-scrollbar-thumb]:rounded-full",
  "[&::-webkit-scrollbar-thumb]:border-0.5",
  "[&::-webkit-scrollbar-thumb]:border-gray-100",
  "hover:[&::-webkit-scrollbar-thumb]:bg-gray-600",
  "hover:[&::-webkit-scrollbar-thumb]:cursor-pointer"
)}/>
      </div>

      <div className="rounded-xl w-[98%] h-9 sm:h-12  absolute bottom-1  flex justify-between items-end bg-background p-0.5 sm:p-1.5">
        <button className="w-fit h-fit rounded-[50%] p-1 hover:bg-accent transition-all ease-in-out duration-200"><DiamondPlusIcon/></button>


      <button 
        style={
          {
            cursor: allowInput?"": "not-allowed"
          }
        }
      className={`${!allowInput ? "opacity-50 cursor-not-allowed" : "opacity-100 hover:bg-accent"} w-fit h-fit rounded-[50%] p-1 transition-all ease-in-out duration-200`}
      onClick={() => {
      submitHandler(textareaRef.current.value, router)
      textareaRef.current.value = ""
       setallowInput(false)
      }}
   >
  <CircleArrowUp/>
      </button>
      </div>
    </div>
  )
}
