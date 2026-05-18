import { redirect } from "next/navigation";
import { SettingsNav } from "@/components/settings/settings-nav";
import { can, getPermissionContext } from "@/lib/primitives/rbac";
import { PermissionKey } from "@/lib/primitives/rbac/types";

export default async function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const ctx = await getPermissionContext();
  if (!can(ctx, PermissionKey.SETTINGS_VIEW)) {
    redirect("/dashboard");
  }

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-8 lg:flex-row">
      <aside className="w-full shrink-0 lg:w-56">
        <h1 className="mb-4 font-display text-2xl font-semibold tracking-heading">
          Settings
        </h1>
        <SettingsNav />
      </aside>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
