import Link from "next/link";
import { CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function SubscriptionRequiredPage() {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-lg items-center justify-center p-4">
      <Card className="w-full shadow-card">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-700">
            <CreditCard className="h-6 w-6" strokeWidth={1.5} />
          </div>
          <CardTitle className="font-display text-xl">Subscription required</CardTitle>
          <CardDescription>
            Your organisation&apos;s Silman subscription is not active. Ask your
            organisation owner to complete billing in Settings.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          <Button asChild variant="outline">
            <Link href="/dashboard">Back to dashboard</Link>
          </Button>
          <Button asChild variant="ghost" size="sm">
            <Link href="/login">Sign out</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
