"use client";

import { useEffect } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { signUpOwner } from "@/app/(auth)/actions";
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
          Creating account…
        </>
      ) : (
        "Create organisation"
      )}
    </Button>
  );
}

export function SignupForm() {
  const [state, formAction] = useFormState<ActionResult | undefined, FormData>(
    signUpOwner,
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
        <Label htmlFor="fullName">Full name</Label>
        <Input id="fullName" name="fullName" autoComplete="name" required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="email">Work email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="owner@provider.com.au"
          required
        />
        <p className="text-xs text-muted-foreground">
          This becomes your owner login and billing contact.
        </p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <PasswordInput
          id="password"
          name="password"
          autoComplete="new-password"
          required
        />
        <p className="text-xs text-muted-foreground">
          At least 8 characters. Use a unique password for Silman.
        </p>
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
  );
}
