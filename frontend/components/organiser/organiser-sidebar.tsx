"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarFooter,
} from "@/components/ui/sidebar"
import { Calendar, Settings, LayoutDashboard, Clock, Briefcase, LogOut } from "lucide-react"

const navItems = [
  { title: "Overview", href: "/organiser", icon: LayoutDashboard },
  { title: "Calendar", href: "/organiser/calendar", icon: Calendar },
  { title: "Services", href: "/organiser/services", icon: Briefcase },
  { title: "Working Hours", href: "/organiser/hours", icon: Clock },
  { title: "Settings", href: "/organiser/settings", icon: Settings },
]

export function OrganiserSidebar() {
  const pathname = usePathname()

  return (
    <Sidebar>
      <SidebarHeader className="border-b border-border px-6 py-4">
        <Link href="/organiser" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-foreground text-background font-semibold text-sm">
            S
          </div>
          <div>
            <span className="font-semibold text-lg">Slotsy</span>
            <span className="ml-2 rounded bg-muted px-1.5 py-0.5 text-xs">Provider</span>
          </div>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Menu</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton asChild isActive={pathname === item.href}>
                    <Link href={item.href}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="border-t border-border p-4">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <Link href="/login">
                <LogOut className="h-4 w-4" />
                <span>Sign Out</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
