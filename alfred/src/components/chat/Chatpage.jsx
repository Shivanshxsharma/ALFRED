"use client"

import React from 'react'
import ChatContainer from '@/components/chat/ChatContainer'
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar'
import { AppSidebar } from '@/components/layout/app-sidebar'
import { usechatStore, user_contextStore } from '@/services/contextStrore'
import { useShallow } from 'zustand/shallow'
import Skeleton from '@/components/ui/Skeleton'
import FullPageLoader from '../ui/FullPageLoader'

const Chatpage = ({ chatId }) => {
  const isUserInfoLoading = user_contextStore(useShallow((state) => state.isLoading));
  const isUserInfoLoaded = user_contextStore(useShallow((state) => state.is_user_info_loaded));
  // const isLoadingChat = usechatStore(useShallow((state) => state.isLoadingChat));
  // const isChatLoaded = usechatStore(useShallow((state) => state.isChatLoaded));

  const showFullPageLoader = isUserInfoLoading || !isUserInfoLoaded ;
  if (showFullPageLoader) {
    return <FullPageLoader />;
  }

  return (
    <div className='overflow-hidden static'>
      <SidebarProvider defaultOpen={false}>
        <AppSidebar />
        <SidebarInset>
          <main>
            <div className="p-4z">
              <ChatContainer />
            </div>
          </main>
        </SidebarInset>
      </SidebarProvider>
    </div>
  )
}

export default Chatpage