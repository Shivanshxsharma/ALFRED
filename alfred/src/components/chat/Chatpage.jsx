
import React from 'react'
import ChatInput from '@/components/chat/ChatInput'
import ChatContainer from '@/components/chat/ChatContainer'


import {
  SidebarProvider
  ,SidebarInset,SidebarTrigger
} from '@/components/ui/sidebar'


import { AppSidebar } from '@/components/layout/app-sidebar'
import { usechatStore } from '@/services/contextStrore'
import { useShallow } from 'zustand/shallow'



const Chatpage = ({chatId}) => {
  return (    
    
    <div className='overflow-hidden static'>
          
          <SidebarProvider defaultOpen={false}>
      <AppSidebar />
      <SidebarInset>
        <main >
          <div className="p-4z">
              <ChatContainer chatId={chatId} />

          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>

    </div>
  )
}

export default Chatpage