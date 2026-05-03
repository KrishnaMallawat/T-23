"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog"
import { Calendar, Clock, Star } from "lucide-react"
import { api, Booking } from "@/lib/api"

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("en-IN", {
    dateStyle: "medium", timeStyle: "short"
  })
}

function BookingCard({ booking, onCancelled }: { booking: Booking; onCancelled: () => void }) {
  const [feedbackOpen, setFeedbackOpen] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const [scores, setScores] = useState({ punctuality: 80, quality: 80, environment: 80 })
  const isUpcoming = ["confirmed", "pending", "draft"].includes(booking.status)

  async function handleCancel() {
    setCancelling(true)
    try {
      await api.bookings.cancel(booking.id)
      onCancelled()
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Failed to cancel")
    } finally {
      setCancelling(false)
    }
  }

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-3">
            <div>
              <h3 className="font-semibold">{booking.service_title}</h3>
              <p className="text-sm text-muted-foreground">{booking.organiser_name}</p>
            </div>
            <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                {formatDate(booking.slot_start)}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                {booking.duration_mins} mins
              </span>
            </div>
          </div>
          <div className="flex flex-col items-start gap-2 sm:items-end">
            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
              booking.status === "confirmed" ? "bg-green-100 text-green-800"
              : booking.status === "pending" ? "bg-yellow-100 text-yellow-800"
              : booking.status === "cancelled" ? "bg-red-100 text-red-800"
              : "bg-muted text-muted-foreground"
            }`}>
              {booking.status}
            </span>
            <div className="flex gap-2">
              {isUpcoming && (
                <Button variant="outline" size="sm" onClick={handleCancel} disabled={cancelling}>
                  {cancelling ? "Cancelling..." : "Cancel"}
                </Button>
              )}
              {booking.status === "completed" && !booking.has_feedback && (
                <Dialog open={feedbackOpen} onOpenChange={setFeedbackOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Star className="mr-1 h-4 w-4" />
                      Leave Feedback
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Rate Your Experience</DialogTitle>
                      <DialogDescription>Rate your experience with {booking.organiser_name}</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      {(["punctuality", "quality", "environment"] as const).map((cat) => (
                        <div key={cat} className="space-y-2">
                          <label className="text-sm font-medium capitalize">{cat}</label>
                          <div className="flex items-center gap-3">
                            <input
                              type="range" min="0" max="100"
                              value={scores[cat]}
                              onChange={(e) => setScores(s => ({ ...s, [cat]: +e.target.value }))}
                              className="w-full"
                            />
                            <span className="text-sm w-8">{scores[cat]}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setFeedbackOpen(false)}>Cancel</Button>
                      <Button onClick={() => setFeedbackOpen(false)}>Submit Feedback</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              )}
              {booking.status === "completed" && booking.has_feedback && (
                <span className="text-sm text-muted-foreground">Feedback submitted</span>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default function CustomerBookingsPage() {
  const router = useRouter()
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)

  function fetchBookings() {
    api.bookings.mine().then(setBookings).catch(() => router.push("/login")).finally(() => setLoading(false))
  }

  useEffect(() => { fetchBookings() }, [])

  const upcoming = bookings.filter(b => ["confirmed", "pending", "draft"].includes(b.status))
  const past = bookings.filter(b => ["completed", "cancelled", "no_show"].includes(b.status))

  if (loading) return <div className="text-center py-12 text-muted-foreground">Loading bookings...</div>

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">My Bookings</h1>
        <p className="text-muted-foreground">Manage your upcoming and past appointments</p>
      </div>

      <Tabs defaultValue="upcoming">
        <TabsList>
          <TabsTrigger value="upcoming">Upcoming ({upcoming.length})</TabsTrigger>
          <TabsTrigger value="past">Past ({past.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="upcoming" className="mt-4 space-y-4">
          {upcoming.length === 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>No upcoming bookings</CardTitle>
                <CardDescription>Find a provider to book your next appointment.</CardDescription>
              </CardHeader>
            </Card>
          ) : (
            upcoming.map(b => <BookingCard key={b.id} booking={b} onCancelled={fetchBookings} />)
          )}
        </TabsContent>
        <TabsContent value="past" className="mt-4 space-y-4">
          {past.length === 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>No past bookings</CardTitle>
                <CardDescription>Your booking history will appear here.</CardDescription>
              </CardHeader>
            </Card>
          ) : (
            past.map(b => <BookingCard key={b.id} booking={b} onCancelled={fetchBookings} />)
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
