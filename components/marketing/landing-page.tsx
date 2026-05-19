import Link from "next/link";
import {
  Calendar,
  MessageSquare,
  Shield,
  Sparkles,
  Users,
} from "lucide-react";
import { AuthWordmark } from "@/components/auth/auth-card";
import { Button } from "@/components/ui/button";
import {
  SILMAN_MONTHLY_PRICE,
  SILMAN_PRICING_TAGLINE,
  SILMAN_TRIAL_LABEL,
} from "@/lib/billing/constants";

const FEATURES = [
  {
    icon: Calendar,
    title: "Roster & shifts",
    description:
      "Build rosters, track availability, and fill gaps — with SCHADS-aware rules.",
  },
  {
    icon: Users,
    title: "Participants & workers",
    description:
      "NDIS participant profiles, worker compliance, and house assignments in one place.",
  },
  {
    icon: Sparkles,
    title: "Silman AI",
    description:
      "Roster from a sentence. Ask in plain English and Silman runs the work for you.",
  },
  {
    icon: MessageSquare,
    title: "Team messaging",
    description: "House channels, shift threads, notice board, and @AI in chat.",
  },
  {
    icon: Shield,
    title: "Built for SIL",
    description:
      "Role-based access, audit logs, and Australian timezone defaults out of the box.",
  },
] as const;

export function LandingPage() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-b from-background via-background to-accent/20">
      <div
        aria-hidden
        className="pointer-events-none absolute -left-32 top-0 h-96 w-96 rounded-full bg-primary/15 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-32 top-40 h-80 w-80 rounded-full bg-violet-500/10 blur-3xl"
      />

      <header className="relative mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <Link href="/" className="flex items-center gap-2">
          <AuthWordmark />
        </Link>
        <nav className="flex items-center gap-2 sm:gap-3">
          <Button asChild variant="ghost" size="sm">
            <Link href="/login">Sign in</Link>
          </Button>
          <Button asChild size="sm" className="bg-gradient-to-r from-violet-600 to-primary">
            <Link href="/signup">Start free setup</Link>
          </Button>
        </nav>
      </header>

      <main className="relative mx-auto max-w-6xl px-6 pb-24">
        <section className="mx-auto max-w-3xl py-16 text-center md:py-24">
          <p className="mb-4 inline-flex items-center gap-2 rounded-full border bg-card/80 px-4 py-1.5 text-sm font-medium text-primary shadow-sm">
            <Sparkles className="h-4 w-4" strokeWidth={1.5} />
            NDIS SIL operations, simplified
          </p>
          <h1 className="font-display text-4xl font-semibold tracking-heading text-balance sm:text-5xl md:text-6xl">
            Run your SIL houses from one intelligent workspace
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground text-balance">
            Roster, participants, compliance, messaging, and AI-assisted operations —
            designed for Australian disability providers.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button asChild size="lg" className="min-w-[200px] bg-gradient-to-r from-violet-600 to-primary">
              <Link href="/signup">Get started</Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="min-w-[200px]">
              <Link href="/login">Sign in</Link>
            </Button>
          </div>
          <p className="mt-4 text-sm text-muted-foreground">
            {SILMAN_PRICING_TAGLINE} per organisation · unlimited team members
          </p>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((feature) => {
            const Icon = feature.icon;
            return (
              <div
                key={feature.title}
                className="rounded-2xl border bg-card/80 p-6 shadow-card backdrop-blur-sm"
              >
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Icon className="h-5 w-5" strokeWidth={1.5} />
                </div>
                <h2 className="font-display text-lg font-semibold">{feature.title}</h2>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>
              </div>
            );
          })}
        </section>

        <section className="mt-20 rounded-3xl border border-primary/20 bg-gradient-to-br from-violet-500/10 via-card to-primary/5 p-8 text-center shadow-card md:p-12">
          <h2 className="font-display text-2xl font-semibold tracking-heading md:text-3xl">
            Simple pricing
          </h2>
          <p className="mt-2 text-muted-foreground">
            {SILMAN_TRIAL_LABEL}, then one flat price for your whole organisation.
          </p>
          <p className="mt-4 text-lg font-medium text-primary">{SILMAN_TRIAL_LABEL}</p>
          <p className="mt-2 text-5xl font-semibold tracking-tight">
            {SILMAN_MONTHLY_PRICE}
            <span className="text-xl font-normal text-muted-foreground"> / month after</span>
          </p>
          <ul className="mx-auto mt-6 max-w-md space-y-2 text-sm text-muted-foreground">
            <li>Card required at signup — no charge during the trial</li>
            <li>Unlimited support workers, team leaders & coordinators</li>
            <li>AI assistant with operational tool calling</li>
            <li>Secure hosting in Australia (Sydney region)</li>
            <li>Cancel anytime via Stripe billing portal</li>
          </ul>
          <Button asChild size="lg" className="mt-8 bg-gradient-to-r from-violet-600 to-primary">
            <Link href="/signup">Create your organisation</Link>
          </Button>
        </section>
      </main>

      <footer className="relative border-t py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 text-sm text-muted-foreground sm:flex-row">
          <p>© {new Date().getFullYear()} Silman</p>
          <div className="flex gap-6">
            <Link href="/privacy" className="hover:text-foreground hover:underline">
              Privacy
            </Link>
            <Link href="/terms" className="hover:text-foreground hover:underline">
              Terms
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
