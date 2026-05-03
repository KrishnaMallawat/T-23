"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Search, Car, Star, Clock, Leaf, Save, Filter } from "lucide-react"
import Link from "next/link"
import { api, Provider, UserPreferences } from "@/lib/api"
import { toast } from "sonner"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export default function ProvidersPage() {
  const [providers, setProviders] = useState<Provider[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [category, setCategory] = useState("all")
  const [paymentType, setPaymentType] = useState("all")
  
  const defaultPrefs = {
    punctuality_weight: 50,
    quality_weight: 50,
    environment_weight: 50,
    parking_weight: 50,
    accessibility_weight: 50,
  }
  const [preferences, setPreferences] = useState<UserPreferences>(defaultPrefs)
  const [savedPreferences, setSavedPreferences] = useState<UserPreferences>(defaultPrefs)

  // Load saved preferences on mount
  useEffect(() => {
    api.user.preferences().then((prefs) => {
      setPreferences(prefs)
      setSavedPreferences(prefs)
    }).catch(() => {})
  }, [])

  // Fetch businesses whenever sliders or filters change (debounced)
  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(true)
      api.providers.list(preferences, category, paymentType).then((data) => {
        setProviders(data)
      }).catch(console.error).finally(() => setLoading(false))
    }, 400)
    return () => clearTimeout(timer)
  }, [preferences, category, paymentType])

  const filtered = providers.filter((p) =>
    p.full_name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const setWeight = (key: keyof UserPreferences) => (value: number[]) =>
    setPreferences((p) => ({ ...p, [key]: value[0] }))

  const handleSave = async () => {
    setSaving(true)
    try {
      await api.user.updatePreferences(preferences)
      setSavedPreferences(preferences)
      toast.success("Preferences saved successfully!")
    } catch (e: any) {
      toast.error(e.message || "Failed to save preferences")
    } finally {
      setSaving(false)
    }
  }

  const isDirty = JSON.stringify(preferences) !== JSON.stringify(savedPreferences)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Explore Services</h1>
        <p className="text-muted-foreground">
          Discover businesses ranked by your preferences
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-4">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-base">Preference Weights</CardTitle>
            <CardDescription>Adjust to re-rank businesses</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {[
              { key: "punctuality_weight" as const, label: "Punctuality", icon: Clock },
              { key: "quality_weight" as const, label: "Quality", icon: Star },
              { key: "environment_weight" as const, label: "Environment", icon: Leaf },
              { key: "parking_weight" as const, label: "Parking", icon: Car },
            ].map(({ key, label, icon: Icon }) => (
              <div key={key} className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-2">
                    <Icon className="h-4 w-4" />
                    {label}
                  </Label>
                  <span className="text-sm text-muted-foreground">{preferences[key]}</span>
                </div>
                <Slider
                  value={[preferences[key]]}
                  onValueChange={setWeight(key)}
                  max={100}
                  step={1}
                />
              </div>
            ))}
            
            {isDirty && (
              <div className="pt-2">
                <Button 
                  onClick={handleSave} 
                  disabled={saving} 
                  className="w-full" 
                  size="sm"
                  variant="default"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {saving ? "Saving..." : "Save Preferences"}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-4 lg:col-span-3">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search businesses..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="w-full sm:w-[180px]">
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="Healthcare">Healthcare</SelectItem>
                  <SelectItem value="Sports">Sports</SelectItem>
                  <SelectItem value="Lifestyle">Lifestyle</SelectItem>
                  <SelectItem value="Education">Education</SelectItem>
                  <SelectItem value="Beauty">Beauty</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="w-full sm:w-[180px]">
              <Select value={paymentType} onValueChange={setPaymentType}>
                <SelectTrigger>
                  <SelectValue placeholder="Payment" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Any Payment</SelectItem>
                  <SelectItem value="none">Free Services</SelectItem>
                  <SelectItem value="optional_advance">Optional Advance</SelectItem>
                  <SelectItem value="mandatory_advance">Mandatory Advance</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {loading ? (
            <div className="text-center text-muted-foreground py-12">Loading businesses...</div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {filtered.map((business) => (
                <Card key={business.id}>
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted font-semibold">
                          {business.full_name.charAt(0)}
                        </div>
                        <div>
                          <h3 className="font-semibold">{business.full_name}</h3>
                          <p className="text-sm text-muted-foreground">{business.noise_level} environment</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xl font-bold text-green-600">
                          {Math.round(business.match_percentage)}%
                        </p>
                        <p className="text-xs text-muted-foreground">match</p>
                      </div>
                    </div>
                    <div className="mt-4 grid grid-cols-3 gap-2 text-center text-sm">
                      <div className="rounded-md bg-muted p-2">
                        <p className="font-medium">{business.punctuality_score ?? "—"}</p>
                        <p className="text-xs text-muted-foreground">Punctuality</p>
                      </div>
                      <div className="rounded-md bg-muted p-2">
                        <p className="font-medium">{business.quality_score ?? "—"}</p>
                        <p className="text-xs text-muted-foreground">Quality</p>
                      </div>
                      <div className="rounded-md bg-muted p-2">
                        <p className="font-medium">{business.environment_score ?? "—"}</p>
                        <p className="text-xs text-muted-foreground">Environment</p>
                      </div>
                    </div>
                    <div className="mt-4 flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        {business.has_parking && (
                          <span className="flex items-center gap-1">
                            <Car className="h-4 w-4" />
                            Parking
                          </span>
                        )}
                        <span>{business.total_reviews ?? 0} reviews</span>
                      </div>
                      <Button size="sm" asChild>
                        <Link href={`/dashboard/providers/${business.id}`}>Book Now</Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {filtered.length === 0 && (
                <p className="col-span-2 text-center text-muted-foreground py-12">No businesses found.</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
