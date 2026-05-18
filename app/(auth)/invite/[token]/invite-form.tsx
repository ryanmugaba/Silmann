"use client";

import { useEffect } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { acceptInvite } from "@/app/(auth)/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import type { ActionResult } from "@/lib/actions/result";

type InviteFormProps = {
  token: string;
  email: string;
};

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
        "Accept invitation"
      )}
    </Button>
  );
}

export function InviteForm({ token, email }: InviteFormProps) {
  const boundAction = acceptInvite.bind(null, token);
  const [state, formAction] = useFormState<ActionResult | undefined, FormData>(
    boundAction,
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
        <Label>Email</Label>
        <Input value={email} disabled className="bg-muted/50" />
        <p className="text-xs text-muted-foreground">
          Your account will be linked to this email address.
        </p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="fullName">Full name</Label>
        <Input id="fullName" name="fullName" autoComplete="name" required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          name="password"
          type="password"
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
  );
}
