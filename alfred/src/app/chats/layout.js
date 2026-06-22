import React from 'react'
import ChatInput from '@/components/chat/ChatInput'
import ChatContainer from '@/components/chat/ChatContainer'


import {
  SidebarProvider
  ,SidebarInset,SidebarTrigger
} from '@/components/ui/sidebar'


import { AppSidebar } from '@/components/layout/app-sidebar'
import "../globals.css"
import { ErrorBanner } from '@/components/feedback/ErrorBanner'
import { usechatStore } from '@/services/contextStrore'

export default function RootLayout({ children }) {
  return (
    <SidebarProvider defaultOpen>
      <AppSidebar />
      <SidebarInset>
         {children}
        </SidebarInset>
    </SidebarProvider>
  )
}


