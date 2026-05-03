"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Calendar, Users, Star, Clock } from "lucide-react"
import { api, OrgStats, OrgBooking } from "@/lib/api"
import { getUser } from "@/lib/api"

function fmt12h(hour: number) {
  if (hour === 0) return "12 AM"
  if (hour < 12) return `${hour} AM`
  if (hour === 12) return "12 PM"
  return `${hour - 12} PM`
}

export default function OrganiserDashboard() {
  const router = useRouter()
  const user = getUser()
  const [stats, setStats] = useState<OrgStats | null>(null)
  const [bookings, setBookings] = useState<OrgBooking[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      api.organiser.stats(),
      api.organiser.bookings("confirmed"),
    ]).then(([s, b]) => {
      setStats(s)
      setBookings(b.slice(0, 5))
    }).catch(() => router.push("/login"))
     .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="text-center py-12 text-muted-foreground">Loading...</div>

  const s = stats?.summary
  const maxPeak = Math.max(...(stats?.peak_hours.map(h => h.booking_count) ?? [1]))

  const statCards = [
    { title: "Total Bookings", value: s?.total_bookings ?? 0, icon: Calendar, description: "All time" },
    { title: "Customers", value: s?.unique_customers ?? 0, icon: Users, description: "Unique customers" },
    { title: "Avg Punctuality", value: s?.avg_punctuality ? `${s.avg_punctuality}/100` : "—", icon: Clock, description: "Based on reviews" },
    { title: "Avg Quality", value: s?.avg_quality ? `${s.avg_quality}/100` : "—", icon: Star, description: "Based on reviews" },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="text-muted-foreground">Welcome back, {user?.full_name}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground">{stat.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Your Scores</CardTitle>
            <CardDescription>Based on customer feedback</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {[
              { label: "Punctuality", value: s?.avg_punctuality ?? 0 },
              { label: "Quality", value: s?.avg_quality ?? 0 },
            ].map((score) => (
              <div key={score.label} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>{score.label}</span>
                  <span className="font-medium">{score.value ?? "—"}/100</span>
                </div>
                <div className="h-2 rounded-full bg-muted">
                  <div
                    className="h-2 rounded-full bg-foreground"
                    style={{ width: `${score.value ?? 0}%` }}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Peak Hours</CardTitle>
            <CardDescription>Booking distribution by hour</CardDescription>
          </CardHeader>
          <CardContent>
            {(stats?.peak_hours.length ?? 0) > 0 ? (
              <div className="flex items-end gap-2 h-40">
                {stats!.peak_hours.map((hour) => (
                  <div key={hour.hour} className="flex-1 flex flex-col items-center gap-1">
                    <div
                      className="w-full bg-foreground rounded-t"
                      style={{ height: `${(hour.booking_count / maxPeak) * 100}%` }}
                    />
                    <span className="text-xs text-muted-foreground">{fmt12h(hour.hour)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">No data yet</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Bookings</CardTitle>
          <CardDescription>Confirmed upcoming appointments</CardDescription>
        </CardHeader>
        <CardContent>
          {bookings.length === 0 ? (
            <p className="text-sm text-muted-foreground">No confirmed bookings yet.</p>
          ) : (
            <div className="space-y-4">
              {bookings.map((booking) => (
                <div
                  key={booking.id}
                  className="flex items-center justify-between rounded-lg border border-border p-4"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted font-medium">
                      {booking.customer_name.charAt(0)}
                    </div>
                    <div>
                      <p className="font-medium">{booking.customer_name}</p>
                      <p className="text-sm text-muted-foreground">{booking.service_title}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-sm font-medium flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {new Date(booking.slot_start).toLocaleTimeString("en-IN", { timeStyle: "short" })}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(booking.slot_start).toLocaleDateString("en-IN", { dateStyle: "medium" })}
                      </p>
                    </div>
                    <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-green-100 text-green-800">
                      {booking.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
