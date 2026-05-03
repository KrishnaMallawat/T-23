"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { api } from "@/lib/api"

export default function SignupPage() {
  const router = useRouter()
  const [fullName, setFullName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [role, setRole] = useState("customer")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [pendingOtp, setPendingOtp] = useState(false)
  const [otp, setOtp] = useState("")

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setLoading(true)
    try {
      await api.auth.signup(fullName, email, password, role)
      setPendingOtp(true)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Signup failed")
    } finally {
      setLoading(false)
    }
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setLoading(true)
    try {
      const data = await api.auth.verifyOtp(email, otp)
      const d = data as { token: string; user: { id: number; full_name: string; email: string; role: string } }
      localStorage.setItem("token", d.token)
      localStorage.setItem("user", JSON.stringify(d.user))
      router.push(role === "organiser" ? "/organiser" : "/dashboard")
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "OTP verification failed")
    } finally {
      setLoading(false)
    }
  }

  async function handleResend() {
    try {
      await api.auth.resendOtp(email)
    } catch {
      setError("Failed to resend OTP")
    }
  }

  if (pendingOtp) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/50 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-md bg-foreground text-background font-bold text-lg">S</div>
            <CardTitle className="text-2xl">Verify your email</CardTitle>
            <CardDescription>Enter the 6-digit code sent to {email}</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={handleVerify}>
              <Field>
                <FieldLabel htmlFor="otp">One-Time Password</FieldLabel>
                <Input id="otp" placeholder="123456" maxLength={6} value={otp} onChange={(e) => setOtp(e.target.value)} required />
              </Field>
              {error && <p className="text-sm text-red-500">{error}</p>}
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Verifying..." : "Verify Email"}
              </Button>
              <Button type="button" variant="outline" className="w-full" onClick={handleResend}>
                Resend OTP
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-md bg-foreground text-background font-bold text-lg">
            S
          </div>
          <CardTitle className="text-2xl">Create an account</CardTitle>
          <CardDescription>Get started with Slotsy</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleSignup}>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="name">Full Name</FieldLabel>
                <Input id="name" placeholder="John Doe" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
              </Field>
              <Field>
                <FieldLabel htmlFor="email">Email</FieldLabel>
                <Input id="email" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </Field>
              <Field>
                <FieldLabel htmlFor="password">Password</FieldLabel>
                <Input id="password" type="password" placeholder="Create a password" value={password} onChange={(e) => setPassword(e.target.value)} required />
              </Field>
              <Field>
                <FieldLabel htmlFor="role">I want to</FieldLabel>
                <Select value={role} onValueChange={setRole}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select your role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="customer">Book appointments (Customer)</SelectItem>
                    <SelectItem value="organiser">Offer services (Provider)</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
            </FieldGroup>
            {error && <p className="text-sm text-red-500">{error}</p>}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Creating account..." : "Create Account"}
            </Button>
          </form>
          <div className="mt-6 text-center text-sm">
            <span className="text-muted-foreground">Already have an account? </span>
            <Link href="/login" className="font-medium hover:underline">Sign in</Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
