"use client"

import React, { use, useEffect,useRef, useState } from 'react'
import ChatInput from './ChatInput'
import Current_chat from './Current_chat'
import { SidebarTrigger } from './sidebar'
import Skeleton from './Skeleton'
import { useSearchParams ,useRouter, useParams } from 'next/navigation'
import axios from 'axios'
import { useChatActions, usechatStore, user_contextStore } from '@/services/contextStrore'
import {fetchEventSource} from '@microsoft/fetch-event-source'
import { DragDropZone } from './DragDropZone'




const ChatContainer = () => {
  const router = useRouter();
  const {chatId} = useParams(); 
  








  
useEffect(() => {
usechatStore.getState().actions.setcurr_chatid(chatId);
user_contextStore.getState().actions.fetchUserInfo(router);

}, [])




  return (
    
    // !isLoaded?
    // <Skeleton/>
    // :

    <DragDropZone>
    <div className='w-full h-full  absolute  right-0 top-0'>
      <div className='mt-3 ml-2 absolute z-2  '>
        <SidebarTrigger/>
      </div>
      
     <div className='w-[99%] h-[83%]  absolute flex justify-center  right-0 top-0 z-1'>
           <Current_chat  />
       </div>
       
      <div className='w-full flex justify-center  min-h-[15%]   absolute  bottom-3 left-0 right-0'>
        <div className='flex justify-center items-center w-[90%] md:w-[50%] absolute bottom-0 z-1   min-h-[90%] md:min-h-full'>
          <ChatInput router={router} />
        </div>

      </div>
  </div>

  </DragDropZone>
    
  )
}

export default ChatContainer