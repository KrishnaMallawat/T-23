"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { api, UserProfile } from "@/lib/api"
import { useAuth } from "@/components/providers/auth-provider"

export default function ProfilePage() {
  const { user, login, token } = useAuth()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [fullName, setFullName] = useState("")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState("")

  // Password change state
  const [currentPw, setCurrentPw] = useState("")
  const [newPw, setNewPw] = useState("")
  const [confirmPw, setConfirmPw] = useState("")
  const [pwSaving, setPwSaving] = useState(false)
  const [pwMsg, setPwMsg] = useState("")
  const [pwError, setPwError] = useState("")

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
      if (user && token) {
        login(token, { ...user, full_name: fullName })
      }
    } catch (err: unknown) {
      setMsg(err instanceof Error ? err.message : "Failed to update")
    } finally {
      setSaving(false)
    }
  }

  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault()
    setPwMsg("")
    setPwError("")
    if (newPw.length < 8) { setPwError("New password must be at least 8 characters"); return }
    if (newPw !== confirmPw) { setPwError("New passwords do not match"); return }
    setPwSaving(true)
    try {
      const res = await api.auth.changePassword(currentPw, newPw)
      setPwMsg(res.message)
      setCurrentPw("")
      setNewPw("")
      setConfirmPw("")
    } catch (err: unknown) {
      setPwError(err instanceof Error ? err.message : "Failed to change password")
    } finally {
      setPwSaving(false)
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

      <div className="max-w-2xl space-y-6">
        {/* Personal Info */}
        <Card>
          <CardHeader>
            <CardTitle>Personal Information</CardTitle>
            <CardDescription>Update your personal details</CardDescription>
          </CardHeader>
          <CardContent>
            {msg && (
              <div className={`mb-4 p-3 text-sm rounded-lg ${msg.toLowerCase().includes("fail") ? "bg-red-50 text-red-700" : "bg-green-50 text-green-700"}`}>
                {msg}
              </div>
            )}
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

        {/* Change Password */}
        <Card>
          <CardHeader>
            <CardTitle>Change Password</CardTitle>
            <CardDescription>You'll need your current password to set a new one.</CardDescription>
          </CardHeader>
          <CardContent>
            {pwMsg && (
              <div className="mb-4 p-3 text-sm rounded-lg bg-green-50 text-green-700 border border-green-200">
                {pwMsg}
              </div>
            )}
            {pwError && (
              <div className="mb-4 p-3 text-sm rounded-lg bg-red-50 text-red-700 border border-red-200">
                {pwError}
              </div>
            )}
            <form className="space-y-6" onSubmit={handlePasswordChange}>
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="currentPassword">Current Password</FieldLabel>
                  <Input
                    id="currentPassword"
                    type="password"
                    value={currentPw}
                    onChange={e => setCurrentPw(e.target.value)}
                    placeholder="Enter current password"
                    required
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="newPassword">New Password</FieldLabel>
                  <Input
                    id="newPassword"
                    type="password"
                    value={newPw}
                    onChange={e => setNewPw(e.target.value)}
                    placeholder="Min. 8 characters"
                    required
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="confirmPassword">Confirm New Password</FieldLabel>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={confirmPw}
                    onChange={e => setConfirmPw(e.target.value)}
                    placeholder="Repeat new password"
                    required
                  />
                </Field>
              </FieldGroup>
              <Button type="submit" disabled={pwSaving}>
                {pwSaving ? "Updating..." : "Update Password"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
