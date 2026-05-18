import { redirect } from "next/navigation";
import { NewNoticeForm } from "@/components/notice-board/new-notice-form";
import { PermissionKey } from "@/lib/primitives/rbac/types";
import { getPermissionContext, can } from "@/lib/primitives/rbac";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "New notice — Silman" };

export default async function NewNoticePage() {
  const ctx = await getPermissionContext();
  if (!can(ctx, PermissionKey.NOTICE_BOARD_POST)) {
    redirect("/notice-board");
  }

  const supabase = await createClient();

  const [{ data: houseRows }, { data: userRows }, { data: assignments }] = await Promise.all([
    supabase
      .from("houses")
      .select("id, name")
      .eq("organization_id", ctx.organization_id)
      .is("deleted_at", null)
      .order("name"),
    supabase
      .from("profiles")
      .select("id, full_name")
      .eq("organization_id", ctx.organization_id)
      .eq("is_active", true)
      .is("deleted_at", null)
      .order("full_name"),
    ctx.house_ids.length > 0 && ctx.role !== "owner"
      ? supabase
          .from("house_assignments")
          .select("user_id")
          .in("house_id", ctx.house_ids)
      : Promise.resolve({ data: null }),
  ]);

  const houses =
    ctx.house_ids.length > 0 && ctx.role !== "owner"
      ? (houseRows ?? []).filter((house) => ctx.house_ids.includes(house.id))
      : houseRows ?? [];

  const scopedUserIds = new Set((assignments ?? []).map((a) => a.user_id));
  const users =
    scopedUserIds.size > 0
      ? (userRows ?? []).filter((user) => scopedUserIds.has(user.id))
      : userRows ?? [];

  return (
    <NewNoticeForm
      houses={houses as { id: string; name: string }[]}
      users={users as { id: string; full_name: string | null }[]}
    />
  );
}
