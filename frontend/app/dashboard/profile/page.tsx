"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { api, UserProfile } from "@/lib/api"

export default function ProfilePage() {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [fullName, setFullName] = useState("")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState("")

  useEffect(() => {
    api.user.me().then(p => {
      setProfile(p)
      setFullName(p.full_name)
    }).catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setMsg("")
    try {
      await api.user.updateProfile(fullName)
      setMsg("Profile updated successfully")
      // Update local storage user
      const local = localStorage.getItem("user")
      if (local) {
        const u = JSON.parse(local)
        u.full_name = fullName
        localStorage.setItem("user", JSON.stringify(u))
        // Trigger a fake storage event so other components update if listening
        window.dispatchEvent(new Event("storage"))
      }
    } catch (err: unknown) {
      setMsg(err instanceof Error ? err.message : "Failed to update")
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="text-center py-12 text-muted-foreground">Loading...</div>
  if (!profile) return null

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">My Profile</h1>
        <p className="text-muted-foreground">Manage your account information</p>
      </div>

      {msg && (
        <div className={`p-3 text-sm rounded-lg ${msg.includes("failed") ? "bg-red-50 text-red-700" : "bg-green-50 text-green-700"}`}>
          {msg}
        </div>
      )}

      <div className="max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle>Personal Information</CardTitle>
            <CardDescription>Update your personal details</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-6" onSubmit={handleSave}>
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="fullName">Full Name</FieldLabel>
                  <Input id="fullName" value={fullName} onChange={e => setFullName(e.target.value)} required />
                </Field>
                <Field>
                  <FieldLabel htmlFor="email">Email</FieldLabel>
                  <Input id="email" type="email" value={profile.email} disabled className="bg-muted" />
                </Field>
              </FieldGroup>
              <Button type="submit" disabled={saving}>
                {saving ? "Saving..." : "Save Changes"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="mt-6 opacity-50">
          <CardHeader>
            <CardTitle>Change Password</CardTitle>
            <CardDescription>Password updates are currently disabled in this demo.</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-6">
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="currentPassword">Current Password</FieldLabel>
                  <Input id="currentPassword" type="password" disabled />
                </Field>
                <Field>
                  <FieldLabel htmlFor="newPassword">New Password</FieldLabel>
                  <Input id="newPassword" type="password" disabled />
                </Field>
              </FieldGroup>
              <Button type="button" disabled>Update Password</Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
