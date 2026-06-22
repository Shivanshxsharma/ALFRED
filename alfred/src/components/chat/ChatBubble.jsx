"use client"
import React, { useEffect, useState, useRef } from 'react'
import { animate } from 'framer-motion'
import { usechatStore } from '@/services/contextStrore'
import { useShallow } from 'zustand/react/shallow'
import Markdown from './Markdown'
import ToolBar from './ToolBar'
import MessageFileChips from './FileChip'

const ChatBubble = ({ index, lastindex, role, content, meta_data }) => {
  const isStreaming = usechatStore(useShallow((state) => state.isStreaming));
  const tool_array = usechatStore(useShallow((state) => state.tool_array));
  const [displayText, setDisplayText] = useState("");
  const prevLengthRef = useRef(0);
  const cachedToolsRef = useRef([]);
  const [isCollapsed, setIsCollapsed] = useState(true); // Changed to true for default collapsed state
  const [contentHeight, setContentHeight] = useState(null);
  const contentRef = useRef(null);

  const isLastMessage = index === lastindex;

  useEffect(() => {
    if (isStreaming && isLastMessage && role === "ai" && tool_array?.length > 0) {
      cachedToolsRef.current = tool_array.map(t => ({
        name: t.name,
        input: t.input,
        status: t.status,
      }));
    }
  }, [tool_array, isStreaming, isLastMessage, role]);


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

  // Measure content height for smooth animation
  useEffect(() => {
    if (role === "human" && contentRef.current) {
      setContentHeight(contentRef.current.scrollHeight);
    }
  }, [displayText, role, meta_data?.files_uploaded, meta_data?.images_uploaded]);

  const bubbleClass = role === "human" 
  ? "bg-violet-600/15 backdrop-blur-md border border-violet-500/30 rounded-2xl rounded-tr-none" 
  : 'bg-transparent';

  const toggleCollapse = () => {
    setIsCollapsed(!isCollapsed);
  };

  // Determine if message is "small" (less than 100 characters or short height)
  const isSmallMessage = content.length < 100 || (contentHeight && contentHeight < 80);

return (
  <div className={`
    p-2.5 md:p-4 my-2
    ${role === "human" 
      ? "max-w-[85%] sm:max-w-[75%] md:max-w-[65%] self-end" 
      : "max-w-full w-full"
    }
    ${bubbleClass}
  `}>
    <div className="prose prose-invert prose-sm max-w-none text-sm sm:text-[16px] text-white min-w-0">
      {role === "ai" ? (
        <>
          {toolsToShow.length > 0 && <ToolBar tools={toolsToShow} />}
          <Markdown message={displayText} meta_data={meta_data} />
        </>
      ) : (
        <>
          {/* Collapsible Header with Chevron - Only for Human Messages and not small */}
          {!isSmallMessage && (
            <div 
              className="flex items-center justify-between cursor-pointer mb-2"
              onClick={toggleCollapse}
            >
              <span className="text-xs text-violet-300/70 font-medium">You</span>
              <svg 
                className={`w-4 h-4 text-violet-300/70 transition-transform duration-300 ${isCollapsed ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M19 9l-7 7-7-7" 
                />
              </svg>
            </div>
          )}

          {/* Collapsible Content with smooth animation */}
          <div 
            ref={contentRef}
            className="overflow-hidden"
            style={{
              height: isCollapsed && !isSmallMessage ? '80px' : contentHeight ? `${contentHeight}px` : 'auto',
              transition: 'height 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
            }}
          >
            <MessageFileChips files={[...(meta_data?.files_uploaded ?? []), ...(meta_data?.images_uploaded ?? [])] || []} />
            <p style={{ 
              wordBreak: "break-word", 
              overflowWrap: "break-word",
              whiteSpace: "pre-wrap",
              margin: 0,
            }}>
              {displayText}
            </p>
          </div>
        </>
      )}
    </div>
  </div>
);
};

export default ChatBubble;