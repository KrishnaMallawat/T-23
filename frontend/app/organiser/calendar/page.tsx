"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ChevronLeft, ChevronRight, MoreHorizontal, Clock } from "lucide-react"
import { api, OrgBooking } from "@/lib/api"

const STATUS_COLORS: Record<string, string> = {
  confirmed: "bg-green-100 text-green-800",
  pending:   "bg-yellow-100 text-yellow-800",
  cancelled: "bg-red-100 text-red-800",
  completed: "bg-blue-100 text-blue-800",
}

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
const DAY_NAMES_FULL = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]

export default function OrganiserCalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [bookings, setBookings] = useState<OrgBooking[]>([])
  const [loading, setLoading] = useState(true)

  const loadBookings = () => {
    setLoading(true)
    api.organiser.bookings()
      .then(setBookings)
      .catch(console.error)
      .finally(() => setLoading(false))
  }

  useEffect(() => { loadBookings() }, [])

  // ── Helpers ───────────────────────────────────────────────────────────────
  const sameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()

  const getWeekStart = (d: Date) => {
    const s = new Date(d)
    s.setDate(d.getDate() - d.getDay()) // Sunday
    s.setHours(0, 0, 0, 0)
    return s
  }

  const prevDay  = () => setCurrentDate(d => new Date(d.getTime() - 86400000))
  const nextDay  = () => setCurrentDate(d => new Date(d.getTime() + 86400000))
  const prevWeek = () => setCurrentDate(d => new Date(d.getTime() - 7 * 86400000))
  const nextWeek = () => setCurrentDate(d => new Date(d.getTime() + 7 * 86400000))

  // ── Day helpers ───────────────────────────────────────────────────────────
  const todaysBookings = bookings.filter(b => sameDay(new Date(b.slot_start), currentDate))

  // ── Week helpers ──────────────────────────────────────────────────────────
  const weekStart = getWeekStart(currentDate)
  const weekDays  = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart)
    d.setDate(weekStart.getDate() + i)
    return d
  })
  const weekLabel = `${weekDays[0].toLocaleDateString("en-IN", { month: "short", day: "numeric" })} – ${weekDays[6].toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" })}`

  const bookingsForDay = (day: Date) =>
    bookings.filter(b => sameDay(new Date(b.slot_start), day))

  // ── Shared booking card ───────────────────────────────────────────────────
  function BookingRow({ booking }: { booking: OrgBooking }) {
    const start = new Date(booking.slot_start)
    const end   = new Date(booking.slot_end)
    const dur   = Math.round((end.getTime() - start.getTime()) / 60000)

    return (
      <div className="flex items-start justify-between rounded-lg border border-border p-4 gap-2">
        <div className="flex gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted font-medium uppercase text-sm">
            {booking.customer_name.charAt(0)}
          </div>
          <div className="space-y-0.5">
            <p className="font-medium text-sm">{booking.customer_name}</p>
            <p className="text-xs text-muted-foreground">{booking.service_title}</p>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              {start.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} ({dur}m)
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[booking.status] ?? "bg-muted"}`}>
            {booking.status}
          </span>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7">
                <MoreHorizontal className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {booking.status === "pending" && (
                <DropdownMenuItem onClick={async () => {
                  await api.organiser.confirmBooking(booking.id).catch(console.error)
                  loadBookings()
                }}>
                  Approve
                </DropdownMenuItem>
              )}
              {booking.status === "confirmed" && (
                <DropdownMenuItem onClick={async () => {
                  try {
                    await api.organiser.completeBooking(booking.id)
                    toast.success("Booking marked as complete!")
                    loadBookings()
                  } catch (error: any) {
                    toast.error(error.message || "Failed to complete booking")
                  }
                }}>
                  Mark as Complete
                </DropdownMenuItem>
              )}
              <DropdownMenuItem className="text-destructive">Cancel</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-12">
      <div>
        <h1 className="text-2xl font-semibold">Calendar</h1>
        <p className="text-muted-foreground">Manage your appointments</p>
      </div>

      <Tabs defaultValue="day">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <TabsList>
            <TabsTrigger value="day">Day</TabsTrigger>
            <TabsTrigger value="week">Week</TabsTrigger>
          </TabsList>

          {/* Day navigator — shown inside Day tab context but rendered here for layout */}
          <TabsContent value="day" className="mt-0 p-0 border-none">
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" onClick={prevDay}><ChevronLeft className="h-4 w-4" /></Button>
              <span className="min-w-44 text-center text-sm font-medium">
                {currentDate.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
              </span>
              <Button variant="outline" size="icon" onClick={nextDay}><ChevronRight className="h-4 w-4" /></Button>
            </div>
          </TabsContent>

          <TabsContent value="week" className="mt-0 p-0 border-none">
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" onClick={prevWeek}><ChevronLeft className="h-4 w-4" /></Button>
              <span className="min-w-52 text-center text-sm font-medium">{weekLabel}</span>
              <Button variant="outline" size="icon" onClick={nextWeek}><ChevronRight className="h-4 w-4" /></Button>
            </div>
          </TabsContent>
        </div>

        {/* ── DAY VIEW ─────────────────────────────────────────────────── */}
        <TabsContent value="day" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>
                {currentDate.toLocaleDateString("en-US", { weekday: "long" })}&apos;s Appointments
              </CardTitle>
              <CardDescription>{todaysBookings.length} booking{todaysBookings.length !== 1 ? "s" : ""} scheduled</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {loading ? (
                <div className="text-center py-8 text-muted-foreground">Loading...</div>
              ) : todaysBookings.length === 0 ? (
                <div className="text-center py-8 border rounded-lg bg-muted/20">
                  <p className="text-sm text-muted-foreground">No appointments scheduled for this day.</p>
                </div>
              ) : (
                todaysBookings.map(b => <BookingRow key={b.id} booking={b} />)
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── WEEK VIEW ────────────────────────────────────────────────── */}
        <TabsContent value="week" className="mt-4">
          {loading ? (
            <div className="text-center py-12 text-muted-foreground">Loading...</div>
          ) : (
            <div className="grid grid-cols-7 gap-2">
              {/* Header row */}
              {weekDays.map(day => {
                const isToday = sameDay(day, new Date())
                const count   = bookingsForDay(day).length
                return (
                  <div
                    key={day.toISOString()}
                    className={`rounded-lg p-2 text-center text-xs font-medium border ${
                      isToday ? "bg-primary text-primary-foreground border-primary" : "bg-muted/50 border-border"
                    }`}
                  >
                    <div>{DAY_NAMES[day.getDay()]}</div>
                    <div className={`text-lg font-bold ${isToday ? "" : "text-foreground"}`}>{day.getDate()}</div>
                    {count > 0 && (
                      <div className={`mt-1 text-xs rounded-full px-1 ${isToday ? "bg-primary-foreground/20 text-primary-foreground" : "bg-primary/10 text-primary"}`}>
                        {count} appt
                      </div>
                    )}
                  </div>
                )
              })}

              {/* Booking rows per day */}
              {weekDays.map(day => {
                const dayBookings = bookingsForDay(day)
                const isToday    = sameDay(day, new Date())
                return (
                  <div
                    key={`bookings-${day.toISOString()}`}
                    className={`rounded-lg border min-h-32 p-1.5 space-y-1.5 ${
                      isToday ? "border-primary/30 bg-primary/5" : "border-border bg-background"
                    }`}
                  >
                    {dayBookings.length === 0 ? (
                      <p className="text-xs text-muted-foreground text-center pt-4">—</p>
                    ) : (
                      dayBookings.map(b => {
                        const start = new Date(b.slot_start)
                        return (
                          <div
                            key={b.id}
                            className={`rounded p-1.5 text-xs cursor-default ${STATUS_COLORS[b.status] ?? "bg-muted"}`}
                            title={`${b.customer_name} · ${b.service_title} · ${start.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`}
                          >
                            <div className="font-semibold truncate">{start.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</div>
                            <div className="truncate opacity-80">{b.customer_name}</div>
                            <div className="truncate opacity-70">{b.service_title}</div>
                          </div>
                        )
                      })
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
