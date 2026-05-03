"use client"

import { useEffect, useState } from "react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { api, AdminRecentBooking } from "@/lib/api"



function getStatusVariant(status: string) {
  switch (status) {
    case "confirmed":
      return "default"
    case "pending":
      return "secondary"
    case "completed":
      return "outline"
    case "cancelled":
      return "destructive"
    default:
      return "secondary"
  }
}

export function RecentBookingsTable() {
  const [bookings, setBookings] = useState<AdminRecentBooking[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.admin.recentBookings()
      .then(setBookings)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return <div className="p-4 text-center text-sm text-muted-foreground">Loading recent bookings...</div>
  }

  if (bookings.length === 0) {
    return <div className="p-4 text-center text-sm text-muted-foreground">No bookings found.</div>
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Customer</TableHead>
          <TableHead className="hidden sm:table-cell">Service</TableHead>
          <TableHead className="hidden md:table-cell">Date</TableHead>
          <TableHead>Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {bookings.map((booking) => (
          <TableRow key={booking.id}>
            <TableCell>
              <div>
                <span className="font-medium">{booking.customer}</span>
                <span className="block text-xs text-muted-foreground sm:hidden">
                  {booking.service}
                </span>
              </div>
            </TableCell>
            <TableCell className="hidden sm:table-cell">
              {booking.service}
            </TableCell>
            <TableCell className="hidden md:table-cell">{booking.date}</TableCell>
            <TableCell>
              <Badge variant={getStatusVariant(booking.status)}>
                {booking.status}
              </Badge>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
