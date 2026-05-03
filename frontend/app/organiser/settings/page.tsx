"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { api, ProviderDetail } from "@/lib/api"
import { useAuth } from "@/components/providers/auth-provider"

export default function OrganiserSettingsPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null)

  const [businessName, setBusinessName] = useState("")
  const [bio, setBio] = useState("")
  const [address, setAddress] = useState("")
  const [phone, setPhone] = useState("")
  const [parking, setParking] = useState(false)
  const [accessible, setAccessible] = useState(false)
  const [noiseLevel, setNoiseLevel] = useState<"quiet" | "moderate" | "loud">("moderate")
  const { user, login, token } = useAuth()

  useEffect(() => {
    if (!user) return
    api.providers.get(user.id)
      .then((p: ProviderDetail) => {
        setBusinessName(p.full_name || "")
        setBio(p.bio || "")
        setAddress(p.address || "")
        setPhone(p.phone || "")
        setParking(!!p.has_parking)
        setAccessible(!!p.is_wheelchair_accessible)
        setNoiseLevel((p.noise_level as "quiet" | "moderate" | "loud") || "moderate")
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setMsg(null)
    try {
      await api.user.updateProfile(businessName)
      await api.organiser.updateProfile({
        bio,
        address,
        phone,
        has_parking: parking,
        is_wheelchair_accessible: accessible,
        noise_level: noiseLevel,
      })
      setMsg({ text: "Settings saved successfully!", ok: true })

      if (user && token) {
        login(token, { ...user, full_name: businessName })
      }
    } catch (err: unknown) {
      setMsg({ text: err instanceof Error ? err.message : "Failed to save settings", ok: false })
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="text-center py-12 text-muted-foreground">Loading...</div>

  return (
    <div className="space-y-6 pb-12">
      <div>
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="text-muted-foreground">Manage your provider profile</p>
      </div>

      {msg && (
        <div className={`p-3 text-sm rounded-lg max-w-2xl border ${
          msg.ok
            ? "bg-green-50 text-green-700 border-green-200"
            : "bg-red-50 text-red-700 border-red-200"
        }`}>
          {msg.text}
        </div>
      )}

      <form onSubmit={handleSave} className="max-w-2xl space-y-6">
        {/* Business Profile */}
        <Card>
          <CardHeader>
            <CardTitle>Business Profile</CardTitle>
            <CardDescription>Your public-facing business information shown to customers</CardDescription>
          </CardHeader>
          <CardContent>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="businessName">Business Name</FieldLabel>
                <Input
                  id="businessName"
                  value={businessName}
                  onChange={e => setBusinessName(e.target.value)}
                  required
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="bio">Bio</FieldLabel>
                <Textarea
                  id="bio"
                  rows={4}
                  value={bio}
                  onChange={e => setBio(e.target.value)}
                  placeholder="Describe your business..."
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="address">Address</FieldLabel>
                <Input
                  id="address"
                  value={address}
                  onChange={e => setAddress(e.target.value)}
                  placeholder="e.g. 123 Main Street, Downtown"
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="phone">Phone</FieldLabel>
                <Input
                  id="phone"
                  type="tel"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  placeholder="e.g. +91 98765 43210"
                />
              </Field>
            </FieldGroup>
          </CardContent>
        </Card>

        {/* Amenities */}
        <Card>
          <CardHeader>
            <CardTitle>Amenities</CardTitle>
            <CardDescription>Facilities available at your location — shown to customers on your provider page</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div>
                <Label htmlFor="parking" className="font-medium cursor-pointer">Parking Available</Label>
                <p className="text-sm text-muted-foreground">Do you have parking for customers?</p>
              </div>
              <Switch id="parking" checked={parking} onCheckedChange={setParking} />
            </div>
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div>
                <Label htmlFor="accessible" className="font-medium cursor-pointer">Wheelchair Accessible</Label>
                <p className="text-sm text-muted-foreground">Is your location accessible?</p>
              </div>
              <Switch id="accessible" checked={accessible} onCheckedChange={setAccessible} />
            </div>
            <Field>
              <FieldLabel htmlFor="noiseLevel">Environment / Noise Level</FieldLabel>
              <Select value={noiseLevel} onValueChange={v => setNoiseLevel(v as "quiet" | "moderate" | "loud")}>
                <SelectTrigger id="noiseLevel">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="quiet">Quiet — calm, silent environment</SelectItem>
                  <SelectItem value="moderate">Moderate — normal ambient noise</SelectItem>
                  <SelectItem value="loud">Loud — energetic or noisy environment</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </CardContent>
        </Card>

        <Button type="submit" disabled={saving} className="w-full sm:w-auto">
          {saving ? "Saving..." : "Save Settings"}
        </Button>
      </form>
    </div>
  )
}
