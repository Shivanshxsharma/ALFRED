"use client"

import React, { useEffect, useRef, useState } from 'react'
import ChatInput from './ChatInput'
import Current_chat from './Current_chat'
import { SidebarTrigger } from '@/components/ui/sidebar'
import Skeleton from '@/components/ui/Skeleton'
import { useSearchParams, useRouter, useParams } from 'next/navigation'
import axios from 'axios'
import { useChatActions, usechatStore, user_contextStore } from '@/services/contextStrore'
import { fetchEventSource } from '@microsoft/fetch-event-source'
import { DragDropZone } from './DragDropZone'
import { ErrorBanner } from '@/components/feedback/ErrorBanner'
import { useShallow } from 'zustand/shallow'

const ChatContainer = () => {
  const router = useRouter();
  const { chatId } = useParams();
  const error = usechatStore(useShallow((state) => state.error));

  const isUserInfoLoading = user_contextStore(useShallow((state) => state.isLoading));
  const isUserInfoLoaded = user_contextStore(useShallow((state) => state.is_user_info_loaded));
  const isLoadingChat = usechatStore(useShallow((state) => state.isLoadingChat));
  const isChatLoaded = usechatStore(useShallow((state) => state.isChatLoaded));

  useEffect(() => {
    usechatStore.getState().actions.setcurr_chatid(chatId);
    user_contextStore.getState().actions.fetchUserInfo(router);
    if (chatId) {
      usechatStore.getState().actions.fillOldChat(chatId, router);
    }
  }, [chatId]);

  // Only wait on chat-history loading if there IS a chatId (i.e. we're on
  // /chats/[chatId], an existing conversation). On /chats with no ID,
  // there's nothing to fetch, so the chat-loaded check is skipped entirely.
  const isWaitingOnUser = isUserInfoLoading || !isUserInfoLoaded;
  const isWaitingOnChat = chatId ? (isLoadingChat || !isChatLoaded) : false;
  console.log({ "IS_WAITING_ON_USER": isWaitingOnUser, "IS_WAITING_ON_CHAT": isWaitingOnChat, "IS_USER_INFO_LOADING": isUserInfoLoading, "IS_USER_INFO_LOADED": isUserInfoLoaded, "IS_LOADING_CHAT": isLoadingChat, "IS_CHAT_LOADED": isChatLoaded });
  if ( isWaitingOnChat) {
    return <Skeleton />;
  }

  return (
    <DragDropZone>
      {/* <ErrorBanner message={error} /> */}
      <div className='w-full h-full  absolute  right-0 top-0'>
        <div className='mt-3 ml-2 absolute z-2  '>
          <SidebarTrigger />
        </div>

        <div className='w-[99%] h-[83%]  absolute flex justify-center  right-0 top-0 z-1'>
          <Current_chat router={router} />
        </div>

        <div className='w-full flex justify-center  min-h-[15%]   absolute  bottom-6 left-0 right-0'>
          <div className='flex justify-center items-center w-[90%] md:w-[50%] absolute bottom-0 z-1   min-h-[90%] md:min-h-full'>
            <ChatInput router={router} />
            <div className='text-xs text-zinc-500 absolute -bottom-5'>
              <span>alfred can make mistakes , kidly verify important information</span>
            </div>
          </div>
        </div>
      </div>
    </DragDropZone>
  )
}

export default ChatContainer