"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { Calendar, Clock, Star, ArrowRight } from "lucide-react"
import { api, Booking, Provider } from "@/lib/api"
import { getUser } from "@/lib/api"

export default function CustomerDashboard() {
  const user = getUser()
  const [bookings, setBookings] = useState<Booking[]>([])
  const [providers, setProviders] = useState<Provider[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      api.bookings.mine(),
      api.providers.list(),
    ]).then(([b, p]) => {
      setBookings(b)
      setProviders(p.slice(0, 3))
    }).catch(console.error)
     .finally(() => setLoading(false))
  }, [])

  const upcoming = bookings.filter(b => ["confirmed", "pending", "draft"].includes(b.status))
  const completed = bookings.filter(b => b.status === "completed")
  const feedbackCount = bookings.filter(b => b.has_feedback).length

  if (loading) return <div className="text-center py-12 text-muted-foreground">Loading...</div>

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Welcome back, {user?.full_name?.split(" ")[0] ?? "there"}</h1>
        <p className="text-muted-foreground">Here&apos;s what&apos;s happening with your bookings</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Upcoming</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{upcoming.length}</div>
            <p className="text-xs text-muted-foreground">appointments upcoming</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{completed.length}</div>
            <p className="text-xs text-muted-foreground">total bookings</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Reviews Given</CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{feedbackCount}</div>
            <p className="text-xs text-muted-foreground">feedback submitted</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Upcoming Bookings</CardTitle>
            <CardDescription>Your next scheduled appointments</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {upcoming.length === 0 ? (
                <p className="text-sm text-muted-foreground">No upcoming bookings.</p>
              ) : upcoming.slice(0, 3).map((booking) => (
                <div key={booking.id} className="flex items-center justify-between rounded-lg border border-border p-4">
                  <div className="space-y-1">
                    <p className="font-medium">{booking.service_title}</p>
                    <p className="text-sm text-muted-foreground">{booking.organiser_name}</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(booking.slot_start).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      booking.status === "confirmed" ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"
                    }`}>
                      {booking.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4">
              <Button variant="outline" className="w-full" asChild>
                <Link href="/dashboard/bookings">
                  View All Bookings
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recommended for You</CardTitle>
            <CardDescription>Based on your preferences</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {providers.map((provider) => (
                <div key={provider.id} className="flex items-center justify-between rounded-lg border border-border p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted font-medium">
                      {provider.full_name.charAt(0)}
                    </div>
                    <div>
                      <p className="font-medium">{provider.full_name}</p>
                      <p className="text-sm text-muted-foreground">{provider.noise_level} environment</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-green-600">{Math.round(provider.match_percentage)}%</p>
                    <p className="text-xs text-muted-foreground">match</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4">
              <Button variant="outline" className="w-full" asChild>
                <Link href="/dashboard/providers">
                  Find More Providers
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
