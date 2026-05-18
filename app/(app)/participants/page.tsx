import Link from "next/link";
import { Plus } from "lucide-react";
import { ParticipantsList } from "@/components/participants/participants-list";
import { Button } from "@/components/ui/button";
import { checkPermission } from "@/lib/primitives/rbac";
import { PermissionKey } from "@/lib/primitives/rbac/types";
import { createClient } from "@/lib/supabase/server";
import type { HouseRow, ParticipantRow } from "@/types/database";

export default async function ParticipantsPage() {
  const supabase = await createClient();
  const canCreate = await checkPermission(PermissionKey.PARTICIPANT_CREATE);

  const { data: participantRows } = await supabase
    .from("participants")
    .select("*")
    .is("deleted_at", null)
    .order("full_name")
    .returns<ParticipantRow[]>();

  const { data: houseRows } = await supabase
    .from("houses")
    .select("id, name")
    .is("deleted_at", null)
    .order("name")
    .returns<Pick<HouseRow, "id" | "name">[]>();

  const houseMap = new Map((houseRows ?? []).map((h) => [h.id, h.name]));

  const participants = (participantRows ?? []).map((p) => ({
    ...p,
    house_name: houseMap.get(p.house_id) ?? "Unknown house",
  }));

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h1 className="font-display text-3xl font-semibold tracking-heading">
            Participants
          </h1>
          <p className="text-muted-foreground">
            NDIS participants across your SIL houses.
          </p>
        </div>
        {canCreate ? (
          <Button asChild className="rounded-xl">
            <Link href="/participants/new">
              <Plus className="mr-2 h-4 w-4" strokeWidth={1.5} />
              Add participant
            </Link>
          </Button>
        ) : null}
      </div>

      <ParticipantsList
        participants={participants}
        houses={houseRows ?? []}
      />
    </div>
  );
}
