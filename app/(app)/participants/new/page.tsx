import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { CreateParticipantForm } from "@/components/participants/create-participant-form";
import { Button } from "@/components/ui/button";
import { getPermissionContext } from "@/lib/primitives/rbac";
import { can } from "@/lib/primitives/rbac/check";
import { PermissionKey } from "@/lib/primitives/rbac/types";
import { createClient } from "@/lib/supabase/server";
import type { HouseRow } from "@/types/database";

export default async function NewParticipantPage() {
  const ctx = await getPermissionContext();
  if (!can(ctx, PermissionKey.PARTICIPANT_CREATE)) {
    redirect("/participants");
  }

  const supabase = await createClient();
  const { data: houses } = await supabase
    .from("houses")
    .select("id, name")
    .eq("organization_id", ctx.organization_id)
    .is("deleted_at", null)
    .order("name")
    .returns<Pick<HouseRow, "id" | "name">[]>();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Button asChild variant="ghost" size="sm" className="rounded-xl -ml-2">
        <Link href="/participants">
          <ChevronLeft className="mr-1 h-4 w-4" strokeWidth={1.5} />
          Back to participants
        </Link>
      </Button>
      <div className="space-y-1">
        <h1 className="font-display text-3xl font-semibold tracking-heading">
          New participant
        </h1>
        <p className="text-muted-foreground">
          Five steps to set up profile, plan, and care preferences.
        </p>
      </div>
      <CreateParticipantForm houses={houses ?? []} />
    </div>
  );
}
