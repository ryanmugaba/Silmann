"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useFormState, useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { signIn } from "@/app/(auth)/actions";
import { GoogleOAuthButton } from "@/components/auth/google-oauth-button";
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
        "Sign in with email"
      )}
    </Button>
  );
}

export function LoginForm({ initialError }: { initialError?: string }) {
  const [state, formAction] = useFormState<ActionResult | undefined, FormData>(
    signIn,
    undefined
  );

  useEffect(() => {
    if (initialError) {
      toast.error(initialError);
    }
  }, [initialError]);

  useEffect(() => {
    if (state && !state.success) {
      toast.error(state.error);
    }
  }, [state]);

  const fieldErrors = state && !state.success ? state.fieldErrors : undefined;

  return (
    <div className="space-y-5">
      {initialError ? (
        <div
          className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
          role="alert"
        >
          {initialError}
        </div>
      ) : null}

      <GoogleOAuthButton intent="login" label="Continue with Google" />

      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <span className="h-px flex-1 bg-border" />
        <span>or sign in with email</span>
        <span className="h-px flex-1 bg-border" />
      </div>

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
            aria-invalid={Boolean(fieldErrors?.email)}
          />
          {fieldErrors?.email ? (
            <p className="text-sm text-destructive">{fieldErrors.email[0]}</p>
          ) : (
            <p className="text-xs text-muted-foreground">
              Use the email your organisation registered with Silman.
            </p>
          )}
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
            aria-invalid={Boolean(fieldErrors?.password)}
          />
          {fieldErrors?.password ? (
            <p className="text-sm text-destructive">{fieldErrors.password[0]}</p>
          ) : null}
        </div>

        {fieldErrors?._form ? (
          <p className="text-sm text-destructive">{fieldErrors._form[0]}</p>
        ) : null}

        <SubmitButton />
      </form>

      <p className="text-center text-xs text-muted-foreground">
        New organisation owner?{" "}
        <Link href="/signup" className="font-medium text-primary hover:underline">
          Create an account
        </Link>
      </p>
    </div>
  );
}
