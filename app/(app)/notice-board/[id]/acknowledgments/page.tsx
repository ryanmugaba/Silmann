import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { can, getPermissionContext } from "@/lib/primitives/rbac";
import { PermissionKey } from "@/lib/primitives/rbac/types";
import { createClient } from "@/lib/supabase/server";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function AcknowledgmentsPage({ params }: PageProps) {
  const { id } = await params;
  const ctx = await getPermissionContext();

  if (!can(ctx, PermissionKey.NOTICE_BOARD_POST)) {
    redirect("/notice-board");
  }

  const supabase = await createClient();

  const { data: announcement } = await supabase
    .from("announcements")
    .select("id, title")
    .eq("id", id)
    .eq("organization_id", ctx.organization_id)
    .single<{ id: string; title: string }>();

  if (!announcement) {
    redirect("/notice-board");
  }

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, full_name, email, role")
    .eq("organization_id", ctx.organization_id)
    .eq("is_active", true)
    .is("deleted_at", null);

  const { data: acks } = await supabase
    .from("announcement_acknowledgments")
    .select("user_id, acknowledged_at")
    .eq("announcement_id", id);

  const ackMap = new Map(
    (acks ?? []).map((a) => [
      (a as { user_id: string }).user_id,
      (a as { acknowledged_at: string }).acknowledged_at,
    ])
  );

  const acknowledged = (profiles ?? []).filter((p) =>
    ackMap.has((p as { id: string }).id)
  );
  const pending = (profiles ?? []).filter(
    (p) => !ackMap.has((p as { id: string }).id)
  );

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Button asChild variant="ghost" size="sm" className="rounded-xl">
        <Link href="/notice-board">
          <ArrowLeft className="mr-2 h-4 w-4" strokeWidth={1.5} />
          Back
        </Link>
      </Button>
      <h1 className="font-display text-2xl font-semibold tracking-heading">
        Acknowledgments — {announcement.title}
      </h1>

      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Check className="h-4 w-4 text-success" strokeWidth={1.5} />
            Acknowledged ({acknowledged.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {acknowledged.length === 0 ? (
            <p className="text-sm text-muted-foreground">No acknowledgments yet.</p>
          ) : (
            acknowledged.map((p) => {
              const profile = p as {
                id: string;
                full_name: string | null;
                email: string;
                role: string;
              };
              return (
                <div
                  key={profile.id}
                  className="flex items-center justify-between rounded-xl border px-3 py-2"
                >
                  <span className="text-sm font-medium">
                    {profile.full_name ?? profile.email}
                  </span>
                  <Badge variant="secondary" className="rounded-lg capitalize">
                    {profile.role.replace("_", " ")}
                  </Badge>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <X className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
            Pending ({pending.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {pending.map((p) => {
            const profile = p as {
              id: string;
              full_name: string | null;
              email: string;
              role: string;
            };
            return (
              <div
                key={profile.id}
                className="flex items-center justify-between rounded-xl border px-3 py-2"
              >
                <span className="text-sm">{profile.full_name ?? profile.email}</span>
                <Badge variant="outline" className="rounded-lg capitalize">
                  {profile.role.replace("_", " ")}
                </Badge>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
