import Link from "next/link";
import { AuthCard } from "@/components/auth/auth-card";
import { LoginForm } from "./login-form";

const LOGIN_ERROR_MESSAGES: Record<string, string> = {
  auth_failed: "Sign-in could not be completed. Please try again.",
  google_account_not_invited:
    "This account is not linked to an organisation. Ask your manager for an invite.",
};

export default function LoginPage({
  searchParams,
}: {
  searchParams?: { error?: string };
}) {
  const code = searchParams?.error;
  const error = code
    ? (LOGIN_ERROR_MESSAGES[code] ?? "Sign-in could not be completed. Please try again.")
    : undefined;

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
      <LoginForm initialError={error} />
    </AuthCard>
  );
}
