import React, { use, useEffect, useRef, useState } from 'react'
import ChatBubble from './ChatBubble'
import Loader from './Loader'
import { Button } from './button'
import { Copy, Check } from "lucide-react";
import { usechatStore } from '@/services/contextStrore'
import { useShallow } from 'zustand/react/shallow';
import  ToolBar  from './ToolBar';
const Current_chat = () => {




const chatId = usechatStore(useShallow((state) => state.curr_chatid));
const newChatId = usechatStore(useShallow((state) => state.new_created_chatId));
const fillOldChat = usechatStore(useShallow((state) => state.actions.fillOldChat));
useEffect(() => {
  async function fetchMessages() {
    try {
      if( chatId!==null &&chatId!==newChatId) await fillOldChat(chatId);
    } catch (error) {
      console.error("Failed to fetch old messages:", error);
    }
  }
  if (chatId) {
    fetchMessages();
  }
}, [chatId, fillOldChat]);









const Curr_Conversation_array = usechatStore(
    useShallow((state) => state.Curr_Conversation_array)
  );

const tool_array = usechatStore(
  useShallow((state) => state.tool_array)
);



  // console.log("Current conversation array:", Curr_Conversation_array);
    console.log( "Tool array:", tool_array);



const [hoveredIndex, setHoveredIndex] = useState(null);

  const secondLastRef = useRef(null);
  const containerRef = useRef(null);
  const isStreaming = usechatStore(useShallow((state) => state.isStreaming));
  const [copied, setcopied] = useState(false);
    useEffect(() => {
  if (Curr_Conversation_array.length >= 2 && secondLastRef.current && containerRef.current) {
    containerRef.current.scrollTo({ 
      top: secondLastRef.current.offsetTop,
      behavior: 'smooth'
    });
    }
  }, [Curr_Conversation_array]);



  async function copyToClipboard(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      setcopied(true)
      setTimeout(() => setcopied(false), 2000);
    }
  }

  return (
    <div ref={containerRef} className='flex flex-col items-center gap-y-4 rounded-2xl w-full h-full overflow-y-auto p-4 scroll-smooth [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-track]:bg-background [&::-webkit-scrollbar-thumb]:bg-zinc-800 [&::-webkit-scrollbar-thumb]:rounded-full'>
      
      {Curr_Conversation_array.map((message, index) => (
        <div
          key={index}
          ref={index === Curr_Conversation_array.length - 2 ? secondLastRef : null}
          className={`flex flex-col w-full md:w-[50%] transition-opacity duration-300 ease-in-out ${message.role == "human" ? "items-end" : "items-center"}
          ${index === Curr_Conversation_array.length - 1 && message.role === 'ai' ? 'min-h-[70vh]' : ''}
          `}
          onMouseEnter={() => setHoveredIndex(index)}
          onMouseLeave={() => setHoveredIndex(null)}
        >
         
          <ChatBubble 
             index={index} 
           lastindex={Curr_Conversation_array.length - 1} 
           role={message.role} 
           content={message.content} 
           meta_data={message.meta_data}
           tool_array={tool_array}        // live tools during streaming
           isLastMessage={index === Curr_Conversation_array.length - 1}
         />

{!isStreaming && message.role == "ai" ? (
  <div className={`flex w-full h-7 px-5 transition-opacity duration-200 ${message.role == "human" ? "justify-end" : "justify-start"} gap-x-2`}>
    <button
      onClick={() => copyToClipboard(message.content)}
      className={`p-1.5 rounded-md border transition-all duration-200
        ${copied
          ? "border-violet-700/30 text-violet-400 bg-violet-500/10"
          : "border-white/8 text-zinc-500 bg-zinc-900/60 hover:text-white hover:border-white/20"
        }`}
    >
      {copied ? <Check size={13} /> : <Copy size={13} />}
    </button>
  </div>
) : hoveredIndex === index ? (
  <div className={`flex w-full h-7 px-5 transition-opacity duration-200 ${message.role == "human" ? "justify-end" : "justify-start"} gap-x-2`}>
    <button
      onClick={() => copyToClipboard(message.content)}
      className={`p-1.5 rounded-md border transition-all duration-200
        ${copied
          ? "border-violet-700/30 text-violet-400 bg-violet-500/10"
          : "border-white/8 text-zinc-500 bg-zinc-900/60 hover:text-white hover:border-white/20"
        }`}
    >
      {copied ? <Check size={13} /> : <Copy size={13} />}
    </button>
  </div>
) : (
  <div className="w-full h-7" />
)}
          
{isStreaming && message.role === "ai" && index === Curr_Conversation_array.length - 1 && (
  <>

    <div className='w-full flex justify-start animate-fadeIn'>
      <Loader />
    </div>
  </>
)}
        </div>
      ))}
    </div>
  )
}

export default Current_chat