"use client"
import React, { useEffect, useState, useRef } from 'react'
import { animate } from 'framer-motion'
import { usechatStore } from '@/services/contextStrore'
import { useShallow } from 'zustand/react/shallow'
import Markdown from './Markdown'
import ToolBar from './ToolBar'

const ChatBubble = ({ index, lastindex, role, content, meta_data }) => {
  const isStreaming = usechatStore(useShallow((state) => state.isStreaming));
  const tool_array = usechatStore(useShallow((state) => state.tool_array));
  const [displayText, setDisplayText] = useState("");
  const prevLengthRef = useRef(0);
  const cachedToolsRef = useRef([]);

  const isLastMessage = index === lastindex;

  // keep caching live tools as they stream in
  useEffect(() => {
    if (isStreaming && isLastMessage && role === "ai" && tool_array?.length > 0) {
      cachedToolsRef.current = tool_array.map(t => ({
        name: t.name,
        input: t.input,
        status: t.status,
      }));
    }
  }, [tool_array, isStreaming, isLastMessage, role]);

  // reset cache when a new message starts
  useEffect(() => {
    if (isStreaming && isLastMessage && role === "ai") {
      cachedToolsRef.current = [];
    }
  }, [isLastMessage]);

  const savedTools = meta_data?.tool_calls?.map(t => ({
    name: t.tool_name,
    input: t.tool_input,
    status: "done",
  })) ?? [];

  // priority: savedTools (from DB) > cachedTools (from streaming) 
  const toolsToShow = savedTools.length > 0
    ? savedTools
    : cachedToolsRef.current;

  useEffect(() => {
    const shouldAnimate = isStreaming && role === "ai" && isLastMessage;

    if (!shouldAnimate) {
      setDisplayText(content);
      prevLengthRef.current = content.length;
      return;
    }

    const remainingChars = content.length - prevLengthRef.current;
    const charRate = 0.025;
    const dynamicDuration = Math.min(remainingChars * charRate, 1.5);

    const controls = animate(prevLengthRef.current, content.length, {
      duration: dynamicDuration,
      ease: "linear",
      onUpdate(latest) {
        const rounded = Math.floor(latest);
        setDisplayText(content.slice(0, rounded));
        prevLengthRef.current = rounded;
      }
    });

    return () => controls.stop();
  }, [content, isStreaming, role, isLastMessage]);

  const bubbleClass = role === "human" ? "bg-violet-600/15 backdrop-blur-md border border-violet-500/30 rounded-tr-none rounded-2xl" : 'bg-transparent';

  return (
    <div className={`p-2.5 md:p-4 my-2 rounded-full md:rounded-2xl max-w-full ${bubbleClass}`}>
      <div className="prose prose-invert prose-sm max-w-none text-sm sm:text-[16px] text-white">
        {role === "ai" ? (
          <>
            {toolsToShow.length > 0 && <ToolBar tools={toolsToShow} />}
            <Markdown message={displayText} meta_data={meta_data} />
          </>
        ) : (
          <p className="text-white">{displayText}</p>
        )}
      </div>
    </div>
  );
};

export default ChatBubble;