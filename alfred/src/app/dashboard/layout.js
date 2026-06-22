// app/(dashboard)/layout.jsx
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/layout/app-sidebar"

export default function DashboardLayout({ children }) {
  return (
    <SidebarProvider defaultOpen={false}>
      <AppSidebar />
      <SidebarInset>
        <main className="flex flex-col flex-1 w-full">
          <div className="p-4">
            <SidebarTrigger />
            {children}
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}