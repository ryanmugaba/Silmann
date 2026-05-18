import { ProfileForm } from "@/components/settings/profile-form";
import { getPermissionContext } from "@/lib/primitives/rbac";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Profile — Settings — Silman" };

export default async function ProfileSettingsPage() {
  const ctx = await getPermissionContext();
  const supabase = await createClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, email, phone, notification_preferences")
    .eq("id", ctx.user_id)
    .single<{
      full_name: string | null;
      email: string;
      phone: string | null;
      notification_preferences: Record<string, unknown> | null;
    }>();

  return (
    <ProfileForm
      initial={{
        fullName: profile?.full_name ?? "",
        email: profile?.email ?? "",
        phone: profile?.phone ?? "",
        notificationPreferences:
          (profile?.notification_preferences as Record<string, unknown>) ?? {},
      }}
    />
  );
}
