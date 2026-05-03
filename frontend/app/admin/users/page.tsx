import { AdminHeader } from "@/components/admin/admin-header"
import { UsersTable } from "@/components/admin/users-table"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"

export default function UsersPage() {
  return (
    <div className="flex flex-col">
      <AdminHeader title="Users" description="Manage platform users and providers">
        <Button size="sm">
          <Plus className="size-4 mr-1" />
          Add User
        </Button>
      </AdminHeader>
      <main className="flex-1 p-4 md:p-6">
        <UsersTable />
      </main>
    </div>
  )
}
