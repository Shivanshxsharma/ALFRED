import React from 'react'
import ChatInput from '@/components/ui/ChatInput'
import ChatContainer from '@/components/ui/ChatContainer'


import {
  SidebarProvider
  ,SidebarInset,SidebarTrigger
} from '@/components/ui/sidebar'


import { AppSidebar } from '@/components/ui/app-sidebar'
import "../globals.css"

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


