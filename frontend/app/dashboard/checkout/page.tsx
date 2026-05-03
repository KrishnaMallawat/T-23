"use client"

import { useEffect, useState, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Field, FieldLabel } from "@/components/ui/field"
import { ArrowLeft, CreditCard, Lock, Calendar, Clock } from "lucide-react"
import Link from "next/link"
import Script from "next/script"
import { api, SlotDetail } from "@/lib/api"

function CheckoutContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const slot_id = searchParams.get("slot_id")

  const [slot, setSlot] = useState<SlotDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [step, setStep] = useState(1) // 1: Intake, 2: Payment
  const [answers, setAnswers] = useState<Record<number, string>>({})
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    if (!slot_id) { router.push("/dashboard/providers"); return }
    api.slots.get(Number(slot_id))
      .then(s => {
        setSlot(s)
        if (s.questions.length === 0) setStep(2)
      })
      .catch(() => router.push("/dashboard/providers"))
      .finally(() => setLoading(false))
  }, [slot_id, router])

  if (loading) return <div className="text-center py-12 text-muted-foreground">Loading checkout...</div>
  if (!slot) return null

  const handleNext = () => {
    // Validate required questions
    for (const q of slot.questions) {
      if (q.is_required && !answers[q.id]?.trim()) {
        setError(`Please answer: ${q.question_text}`)
        return
      }
    }
    setError("")
    if (slot.payment_requirement === "none") {
      submitBooking()
    } else {
      setStep(2)
    }
  }

  const submitBooking = async () => {
    setProcessing(true)
    setError("")
    try {
      const formattedAnswers = Object.entries(answers).map(([qid, text]) => ({
        question_id: Number(qid), answer_text: text
      }))

      if (slot.payment_requirement === "mandatory_advance") {
        // 1. Create order on backend
        const orderData = await api.payments.createOrder(slot.id)
        
        if (orderData.key === "rzp_test_dummy") {
          // Simulated mock mode (no real keys provided in backend)
          if (confirm("Simulated Payment Gateway: Click OK to simulate a successful payment, or Cancel to fail.")) {
            await api.bookings.create(slot.id, formattedAnswers, {
              razorpay_payment_id: "pay_mock_" + Math.random().toString(36).substring(7),
              razorpay_order_id: orderData.order_id,
              razorpay_signature: "mock_signature_123",
            })
            router.push("/dashboard/bookings")
          } else {
            setError("Payment cancelled by user")
            setProcessing(false)
          }
          return
        }

        // 2. Initialize Real Razorpay
        if (!(window as any).Razorpay) {
          setError("Payment gateway is still loading or was blocked by an ad-blocker. Please try again.")
          setProcessing(false)
          return
        }
        
        const options = {
          key: orderData.key,
          amount: orderData.amount,
          currency: "INR",
          name: slot.organiser_name,
          description: slot.service_title,
          order_id: orderData.order_id,
          handler: async function (response: any) {
            try {
              await api.bookings.create(slot.id, formattedAnswers, {
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_signature: response.razorpay_signature,
              })
              router.push("/dashboard/bookings")
            } catch (e: any) {
              setError(e.message || "Payment verification failed")
              setProcessing(false)
            }
          },
          prefill: {
            name: "Test User",
            email: "test@example.com",
            contact: "9999999999"
          },
          theme: { color: "#16a34a" },
          config: {
            display: {
              blocks: {
                upi: {
                  name: "Pay via UPI",
                  instruments: [{ method: "upi" }]
                },
                cards: {
                  name: "Pay via Cards",
                  instruments: [{ method: "card" }]
                }
              },
              sequence: ["block.upi", "block.cards"]
            }
          }
        }
        
        const rzp1 = new (window as any).Razorpay(options)
        rzp1.on("payment.failed", function (response: any) {
          setError(response.error.description)
          setProcessing(false)
        })
        rzp1.open()
      } else {
        // Free / pay later
        await api.bookings.create(slot.id, formattedAnswers)
        router.push("/dashboard/bookings")
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Booking failed")
      setProcessing(false)
    }
  }

  const dt = new Date(slot.slot_start)
  
  return (
    <div className="mx-auto max-w-3xl space-y-6 pb-12">
      <div className="flex items-center justify-between">
        <Link href={`/dashboard/providers/${slot.organiser_name}`} onClick={(e) => { e.preventDefault(); router.back() }} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:underline">
          <ArrowLeft className="h-4 w-4" /> Back
        </Link>
        <div className="text-sm font-medium">Step {step} of {slot.payment_requirement === "none" ? 1 : 2}</div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Order Summary Sidebar */}
        <Card className="md:col-span-1 h-fit">
          <CardHeader className="bg-muted/50 pb-4">
            <CardTitle className="text-base">Order Summary</CardTitle>
          </CardHeader>
          <CardContent className="pt-4 space-y-4">
            <div>
              <p className="font-semibold">{slot.service_title}</p>
              <p className="text-sm text-muted-foreground">{slot.organiser_name}</p>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span>{dt.toLocaleDateString("en-IN", { weekday: 'short', month: 'short', day: 'numeric' })}</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>{dt.toLocaleTimeString("en-IN", { timeStyle: "short" })} ({slot.duration_mins}m)</span>
              </div>
            </div>
            <hr />
            <div className="flex justify-between font-medium">
              <span>Advance Payment</span>
              <span>{slot.payment_requirement === "mandatory_advance" && slot.payment_amount > 0 ? `₹${slot.payment_amount}` : "Free / Pay Later"}</span>
            </div>
          </CardContent>
        </Card>

        {/* Main Flow */}
        <div className="md:col-span-2 space-y-4">
          {error && (
            <div className="bg-red-50 text-red-700 p-3 rounded-lg text-sm border border-red-200">
              {error}
            </div>
          )}

          {step === 1 && slot.questions.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Intake Questions</CardTitle>
                <CardDescription>The provider needs some info before your appointment.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {slot.questions.map(q => (
                  <Field key={q.id}>
                    <FieldLabel>{q.question_text} {q.is_required && <span className="text-red-500">*</span>}</FieldLabel>
                    <Input 
                      value={answers[q.id] || ""} 
                      onChange={e => setAnswers(prev => ({ ...prev, [q.id]: e.target.value }))}
                      placeholder="Your answer..."
                    />
                  </Field>
                ))}
              </CardContent>
              <CardFooter className="flex justify-end border-t pt-4">
                <Button onClick={handleNext}>Continue to {slot.payment_requirement === "none" ? "Confirm" : "Payment"}</Button>
              </CardFooter>
            </Card>
          )}

          {step === 2 && (
            <Card>
              <CardHeader>
                <CardTitle>{slot.payment_requirement === "none" ? "Confirm Booking" : "Secure Payment"}</CardTitle>
                <CardDescription>
                  {slot.payment_requirement === "none" 
                    ? "No payment required now. You can pay directly at the venue."
                    : "Complete your payment to secure this slot."}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {slot.payment_requirement === "mandatory_advance" ? (
                  <div className="space-y-4 bg-muted/30 p-6 rounded-xl border flex flex-col items-center justify-center min-h-32 text-center">
                    <Lock className="h-8 w-8 text-muted-foreground mb-2" />
                    <div>
                      <h3 className="font-medium text-lg">Razorpay Secure Checkout</h3>
                      <p className="text-sm text-muted-foreground mt-1">UPI, Credit/Debit Cards, NetBanking, and Wallets supported.</p>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Click the button below to finalize your appointment. You will receive an email confirmation shortly.</p>
                )}
              </CardContent>
              <CardFooter className="flex justify-between border-t pt-4">
                <Button variant="ghost" onClick={() => setStep(1)} disabled={slot.questions.length === 0 || processing}>Back</Button>
                <Button onClick={submitBooking} disabled={processing} className={slot.payment_requirement === "mandatory_advance" ? "bg-green-600 hover:bg-green-700 text-white" : ""}>
                  {processing ? "Processing..." : slot.payment_requirement === "none" ? "Confirm Booking" : `Pay ₹${slot.payment_amount} & Book`}
                </Button>
              </CardFooter>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}

export default function CheckoutPage() {
  return (
    <>
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="lazyOnload" />
      <Suspense fallback={<div className="text-center py-12 text-muted-foreground">Loading...</div>}>
        <CheckoutContent />
      </Suspense>
    </>
  )
}
