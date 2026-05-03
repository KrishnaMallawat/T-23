import { AdminHeader } from "@/components/admin/admin-header"
import { BookingsTable } from "@/components/admin/bookings-table"

export default function BookingsPage() {
  return (
    <div className="flex flex-col">
      <AdminHeader
        title="Bookings"
        description="View and manage all platform bookings"
      />
      <main className="flex-1 p-4 md:p-6">
        <BookingsTable />
      </main>
    </div>
  )
}
