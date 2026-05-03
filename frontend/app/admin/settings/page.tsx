"use client"

import { AdminHeader } from "@/components/admin/admin-header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { FieldGroup, Field, FieldLabel } from "@/components/ui/field"
import { Separator } from "@/components/ui/separator"

export default function SettingsPage() {
  return (
    <div className="flex flex-col">
      <AdminHeader
        title="Settings"
        description="Manage platform configuration"
      />
      <main className="flex-1 p-4 md:p-6 max-w-3xl">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">General Settings</CardTitle>
              <CardDescription>
                Configure basic platform settings
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="platform-name">Platform Name</FieldLabel>
                  <Input id="platform-name" defaultValue="Slotsy" />
                </Field>
                <Field>
                  <FieldLabel htmlFor="support-email">Support Email</FieldLabel>
                  <Input id="support-email" type="email" defaultValue="support@slotsy.com" />
                </Field>
              </FieldGroup>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Booking Settings</CardTitle>
              <CardDescription>
                Configure default booking behavior
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm">Auto-confirm Bookings</p>
                  <p className="text-sm text-muted-foreground">
                    Automatically confirm new bookings
                  </p>
                </div>
                <Switch defaultChecked />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm">Allow Cancellations</p>
                  <p className="text-sm text-muted-foreground">
                    Default setting for new services
                  </p>
                </div>
                <Switch defaultChecked />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm">Allow Rescheduling</p>
                  <p className="text-sm text-muted-foreground">
                    Default setting for new services
                  </p>
                </div>
                <Switch defaultChecked />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Notification Settings</CardTitle>
              <CardDescription>
                Configure email notifications
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm">New Booking Alerts</p>
                  <p className="text-sm text-muted-foreground">
                    Email admins on new bookings
                  </p>
                </div>
                <Switch defaultChecked />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm">Cancellation Alerts</p>
                  <p className="text-sm text-muted-foreground">
                    Email admins on cancellations
                  </p>
                </div>
                <Switch />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm">Daily Summary</p>
                  <p className="text-sm text-muted-foreground">
                    Send daily booking summary
                  </p>
                </div>
                <Switch defaultChecked />
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end gap-2">
            <Button variant="outline">Cancel</Button>
            <Button>Save Changes</Button>
          </div>
        </div>
      </main>
    </div>
  )
}
