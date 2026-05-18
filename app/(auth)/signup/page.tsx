import Link from "next/link";
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
      <SignupForm />
    </AuthCard>
  );
}
