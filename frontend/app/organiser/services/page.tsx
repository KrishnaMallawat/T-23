"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Plus, Clock, DollarSign, MoreHorizontal, Pencil, Trash2 } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { api, Service } from "@/lib/api"

// ─── Shared Service Form ─────────────────────────────────────────────────────
interface ServiceFormProps {
  title: string; setTitle: (v: string) => void
  category: string; setCategory: (v: string) => void
  duration: string; setDuration: (v: string) => void
  paymentReq: string; setPaymentReq: (v: string) => void
  amount: string; setAmount: (v: string) => void
  allowCancel: boolean; setAllowCancel: (v: boolean) => void
  allowResched: boolean; setAllowResched: (v: boolean) => void
  error: string
}

function ServiceForm({ title, setTitle, category, setCategory, duration, setDuration, paymentReq, setPaymentReq, amount, setAmount, allowCancel, setAllowCancel, allowResched, setAllowResched, error }: ServiceFormProps) {
  return (
    <div className="space-y-4">
      {error && <div className="text-red-500 text-sm bg-red-50 p-2 rounded border border-red-200">{error}</div>}
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="svc-title">Service Name</FieldLabel>
          <Input id="svc-title" placeholder="e.g., Haircut" value={title} onChange={e => setTitle(e.target.value)} />
        </Field>
        <Field>
          <FieldLabel htmlFor="svc-category">Category</FieldLabel>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger id="svc-category">
              <SelectValue placeholder="Select a category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Healthcare">Healthcare</SelectItem>
              <SelectItem value="Sports">Sports</SelectItem>
              <SelectItem value="Lifestyle">Lifestyle</SelectItem>
              <SelectItem value="Education">Education</SelectItem>
              <SelectItem value="Beauty">Beauty</SelectItem>
              <SelectItem value="Other">Other</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        <Field>
          <FieldLabel htmlFor="svc-duration">Duration (minutes)</FieldLabel>
          <Input id="svc-duration" type="number" min="5" placeholder="60" value={duration} onChange={e => setDuration(e.target.value)} />
        </Field>
        <Field>
          <FieldLabel htmlFor="svc-payment">Payment Requirement</FieldLabel>
          <Select value={paymentReq} onValueChange={setPaymentReq}>
            <SelectTrigger id="svc-payment">
              <SelectValue placeholder="Select option" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No Payment Required</SelectItem>
              <SelectItem value="mandatory_advance">Advance Payment</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        {paymentReq === "mandatory_advance" && (
          <Field>
            <FieldLabel htmlFor="svc-amount">Payment Amount (₹)</FieldLabel>
            <Input id="svc-amount" type="number" min="0" placeholder="0.00" value={amount} onChange={e => setAmount(e.target.value)} />
          </Field>
        )}
      </FieldGroup>
      <div className="space-y-3 pt-1">
        <div className="flex items-center justify-between rounded-lg border border-border p-3">
          <Label htmlFor="svc-cancel" className="cursor-pointer">Allow Cancellation</Label>
          <Switch id="svc-cancel" checked={allowCancel} onCheckedChange={setAllowCancel} />
        </div>
        <div className="flex items-center justify-between rounded-lg border border-border p-3">
          <Label htmlFor="svc-resched" className="cursor-pointer">Allow Rescheduling</Label>
          <Switch id="svc-resched" checked={allowResched} onCheckedChange={setAllowResched} />
        </div>
      </div>
    </div>
  )
}

