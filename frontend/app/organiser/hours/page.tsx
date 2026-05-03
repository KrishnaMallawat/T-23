"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { api, Service } from "@/lib/api"

const initialDays = [
  { id: 0, name: "Monday", enabled: false, start: "09:00", end: "17:00" },
  { id: 1, name: "Tuesday", enabled: false, start: "09:00", end: "17:00" },
  { id: 2, name: "Wednesday", enabled: false, start: "09:00", end: "17:00" },
  { id: 3, name: "Thursday", enabled: false, start: "09:00", end: "17:00" },
  { id: 4, name: "Friday", enabled: false, start: "09:00", end: "17:00" },
  { id: 5, name: "Saturday", enabled: false, start: "10:00", end: "14:00" },
  { id: 6, name: "Sunday", enabled: false, start: "", end: "" },
]

export default function OrganiserHoursPage() {
  const [workingHours, setWorkingHours] = useState(initialDays)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState("")

  const [generateDialogOpen, setGenerateDialogOpen] = useState(false)
  const [services, setServices] = useState<Service[]>([])
  const [selectedService, setSelectedService] = useState("")
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [generating, setGenerating] = useState(false)
  const [genMsg, setGenMsg] = useState("")

  useEffect(() => {
    Promise.all([
      api.organiser.getWorkingHours(),
      api.organiser.services(),
    ]).then(([hours, srvs]) => {
      setServices(srvs)
      if (hours && hours.length > 0) {
        const newDays = [...initialDays]
        hours.forEach(h => {
          const idx = newDays.findIndex(d => d.id === h.day_of_week)
          if (idx !== -1) {
            newDays[idx] = {
              ...newDays[idx],
              enabled: h.is_active,
              start: h.start_time.substring(0, 5),
              end: h.end_time.substring(0, 5)
            }
          }
        })
        setWorkingHours(newDays)
      }
    }).catch(console.error).finally(() => setLoading(false))
  }, [])

  const toggleDay = (id: number) => {
    setWorkingHours((prev) =>
      prev.map((day) => (day.id === id ? { ...day, enabled: !day.enabled } : day))
    )
  }

  const updateTime = (id: number, field: "start" | "end", value: string) => {
    setWorkingHours((prev) =>
      prev.map((day) => (day.id === id ? { ...day, [field]: value } : day))
    )
  }

  async function handleSave() {
    setSaving(true)
    setMsg("")
    try {
      for (const d of workingHours) {
        if (d.enabled && d.start >= d.end) {
          throw new Error(`Invalid time for ${d.name}. Start time must be before end time.`)
        }
      }

      await Promise.all(
        workingHours.map(d => 
          api.organiser.setWorkingHour({
            day_of_week: d.id,
            start_time: d.start || "00:00",
            end_time: d.end || "00:00",
            is_active: d.enabled
          })
        )
      )
      setMsg("Working hours saved successfully")
    } catch (e: unknown) {
      setMsg(e instanceof Error ? e.message : "Failed to save")
    } finally {
      setSaving(false)
    }
  }

  async function handleGenerateSlots() {
    setGenMsg("")
    if (!selectedService) { setGenMsg("Please select a service"); return }
    if (!startDate || !endDate) { setGenMsg("Start and End dates are required"); return }
    if (new Date(endDate) < new Date(startDate)) { setGenMsg("End date must be on or after start date"); return }

    setGenerating(true)
    try {
      const res = await api.organiser.generateSlots(Number(selectedService), startDate, endDate)
      setGenMsg(res.message)
      setTimeout(() => setGenerateDialogOpen(false), 2000)
    } catch (e: unknown) {
      setGenMsg(e instanceof Error ? e.message : "Failed to generate slots")
    } finally {
      setGenerating(false)
    }
  }

  if (loading) return <div className="text-center py-12 text-muted-foreground">Loading...</div>

  return (
    <div className="space-y-6 pb-12">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Working Hours</h1>
          <p className="text-muted-foreground">Set your weekly availability</p>
        </div>
        <Dialog open={generateDialogOpen} onOpenChange={(open) => {
          setGenerateDialogOpen(open)
          if (!open) setGenMsg("")
        }}>
          <DialogTrigger asChild>
            <Button>Generate Slots</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Generate Slots</DialogTitle>
              <DialogDescription>
                Automatically create appointment slots based on your active working hours.
              </DialogDescription>
            </DialogHeader>
            {genMsg && (
              <div className={`p-2 text-sm rounded ${genMsg.includes("Failed") || genMsg.includes("Please") || genMsg.includes("required") ? "bg-red-50 text-red-700" : "bg-green-50 text-green-700"}`}>
                {genMsg}
              </div>
            )}
            <div className="space-y-4">
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="service">Service Type</FieldLabel>
                  <Select value={selectedService} onValueChange={setSelectedService}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select service" />
                    </SelectTrigger>
                    <SelectContent>
                      {services.map(s => (
                        <SelectItem key={s.id} value={s.id.toString()}>{s.title} ({s.duration_mins} min)</SelectItem>
                      ))}
                      {services.length === 0 && <SelectItem value="none" disabled>No services created</SelectItem>}
                    </SelectContent>
                  </Select>
                </Field>
                <Field>
                  <FieldLabel htmlFor="startDate">Start Date</FieldLabel>
                  <Input id="startDate" type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
                </Field>
                <Field>
                  <FieldLabel htmlFor="endDate">End Date</FieldLabel>
                  <Input id="endDate" type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
                </Field>
              </FieldGroup>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setGenerateDialogOpen(false)} disabled={generating}>
                Cancel
              </Button>
              <Button onClick={handleGenerateSlots} disabled={generating}>
                {generating ? "Generating..." : "Generate"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {msg && (
        <div className={`p-3 text-sm rounded-lg ${msg.includes("Failed") ? "bg-red-50 text-red-700 border-red-200" : "bg-green-50 text-green-700 border-green-200"} border`}>
          {msg}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Weekly Schedule</CardTitle>
          <CardDescription>Configure your availability for each day of the week</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {workingHours.map((day) => (
            <div
              key={day.id}
              className={`flex items-center justify-between rounded-lg border border-border p-4 transition-colors ${!day.enabled ? "bg-muted/30" : ""}`}
            >
              <div className="flex items-center gap-4">
                <Switch checked={day.enabled} onCheckedChange={() => toggleDay(day.id)} />
                <Label className="w-24 font-medium">{day.name}</Label>
              </div>
              {day.enabled ? (
                <div className="flex items-center gap-2">
                  <Input
                    type="time"
                    value={day.start}
                    onChange={(e) => updateTime(day.id, "start", e.target.value)}
                    className="w-32"
                  />
                  <span className="text-muted-foreground">to</span>
                  <Input
                    type="time"
                    value={day.end}
                    onChange={(e) => updateTime(day.id, "end", e.target.value)}
                    className="w-32"
                  />
                </div>
              ) : (
                <span className="text-sm text-muted-foreground w-64 text-right pr-2">Closed</span>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? "Saving..." : "Save Working Hours"}
        </Button>
      </div>
    </div>
  )
}
