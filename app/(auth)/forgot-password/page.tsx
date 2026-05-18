"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useFormState, useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { forgotPassword } from "@/app/(auth)/actions";
import { AuthCard } from "@/components/auth/auth-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ActionResult } from "@/lib/actions/result";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.5} />
          Sending link…
        </>
      ) : (
        "Send reset link"
      )}
    </Button>
  );
}

export default function ForgotPasswordPage() {
  const [state, formAction] = useFormState<ActionResult | undefined, FormData>(
    forgotPassword,
    undefined
  );

  useEffect(() => {
    if (!state) return;
    if (state.success) {
      toast.success(state.message ?? "Email sent.");
    } else {
      toast.error(state.error);
    }
  }, [state]);

  return (
    <AuthCard
      title="Reset your password"
      description="We'll email you a secure link to choose a new password."
      footer={
        <Link href="/login" className="font-medium text-primary hover:underline">
          Back to sign in
        </Link>
      }
    >
      <form action={formAction} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
          />
        </div>
        <SubmitButton />
      </form>
    </AuthCard>
  );
}
