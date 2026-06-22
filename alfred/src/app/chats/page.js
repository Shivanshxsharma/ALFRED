
import React from 'react'
import ChatInput from '@/components/chat/ChatInput'
import ChatContainer from '@/components/chat/ChatContainer'


import {
  SidebarProvider
  ,SidebarInset,SidebarTrigger
} from '@/components/ui/sidebar'


import { AppSidebar } from '@/components/layout/app-sidebar'
import Chatpage from '@/components/chat/Chatpage'



const page = () => {
  return (    
    <ChatContainer />
  )
}

export default page
