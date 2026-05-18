"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useFormState, useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { resetPassword } from "@/app/(auth)/actions";
import { AuthCard } from "@/components/auth/auth-card";
import { Button } from "@/components/ui/button";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import type { ActionResult } from "@/lib/actions/result";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.5} />
          Updating…
        </>
      ) : (
        "Update password"
      )}
    </Button>
  );
}

export default function ResetPasswordPage() {
  const [state, formAction] = useFormState<ActionResult | undefined, FormData>(
    resetPassword,
    undefined
  );

  useEffect(() => {
    if (state && !state.success) {
      toast.error(state.error);
    }
  }, [state]);

  return (
    <AuthCard
      title="Choose a new password"
      description="Enter a strong password you haven't used elsewhere."
      footer={
        <Link href="/login" className="font-medium text-primary hover:underline">
          Back to sign in
        </Link>
      }
    >
      <form action={formAction} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="password">New password</Label>
          <PasswordInput
            id="password"
            name="password"
            autoComplete="new-password"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirmPassword">Confirm password</Label>
          <PasswordInput
            id="confirmPassword"
            name="confirmPassword"
            autoComplete="new-password"
            required
          />
        </div>
        <SubmitButton />
      </form>
    </AuthCard>
  );
}
