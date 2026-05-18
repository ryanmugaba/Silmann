import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { AddMedicationForm } from "@/components/participants/add-medication-form";
import { Button } from "@/components/ui/button";
import { can, getPermissionContext } from "@/lib/primitives/rbac";
import { PermissionKey } from "@/lib/primitives/rbac/types";
import { createClient } from "@/lib/supabase/server";
import type { ParticipantRow } from "@/types/database";

type PageProps = {
  params: { id: string };
};

export default async function NewMedicationPage({ params }: PageProps) {
  const { id } = params;
  const ctx = await getPermissionContext();
  const supabase = await createClient();

  const { data: participant } = await supabase
    .from("participants")
    .select("id, full_name, house_id")
    .eq("id", id)
    .is("deleted_at", null)
    .single<Pick<ParticipantRow, "id" | "full_name" | "house_id">>();

  if (!participant) {
    notFound();
  }

  if (
    !can(ctx, PermissionKey.MEDICATION_EDIT, {
      house_id: participant.house_id,
    })
  ) {
    redirect(`/participants/${id}`);
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Button asChild variant="ghost" size="sm" className="rounded-xl -ml-2">
        <Link href={`/participants/${id}`}>
          <ChevronLeft className="mr-1 h-4 w-4" strokeWidth={1.5} />
          Back to participant
        </Link>
      </Button>
      <AddMedicationForm
        participantId={participant.id}
        participantName={participant.full_name}
      />
    </div>
  );
}
