import { redirect } from "next/navigation";
import { LandingPage } from "@/components/marketing/landing-page";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/configured";

export default async function HomePage() {
  if (!isSupabaseConfigured()) {
    return <LandingPage />;
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return <LandingPage />;
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("organization_id")
    .eq("id", user.id)
    .single<{ organization_id: string | null }>();

  if (!profile?.organization_id) {
    redirect("/onboarding");
  }

  redirect("/dashboard");
}
