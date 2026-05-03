import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Search, Calendar, Star, Users } from "lucide-react"

const services = [
  { id: 1, name: "Health & Wellness", count: 234 },
  { id: 2, name: "Beauty & Grooming", count: 189 },
  { id: 3, name: "Professional Services", count: 156 },
  { id: 4, name: "Home Services", count: 98 },
]

const features = [
  {
    icon: Search,
    title: "Smart Matching",
    description: "Find providers ranked by your personal preferences with our 100-point system",
  },
  {
    icon: Calendar,
    title: "Easy Booking",
    description: "Book appointments in seconds with real-time availability",
  },
  {
    icon: Star,
    title: "Verified Reviews",
    description: "Make informed decisions with authentic customer feedback",
  },
]

export default function LandingPage() {
  return (
    <div className="min-h-screen">
      <header className="border-b border-border">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-foreground text-background font-semibold text-sm">
              S
            </div>
            <span className="font-semibold text-lg">Slotsy</span>
          </Link>
          <nav className="flex items-center gap-4">
            <Link href="/login" className="text-sm text-muted-foreground hover:text-foreground">
              Sign In
            </Link>
            <Button asChild size="sm">
              <Link href="/signup">Get Started</Link>
            </Button>
          </nav>
        </div>
      </header>

      <main>
        <section className="container mx-auto px-4 py-16 md:py-24">
          <div className="mx-auto max-w-3xl text-center">
            <h1 className="text-4xl font-bold tracking-tight md:text-5xl">
              Book appointments with the best providers
            </h1>
            <p className="mt-4 text-lg text-muted-foreground">
              Discover and book services from top-rated providers, matched to your preferences
            </p>
            <div className="mt-8 flex items-center gap-2 mx-auto max-w-md">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input placeholder="Search for services..." className="pl-9" />
              </div>
              <Button>Search</Button>
            </div>
          </div>
        </section>

        <section className="border-t border-border bg-muted/50 py-16">
          <div className="container mx-auto px-4">
            <h2 className="text-center text-2xl font-semibold">Popular Categories</h2>
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {services.map((service) => (
                <Card key={service.id} className="cursor-pointer hover:bg-muted/50 transition-colors">
                  <CardContent className="p-6">
                    <h3 className="font-medium">{service.name}</h3>
                    <p className="text-sm text-muted-foreground">{service.count} providers</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section className="py-16">
          <div className="container mx-auto px-4">
            <h2 className="text-center text-2xl font-semibold">Why Choose Slotsy</h2>
            <div className="mt-8 grid gap-8 md:grid-cols-3">
              {features.map((feature) => (
                <div key={feature.title} className="text-center">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                    <feature.icon className="h-6 w-6" />
                  </div>
                  <h3 className="mt-4 font-semibold">{feature.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{feature.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="border-t border-border bg-muted/50 py-16">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-2xl font-semibold">Ready to get started?</h2>
            <p className="mt-2 text-muted-foreground">
              Join thousands of users finding and booking services every day
            </p>
            <div className="mt-6 flex items-center justify-center gap-4">
              <Button asChild>
                <Link href="/signup">Create Account</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/login">Sign In</Link>
              </Button>
            </div>
          </div>
        </section>

        <section className="py-8 border-t border-border">
          <div className="container mx-auto px-4">
            <div className="flex flex-wrap items-center justify-center gap-4 text-sm text-muted-foreground">
              <Link href="/dashboard" className="hover:underline">Customer Dashboard</Link>
              <span>|</span>
              <Link href="/organiser" className="hover:underline">Provider Dashboard</Link>
              <span>|</span>
              <Link href="/admin" className="hover:underline">Admin Panel</Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border py-8">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <div className="flex items-center justify-center gap-2">
            <Users className="h-4 w-4" />
            <span>Slotsy - Connecting customers with service providers</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
