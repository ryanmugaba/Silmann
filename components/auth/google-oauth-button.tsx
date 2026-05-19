"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { signInWithGoogle } from "@/app/(auth)/actions";
import { GoogleIcon } from "@/components/auth/google-icon";
import { Button } from "@/components/ui/button";

type GoogleOAuthButtonProps = {
  intent?: "login" | "owner_signup";
  label?: string;
};

export function GoogleOAuthButton({
  intent = "login",
  label = "Continue with Google",
}: GoogleOAuthButtonProps) {
  const [pending, setPending] = useState(false);

  async function handleGoogleSignIn() {
    setPending(true);
    try {
      const formData = new FormData();
      formData.set("intent", intent);
      const result = await signInWithGoogle(formData);

      if ("url" in result) {
        window.location.href = result.url;
        return;
      }

      if ("error" in result) {
        toast.error(result.error);
      }
      setPending(false);
    } catch {
      toast.error("Google sign-in could not be started.");
      setPending(false);
    }
  }

  return (
    <form onSubmit={(e) => e.preventDefault()}>
      <Button
        type="button"
        variant="outline"
        className="w-full gap-2"
        disabled={pending}
        onClick={handleGoogleSignIn}
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
    </form>
  );
}
