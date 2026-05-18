"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useFormState, useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { signIn } from "@/app/(auth)/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
          Signing in…
        </>
      ) : (
        "Sign in"
      )}
    </Button>
  );
}

export function LoginForm() {
  const [state, formAction] = useFormState<ActionResult | undefined, FormData>(
    signIn,
    undefined
  );

  useEffect(() => {
    if (state && !state.success) {
      toast.error(state.error);
    }
  }, [state]);

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email">Work email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="you@provider.com.au"
          required
        />
        <p className="text-xs text-muted-foreground">
          Use the email your organisation registered with Silman.
        </p>
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="password">Password</Label>
          <Link
            href="/forgot-password"
            className="text-xs font-medium text-primary hover:underline"
          >
            Forgot password?
          </Link>
        </div>
        <PasswordInput
          id="password"
          name="password"
          autoComplete="current-password"
          required
        />
      </div>
      {state && !state.success && state.fieldErrors?.email ? (
        <p className="text-sm text-destructive">{state.fieldErrors.email[0]}</p>
      ) : null}
      <SubmitButton />
    </form>
  );
}
