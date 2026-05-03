"use client"

import { useEffect, useState } from "react"
import { Users, Calendar, DollarSign, TrendingUp } from "lucide-react"
import { AdminHeader } from "@/components/admin/admin-header"
import { StatsCard } from "@/components/admin/stats-card"
import { RecentBookingsTable } from "@/components/admin/recent-bookings-table"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { api, AdminStats } from "@/lib/api"

export default function AdminOverviewPage() {
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.admin.stats()
      .then(setStats)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  if (loading || !stats) {
    return <div className="p-8 text-center text-muted-foreground">Loading platform statistics...</div>
  }

  return (
    <div className="flex flex-col">
      <AdminHeader
        title="Overview"
        description="Platform statistics and recent activity"
      />
      <main className="flex-1 p-4 md:p-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatsCard
            title="Total Users"
            value={stats.summary.total_users.toLocaleString('en-IN')}
            icon={Users}
            trend={{ value: 12.5, isPositive: true }}
            description="from last month"
          />
          <StatsCard
            title="Total Bookings"
            value={stats.summary.total_bookings.toLocaleString('en-IN')}
            icon={Calendar}
            trend={{ value: 8.2, isPositive: true }}
            description="from last month"
          />
          <StatsCard
            title="Revenue"
            value={`₹${stats.summary.total_revenue.toLocaleString('en-IN')}`}
            icon={DollarSign}
            trend={{ value: 15.3, isPositive: true }}
            description="from last month"
          />
          <StatsCard
            title="Active Providers"
            value={stats.summary.total_providers}
            icon={TrendingUp}
            trend={{ value: 4, isPositive: true }}
            description="from last month"
          />
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Recent Bookings</CardTitle>
            </CardHeader>
            <CardContent>
              <RecentBookingsTable />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Daily Bookings (Last 7 Days)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {stats.daily_bookings.length > 0 ? (
                  stats.daily_bookings.map((item) => {
                    const maxBookings = Math.max(...stats.daily_bookings.map(d => d.bookings)) || 1
                    const percentage = (item.bookings / maxBookings) * 100
                    return (
                      <div key={item.day} className="flex items-center gap-3">
                        <span className="text-sm text-muted-foreground w-24">
                          {new Date(item.day).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}
                        </span>
                        <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-foreground rounded-full"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                        <span className="text-sm font-medium w-8 text-right">
                          {item.bookings}
                        </span>
                      </div>
                    )
                  })
                ) : (
                  <div className="text-center text-sm text-muted-foreground py-4">No data available</div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
