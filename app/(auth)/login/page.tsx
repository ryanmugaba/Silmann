import Link from "next/link";
import { AuthCard } from "@/components/auth/auth-card";
import { LoginForm } from "./login-form";

const LOGIN_ERROR_MESSAGES: Record<string, string> = {
  auth_failed:
    "Sign-in could not be completed. Please try again or use email and password.",
  google_account_not_invited:
    "That Google account is not linked to a Silman organisation yet. Ask your organisation owner for an invite, or create an organisation.",
  missing_code: "Google did not return an authorization code. Please try again.",
  session_missing: "We could not create a Silman session. Please try again.",
  profile_missing: "Your profile could not be loaded. Contact support if this continues.",
};

export default function LoginPage({
  searchParams,
}: {
  searchParams?: { error?: string };
}) {
  const error = searchParams?.error
    ? LOGIN_ERROR_MESSAGES[searchParams.error] ?? searchParams.error
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
