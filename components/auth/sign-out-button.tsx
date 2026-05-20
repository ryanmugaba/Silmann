"use client";

import { useTransition } from "react";
import { signOut } from "@/app/(auth)/actions";
import { Button } from "@/components/ui/button";

export function SignOutButton({
  variant = "ghost",
  size = "sm",
  className,
}: {
  variant?: "ghost" | "outline" | "default";
  size?: "sm" | "default";
  className?: string;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      className={className}
      disabled={pending}
      onClick={() => startTransition(() => signOut())}
    >
      {pending ? "Signing out…" : "Sign out"}
    </Button>
  );
}