// ─── Main Page ───────────────────────────────────────────────────────────────
export default function OrganiserServicesPage() {
  const [services, setServices] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  // Create dialog
  const [createOpen, setCreateOpen] = useState(false)
  const [creating, setCreating] = useState(false)

  // Edit dialog
  const [editOpen, setEditOpen] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)

  // Delete dialog
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [deleting, setDeleting] = useState(false)

  // Shared form state (used for both create and edit)
  const [title, setTitle] = useState("")
  const [category, setCategory] = useState("")
  const [duration, setDuration] = useState("60")
  const [paymentReq, setPaymentReq] = useState("none")
  const [amount, setAmount] = useState("0")
  const [allowCancel, setAllowCancel] = useState(true)
  const [allowResched, setAllowResched] = useState(true)
  const [formError, setFormError] = useState("")

  const loadServices = () => {
    setLoading(true)
    api.organiser.services()
      .then(setServices)
      .catch(console.error)
      .finally(() => setLoading(false))
  }

  useEffect(() => { loadServices() }, [])

  function resetForm() {
    setTitle(""); setCategory(""); setDuration("60"); setPaymentReq("none")
    setAmount("0"); setAllowCancel(true); setAllowResched(true)
    setFormError("")
  }

  function openEdit(service: any) {
    setEditingId(service.id)
    setTitle(service.title)
    setCategory(service.category || "")
    setDuration(String(service.duration_mins))
    setPaymentReq(service.payment_requirement || "none")
    setAmount(String(service.payment_amount || 0))
    setAllowCancel(service.allow_cancellation ?? true)
    setAllowResched(service.allow_rescheduling ?? true)
    setFormError("")
    setEditOpen(true)
  }

  function openDelete(id: number) {
    setDeletingId(id)
    setDeleteOpen(true)
  }

  function buildPayload() {
    return {
      title,
      description: "",
      category,
      duration_mins: parseInt(duration),
      payment_requirement: paymentReq,
      payment_amount: parseFloat(amount),
      allow_cancellation: allowCancel,
      allow_rescheduling: allowResched,
    }
  }

  function validate() {
    if (!title.trim()) { setFormError("Service Name is required"); return false }
    if (!category.trim()) { setFormError("Category is required"); return false }
    if (!duration || parseInt(duration) <= 0) { setFormError("Valid duration is required"); return false }
    return true
  }

  async function handleCreate() {
    if (!validate()) return
    setCreating(true)
    try {
      await api.organiser.createService(buildPayload())
      setCreateOpen(false)
      resetForm()
      loadServices()
    } catch (e: unknown) {
      setFormError(e instanceof Error ? e.message : "Failed to create service")
    } finally { setCreating(false) }
  }

  async function handleEdit() {
    if (!validate() || !editingId) return
    setSaving(true)
    try {
      await api.organiser.updateService(editingId, buildPayload())
      setEditOpen(false)
      resetForm()
      loadServices()
    } catch (e: unknown) {
      setFormError(e instanceof Error ? e.message : "Failed to save changes")
    } finally { setSaving(false) }
  }

  async function handleDelete() {
    if (!deletingId) return
    setDeleting(true)
    try {
      await api.organiser.deleteService(deletingId)
      setDeleteOpen(false)
      setDeletingId(null)
      loadServices()
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Failed to delete service")
    } finally { setDeleting(false) }
  }

  async function togglePublish(service: any) {
    try {
      if (service.is_published) {
        await api.organiser.unpublishService(service.id)
      } else {
        await api.organiser.publishService(service.id)
      }
      loadServices()
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Failed to update publish status")
    }
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Services</h1>
          <p className="text-muted-foreground">Configure your appointment types</p>
        </div>

        {/* Create Dialog */}
        <Dialog open={createOpen} onOpenChange={open => { setCreateOpen(open); if (!open) resetForm() }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Service
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Add New Service</DialogTitle>
              <DialogDescription>Create a new service offering for your customers.</DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <ServiceForm
                title={title} setTitle={setTitle}
                category={category} setCategory={setCategory}
                duration={duration} setDuration={setDuration}
                paymentReq={paymentReq} setPaymentReq={setPaymentReq}
                amount={amount} setAmount={setAmount}
                allowCancel={allowCancel} setAllowCancel={setAllowCancel}
                allowResched={allowResched} setAllowResched={setAllowResched}
                error={formError}
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { setCreateOpen(false); resetForm() }} disabled={creating}>Cancel</Button>
              <Button onClick={handleCreate} disabled={creating}>{creating ? "Creating…" : "Create Service"}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={open => { setEditOpen(open); if (!open) resetForm() }}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Service</DialogTitle>
            <DialogDescription>Update the details of your service offering.</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <ServiceForm
              title={title} setTitle={setTitle}
              category={category} setCategory={setCategory}
              duration={duration} setDuration={setDuration}
              paymentReq={paymentReq} setPaymentReq={setPaymentReq}
              amount={amount} setAmount={setAmount}
              allowCancel={allowCancel} setAllowCancel={setAllowCancel}
              allowResched={allowResched} setAllowResched={setAllowResched}
              error={formError}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setEditOpen(false); resetForm() }} disabled={saving}>Cancel</Button>
            <Button onClick={handleEdit} disabled={saving}>{saving ? "Saving…" : "Save Changes"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Service?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this service, all its generated slots, and any associated data.
              Existing bookings will NOT be affected. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deleting ? "Deleting…" : "Yes, Delete Service"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Service Cards */}
      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Loading services...</div>
      ) : services.length === 0 ? (
        <div className="text-center py-12 border rounded-xl bg-muted/20">
          <p className="text-muted-foreground">No services yet. Click &quot;Add Service&quot; to create one.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {services.map((service) => (
            <Card key={service.id} className={!service.is_published ? "opacity-70" : ""}>
              <CardHeader className="flex flex-row items-start justify-between">
                <div className="flex-1 min-w-0">
                  <CardTitle className="truncate">{service.title}</CardTitle>
                  <CardDescription className="mt-1 flex items-center gap-3">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {service.duration_mins} min
                    </span>
                    {service.payment_requirement === "mandatory_advance" && service.payment_amount > 0 && (
                      <span className="flex items-center gap-1">
                        <DollarSign className="h-3 w-3" />
                        {service.payment_amount}
                      </span>
                    )}
                  </CardDescription>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="shrink-0">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => togglePublish(service)}>
                      {service.is_published ? "Unpublish" : "Publish"}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => openEdit(service)}>
                      <Pencil className="mr-2 h-4 w-4" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive"
                      onClick={() => openDelete(service.id)}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2 text-xs">
                  {service.is_published
                    ? <span className="rounded bg-green-100 px-2 py-1 text-green-800">Published</span>
                    : <span className="rounded bg-yellow-100 px-2 py-1 text-yellow-800">Draft</span>
                  }
                  {service.payment_requirement === "mandatory_advance" && (
                    <span className="rounded bg-muted px-2 py-1">Advance Payment</span>
                  )}
                  {service.allow_cancellation && (
                    <span className="rounded bg-blue-50 px-2 py-1 text-blue-800">Cancellation OK</span>
                  )}
                  {service.allow_rescheduling && (
                    <span className="rounded bg-purple-50 px-2 py-1 text-purple-800">Rescheduling OK</span>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
