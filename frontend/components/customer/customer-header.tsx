"use client"

import { SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import { useAuth } from "@/components/providers/auth-provider"
import { useEffect, useState } from "react"

export function CustomerHeader() {
  const { user } = useAuth()
  const [initials, setInitials] = useState("...")

  useEffect(() => {
    if (user && user.full_name) {
      const parts = user.full_name.split(" ")
      const init = parts.length > 1 
        ? parts[0][0] + parts[parts.length - 1][0] 
        : parts[0].substring(0, 2)
      setInitials(init.toUpperCase())
    }
  }, [])

  return (
    <header className="flex h-14 items-center gap-4 border-b border-border px-6">
      <SidebarTrigger className="-ml-2" />
      <Separator orientation="vertical" className="h-6" />
      <div className="flex-1" />
      <div className="flex items-center gap-2">
        <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-sm font-medium">
          {initials}
        </div>
      </div>
    </header>
  )
}
