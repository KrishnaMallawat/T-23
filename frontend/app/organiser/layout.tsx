"use client"

import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"
import { OrganiserSidebar } from "@/components/organiser/organiser-sidebar"
import { OrganiserHeader } from "@/components/organiser/organiser-header"

import { AuthGuard } from "@/components/auth/auth-guard"

export default function OrganiserLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <AuthGuard allowedRoles={["organiser"]}>
      <SidebarProvider>
        <OrganiserSidebar />
        <SidebarInset>
          <OrganiserHeader />
          <main className="flex-1 p-6">{children}</main>
        </SidebarInset>
      </SidebarProvider>
    </AuthGuard>
  )
}
