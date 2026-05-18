import Link from "next/link";
import { signInWithGoogle } from "@/app/(auth)/actions";
import { AuthCard } from "@/components/auth/auth-card";
import { Button } from "@/components/ui/button";
import { SignupForm } from "./signup-form";

export default function SignupPage() {
  return (
    <AuthCard
      title="Start with Silman"
      description="Owner accounts create a new organisation. Team members join via invitation."
      footer={
        <>
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-primary hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      <form action={signInWithGoogle} className="mb-4">
        <input type="hidden" name="intent" value="owner_signup" />
        <Button type="submit" variant="outline" className="w-full">
          <span className="mr-2 flex h-5 w-5 items-center justify-center rounded-full bg-card text-sm font-semibold shadow-sm">
            G
          </span>
          Create organisation with Google
        </Button>
      </form>
      <div className="mb-4 flex items-center gap-3 text-xs text-muted-foreground">
        <span className="h-px flex-1 bg-border" />
        <span>or create a private email login</span>
        <span className="h-px flex-1 bg-border" />
      </div>
      <SignupForm />
    </AuthCard>
  );
}
