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
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Card, CardContent } from "@/components/ui/card"
import { Search, MoreHorizontal } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { api, AdminBooking } from "@/lib/api"

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

function getPaymentVariant(status: string) {
  return status === "paid" ? "outline" : "secondary"
}

export function BookingsTable() {
  const [bookings, setBookings] = useState<AdminBooking[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")

  useEffect(() => {
    api.admin.bookings()
      .then(setBookings)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const filteredBookings = bookings.filter((booking) => {
    const matchesSearch =
      booking.customer_name.toLowerCase().includes(search.toLowerCase()) ||
      booking.provider_name.toLowerCase().includes(search.toLowerCase()) ||
      booking.service.toLowerCase().includes(search.toLowerCase())
    const matchesStatus = statusFilter === "all" || booking.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString)
    return {
      date: date.toLocaleDateString("en-IN", {
        month: "short",
        day: "numeric",
      }),
      time: date.toLocaleTimeString("en-IN", {
        hour: "numeric",
        minute: "2-digit",
      }),
    }
  }

  if (loading) {
    return <div className="p-8 text-center text-muted-foreground">Loading bookings...</div>
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
            <Input
              placeholder="Search bookings..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Filter status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="confirmed">Confirmed</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Customer</TableHead>
              <TableHead className="hidden sm:table-cell">Service</TableHead>
              <TableHead className="hidden md:table-cell">Provider</TableHead>
              <TableHead>Date/Time</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="hidden lg:table-cell">Payment</TableHead>
              <TableHead className="w-10"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredBookings.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  No bookings found
                </TableCell>
              </TableRow>
            ) : (
              filteredBookings.map((booking) => {
                const { date, time } = formatDateTime(booking.slot_start)
                return (
                  <TableRow key={booking.id}>
                    <TableCell>
                      <div>
                        <span className="font-medium">{booking.customer_name}</span>
                        <span className="block text-xs text-muted-foreground sm:hidden">
                          {booking.service}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      {booking.service}
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-muted-foreground">
                      {booking.provider_name}
                    </TableCell>
                    <TableCell>
                      <div>
                        <span className="font-medium">{date}</span>
                        <span className="block text-xs text-muted-foreground">
                          {time}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusVariant(booking.status)}>
                        {booking.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      <Badge variant={getPaymentVariant(booking.payment_status)}>
                        {booking.payment_status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="size-8">
                            <MoreHorizontal className="size-4" />
                            <span className="sr-only">Actions</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>View Details</DropdownMenuItem>
                          {booking.status === "pending" && (
                            <DropdownMenuItem>Confirm Booking</DropdownMenuItem>
                          )}
                          {booking.status === "confirmed" && (
                            <DropdownMenuItem>Mark Completed</DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-destructive">
                            Cancel Booking
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
