"use client";

import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";
import { signInWithGoogle } from "@/app/(auth)/actions";
import { GoogleIcon } from "@/components/auth/google-icon";
import { Button } from "@/components/ui/button";

type GoogleOAuthButtonProps = {
  intent?: "login" | "owner_signup";
  label?: string;
};

function GoogleSubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      variant="outline"
      className="w-full gap-2"
      disabled={pending}
    >
      {pending ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.5} />
          Redirecting to Google…
        </>
      ) : (
        <>
          <GoogleIcon className="h-5 w-5 shrink-0" />
          {label}
        </>
      )}
    </Button>
  );
}

export function GoogleOAuthButton({
  intent = "login",
  label = "Continue with Google",
}: GoogleOAuthButtonProps) {
  return (
    <form action={signInWithGoogle}>
      <input type="hidden" name="intent" value={intent} />
      <GoogleSubmitButton label={label} />
    </form>
  );
}
