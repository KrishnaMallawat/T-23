"use client"

import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"
import { CustomerSidebar } from "@/components/customer/customer-sidebar"
import { CustomerHeader } from "@/components/customer/customer-header"

export default function CustomerLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <SidebarProvider>
      <CustomerSidebar />
      <SidebarInset>
        <CustomerHeader />
        <main className="flex-1 p-6">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  )
}
