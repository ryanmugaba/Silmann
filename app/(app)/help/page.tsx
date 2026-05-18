import Link from "next/link";
import {
  BookOpen,
  Bot,
  Command,
  LifeBuoy,
  Settings,
} from "lucide-react";
import { HelpAiPanel } from "@/components/help/help-ai-panel";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata = {
  title: "Help — Silman",
};

const QUICK_GUIDES = [
  {
    title: "Run the app from prompts",
    description:
      "Press Ctrl+K or Command+K and type operational requests like roster changes, reminders, worker invites, and notices.",
    icon: Command,
    href: "/dashboard",
    action: "Open dashboard",
  },
  {
    title: "Use module pages",
    description:
      "Roster, Participants, Workers, Notice Board, Messages, and Reminders all remain available from the sidebar.",
    icon: BookOpen,
    href: "/roster",
    action: "Open roster",
  },
  {
    title: "Ask for product help",
    description:
      "Use this page to ask how something works. Help AI explains steps without changing records.",
    icon: Bot,
    href: "/help",
    action: "Ask below",
  },
  {
    title: "Settings stay manual",
    description:
      "Organisation setup, users, houses, permissions, integrations, and audit log review are handled in Settings.",
    icon: Settings,
    href: "/settings",
    action: "Open settings",
  },
];

export default function HelpPage() {
  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1 text-xs font-medium text-muted-foreground shadow-sm">
            <LifeBuoy className="h-3.5 w-3.5" strokeWidth={1.5} />
            Help centre
          </div>
          <h1 className="font-display text-3xl font-semibold tracking-heading">
            How can we help?
          </h1>
          <p className="max-w-2xl text-muted-foreground">
            Ask Silman Help how to use the app, or use the quick guides below
            to understand where key workflows live.
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {QUICK_GUIDES.map((guide) => {
          const Icon = guide.icon;
          return (
            <Card key={guide.title} className="shadow-card">
              <CardHeader className="space-y-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-muted">
                  <Icon className="h-5 w-5 text-muted-foreground" strokeWidth={1.5} />
                </div>
                <div>
                  <CardTitle className="text-base">{guide.title}</CardTitle>
                  <CardDescription className="mt-1">
                    {guide.description}
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <Button asChild variant="ghost" size="sm" className="rounded-xl">
                  <Link href={guide.href}>{guide.action}</Link>
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <HelpAiPanel />

        <Card className="h-fit shadow-card">
          <CardHeader>
            <CardTitle className="text-base">What to ask</CardTitle>
            <CardDescription>
              Help AI is for guidance. Use the command bar for doing work.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3 text-sm text-muted-foreground">
              <li>How do I create or edit a roster shift?</li>
              <li>How do I invite a new worker?</li>
              <li>How does house-scoped access work?</li>
              <li>What can AI do from prompts?</li>
              <li>Where do I manage settings?</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
