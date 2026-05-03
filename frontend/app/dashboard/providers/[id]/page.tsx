"use client"

import { useEffect, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Car, Accessibility, ArrowLeft, MapPin, Phone, Mail } from "lucide-react"
import Link from "next/link"
import { api, ProviderDetail } from "@/lib/api"

const BASE = "http://127.0.0.1:5000/api"

interface Slot {
  id: number
  slot_start: string
  slot_end: string
  capacity: number
  booked_count: number
  status: string
}

export default function BusinessDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [provider, setProvider] = useState<ProviderDetail | null>(null)
  const [slots, setSlots] = useState<Slot[]>([])
  const [loading, setLoading] = useState(true)
  const [booking, setBooking] = useState<number | null>(null)
  const [msg, setMsg] = useState("")

  useEffect(() => {
    const token = localStorage.getItem("token")
    if (!token) { router.push("/login"); return }

    api.providers.get(Number(id)).then(setProvider).catch(() => router.push("/dashboard/providers"))

    fetch(`${BASE}/providers/${id}/slots`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store"
    }).then(r => r.json()).then(j => setSlots(j.data ?? [])).catch(() => {})
      .finally(() => setLoading(false))
  }, [id, router])

  async function handleBookClick(slot_id: number) {
    router.push(`/dashboard/checkout?slot_id=${slot_id}`)
  }

  if (loading) return <div className="text-center py-12 text-muted-foreground">Loading...</div>
  if (!provider) return null

  return (
    <div className="space-y-6">
      <Link href="/dashboard/providers" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:underline">
        <ArrowLeft className="h-4 w-4" /> Back to businesses
      </Link>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted text-2xl font-bold">
              {provider.full_name.charAt(0)}
            </div>
            <CardTitle className="mt-3">{provider.full_name}</CardTitle>
            <CardDescription>{provider.bio ?? "No bio provided."}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {(provider.address || provider.phone || provider.email) && (
              <div className="space-y-2 text-sm">
                {provider.address && (
                  <div className="flex items-start gap-2 text-muted-foreground">
                    <MapPin className="h-4 w-4 shrink-0 mt-0.5" />
                    <span>{provider.address}</span>
                  </div>
                )}
                {provider.phone && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Phone className="h-4 w-4 shrink-0" />
                    <span>{provider.phone}</span>
                  </div>
                )}
                {provider.email && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Mail className="h-4 w-4 shrink-0" />
                    <span>{provider.email}</span>
                  </div>
                )}
              </div>
            )}
            
            <div className="flex flex-wrap gap-2 pt-2 border-t">
              {provider.has_parking && (
                <span className="flex items-center gap-1 rounded-full bg-muted px-3 py-1 text-xs"><Car className="h-3 w-3" /> Parking</span>
              )}
              {provider.is_wheelchair_accessible && (
                <span className="flex items-center gap-1 rounded-full bg-muted px-3 py-1 text-xs"><Accessibility className="h-3 w-3" /> Accessible</span>
              )}
              <span className="rounded-full bg-muted px-3 py-1 text-xs capitalize">{provider.noise_level} environment</span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center text-sm pt-2">
              <div className="rounded-md bg-muted p-2">
                <p className="font-semibold">{provider.punctuality_score ?? "—"}</p>
                <p className="text-xs text-muted-foreground">Punctuality</p>
              </div>
              <div className="rounded-md bg-muted p-2">
                <p className="font-semibold">{provider.quality_score ?? "—"}</p>
                <p className="text-xs text-muted-foreground">Quality</p>
              </div>
              <div className="rounded-md bg-muted p-2">
                <p className="font-semibold">{provider.environment_score ?? "—"}</p>
                <p className="text-xs text-muted-foreground">Environment</p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground pt-2">{provider.total_reviews ?? 0} reviews · Member since {new Date(provider.member_since).getFullYear()}</p>
          </CardContent>
        </Card>

        <div className="space-y-4 lg:col-span-2">
          <h2 className="text-xl font-semibold">Services & Available Slots</h2>

          {msg && (
            <div className={`rounded-lg p-3 text-sm ${msg.includes("failed") || msg.includes("already") ? "bg-red-50 text-red-700" : "bg-green-50 text-green-700"}`}>
              {msg}
            </div>
          )}

          {provider.services.length === 0 ? (
            <Card><CardContent className="p-6 text-muted-foreground">No services published yet.</CardContent></Card>
          ) : provider.services.map(service => (
            <Card key={service.id}>
              <CardHeader>
                <CardTitle className="text-base">{service.title}</CardTitle>
                <CardDescription>
                  {service.duration_mins} mins
                  {service.payment_requirement === "mandatory_advance" && service.payment_amount > 0
                    ? ` · ₹${service.payment_amount} advance required`
                    : " · No advance payment"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <h4 className="text-sm font-medium mb-3">Available Slots</h4>
                {slots.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No slots available right now.</p>
                ) : (
                  <div className="grid gap-2 sm:grid-cols-2">
                    {slots.filter(s => s.status === "available").map(slot => (
                      <div key={slot.id} className="flex items-center justify-between rounded-lg border border-border p-3">
                        <div>
                          <p className="text-sm font-medium">{new Date(slot.slot_start).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</p>
                          <p className="text-xs text-muted-foreground">{slot.capacity - slot.booked_count} spot{slot.capacity - slot.booked_count !== 1 ? "s" : ""} left</p>
                        </div>
                        <Button size="sm" onClick={() => handleBookClick(slot.id)}>
                          Book
                        </Button>
                      </div>
                    ))}
                    {slots.filter(s => s.status === "available").length === 0 && (
                      <p className="text-sm text-muted-foreground col-span-2">All slots are full.</p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
