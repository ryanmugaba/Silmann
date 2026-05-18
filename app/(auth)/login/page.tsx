import Link from "next/link";
import { AuthCard } from "@/components/auth/auth-card";
import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <AuthCard
      title="Welcome back"
      description="Sign in to manage your SIL houses and teams."
      footer={
        <>
          Don&apos;t have an account?{" "}
          <Link
            href="/signup"
            className="font-medium text-primary hover:underline"
          >
            Create organisation
          </Link>
        </>
      }
    >
      <LoginForm />
    </AuthCard>
  );
}
