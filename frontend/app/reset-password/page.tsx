"use client"

import { useState, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Field, FieldLabel } from "@/components/ui/field"

const BASE = "http://127.0.0.1:5000/api"

function ResetPasswordContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get("token") ?? ""
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState("")

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password !== confirm) { setError("Passwords do not match"); return }
    if (password.length < 8) { setError("Password must be at least 8 characters"); return }
    setError(""); setLoading(true)
    try {
      const res = await fetch(`${BASE}/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, new_password: password }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || "Reset failed")
      setDone(true)
      setTimeout(() => router.push("/login"), 2000)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong")
    } finally {
      setLoading(false)
    }
  }

  if (!token) return (
    <div className="flex min-h-screen items-center justify-center bg-muted/50 p-4">
      <Card className="w-full max-w-md">
        <CardContent className="pt-6 text-center">
          <p className="text-red-500">Invalid or missing reset token.</p>
          <Link href="/forgot-password" className="text-sm hover:underline mt-4 block">Request a new link</Link>
        </CardContent>
      </Card>
    </div>
  )

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-md bg-foreground text-background font-bold text-lg">S</div>
          <CardTitle className="text-2xl">Choose a new password</CardTitle>
          <CardDescription>Enter your new password below</CardDescription>
        </CardHeader>
        <CardContent>
          {done ? (
            <div className="text-center space-y-2">
              <p className="text-green-600 font-medium">Password updated successfully!</p>
              <p className="text-sm text-muted-foreground">Redirecting to login...</p>
            </div>
          ) : (
            <form className="space-y-4" onSubmit={handleSubmit}>
              <Field>
                <FieldLabel htmlFor="password">New Password</FieldLabel>
                <Input id="password" type="password" placeholder="Min. 8 characters" value={password} onChange={(e) => setPassword(e.target.value)} required />
              </Field>
              <Field>
                <FieldLabel htmlFor="confirm">Confirm Password</FieldLabel>
                <Input id="confirm" type="password" placeholder="Repeat your password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
              </Field>
              {error && <p className="text-sm text-red-500">{error}</p>}
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Updating..." : "Update Password"}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-muted/50 p-4">Loading...</div>}>
      <ResetPasswordContent />
    </Suspense>
  )
}
