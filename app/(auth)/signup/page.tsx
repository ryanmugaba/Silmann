import Link from "next/link";
import { GoogleOAuthButton } from "@/components/auth/google-oauth-button";
import { AuthCard } from "@/components/auth/auth-card";
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
      <div className="mb-4">
        <GoogleOAuthButton
          intent="owner_signup"
          label="Create organisation with Google"
        />
      </div>
      <div className="mb-4 flex items-center gap-3 text-xs text-muted-foreground">
        <span className="h-px flex-1 bg-border" />
        <span>or create a private email login</span>
        <span className="h-px flex-1 bg-border" />
      </div>
      <SignupForm />
    </AuthCard>
  );
}
