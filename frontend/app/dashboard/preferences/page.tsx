"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Clock, Star, Leaf, Car, Accessibility } from "lucide-react"
import { api, UserPreferences } from "@/lib/api"
import { toast } from "sonner"

export default function PreferencesPage() {
  const [preferences, setPreferences] = useState<UserPreferences>({
    punctuality_weight: 50,
    quality_weight: 50,
    environment_weight: 50,
    parking_weight: 50,
    accessibility_weight: 50,
  })
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.user.preferences().then((prefs) => {
      setPreferences(prefs)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  const handleSave = async () => {
    setSaving(true)
    try {
      await api.user.updatePreferences(preferences)
      toast.success("Preferences updated successfully!")
    } catch (e: any) {
      toast.error(e.message || "Failed to update preferences")
    } finally {
      setSaving(false)
    }
  }

  const total =
    preferences.punctuality_weight +
    preferences.quality_weight +
    preferences.environment_weight +
    preferences.parking_weight +
    preferences.accessibility_weight

  if (loading) {
    return <div className="text-center py-12 text-muted-foreground">Loading preferences...</div>
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Preferences</h1>
        <p className="text-muted-foreground">
          Set your preference weights for the recommendation engine
        </p>
      </div>

      <div className="max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle>100-Point Preference Weights</CardTitle>
            <CardDescription>
              Adjust how much each factor matters to you when finding providers. These weights are
              used to calculate your personalized match percentages.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-8">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2 text-base">
                  <Clock className="h-5 w-5" />
                  Punctuality
                </Label>
                <span className="font-medium">{preferences.punctuality_weight}</span>
              </div>
              <Slider
                value={[preferences.punctuality_weight]}
                onValueChange={([value]) =>
                  setPreferences((p) => ({ ...p, punctuality_weight: value }))
                }
                max={100}
                step={1}
              />
              <p className="text-sm text-muted-foreground">
                How important is it that providers are on time?
              </p>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2 text-base">
                  <Star className="h-5 w-5" />
                  Quality
                </Label>
                <span className="font-medium">{preferences.quality_weight}</span>
              </div>
              <Slider
                value={[preferences.quality_weight]}
                onValueChange={([value]) => setPreferences((p) => ({ ...p, quality_weight: value }))}
                max={100}
                step={1}
              />
              <p className="text-sm text-muted-foreground">
                How much do you value overall service quality?
              </p>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2 text-base">
                  <Leaf className="h-5 w-5" />
                  Environment
                </Label>
                <span className="font-medium">{preferences.environment_weight}</span>
              </div>
              <Slider
                value={[preferences.environment_weight]}
                onValueChange={([value]) =>
                  setPreferences((p) => ({ ...p, environment_weight: value }))
                }
                max={100}
                step={1}
              />
              <p className="text-sm text-muted-foreground">
                How important is the ambiance and cleanliness of the location?
              </p>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2 text-base">
                  <Car className="h-5 w-5" />
                  Parking
                </Label>
                <span className="font-medium">{preferences.parking_weight}</span>
              </div>
              <Slider
                value={[preferences.parking_weight]}
                onValueChange={([value]) => setPreferences((p) => ({ ...p, parking_weight: value }))}
                max={100}
                step={1}
              />
              <p className="text-sm text-muted-foreground">
                How important is parking availability?
              </p>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2 text-base">
                  <Accessibility className="h-5 w-5" />
                  Accessibility
                </Label>
                <span className="font-medium">{preferences.accessibility_weight}</span>
              </div>
              <Slider
                value={[preferences.accessibility_weight]}
                onValueChange={([value]) =>
                  setPreferences((p) => ({ ...p, accessibility_weight: value }))
                }
                max={100}
                step={1}
              />
              <p className="text-sm text-muted-foreground">
                How important is accessibility for mobility needs?
              </p>
            </div>

            <div className="rounded-lg bg-muted p-4">
              <div className="flex items-center justify-between">
                <span className="font-medium">Total Weight</span>
                <span className="text-lg font-bold">{total} / 500</span>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                Higher values indicate stronger preference for that factor
              </p>
            </div>

            <Button className="w-full" onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : "Save Preferences"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
