import { format } from "date-fns";
import { can } from "@/lib/primitives/rbac/check";
import { getPermissionContext } from "@/lib/primitives/rbac/server";
import { PermissionKey } from "@/lib/primitives/rbac/types";
import { csvResponse, toCsv } from "@/lib/reports/csv";
import { createClient } from "@/lib/supabase/server";

const EXPORT_TYPES = ["roster", "compliance", "audit", "incidents"] as const;

type ExportType = (typeof EXPORT_TYPES)[number];

function parseRange(searchParams: URLSearchParams): { from: string; to: string } | null {
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  if (!from || !to) return null;
  const fromDate = new Date(from);
  const toDate = new Date(to);
  if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime())) {
    return null;
  }
  return { from: fromDate.toISOString(), to: toDate.toISOString() };
}

export async function GET(request: Request) {
  try {
    const ctx = await getPermissionContext();
    if (!can(ctx, PermissionKey.REPORT_EXPORT)) {
      return new Response("Forbidden", { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") as ExportType | null;
    if (!type || !EXPORT_TYPES.includes(type)) {
      return new Response("Invalid export type", { status: 400 });
    }

    const range = parseRange(searchParams);
    if (!range) {
      return new Response("from and to query params required (ISO dates)", {
        status: 400,
      });
    }

    const supabase = await createClient();
    const stamp = format(new Date(), "yyyy-MM-dd");

    if (type === "roster") {
      const { data, error } = await supabase
        .from("shifts")
        .select(
          `
          start_at, end_at, shift_type, status, ratio, notes,
          houses ( name ),
          participants ( full_name ),
          worker:profiles!shifts_worker_id_fkey ( full_name )
        `
        )
        .eq("organization_id", ctx.organization_id)
        .is("deleted_at", null)
        .gte("start_at", range.from)
        .lte("start_at", range.to)
        .order("start_at");

      if (error) {
        console.error("[reports/roster]", error);
        return new Response("Export failed", { status: 500 });
      }

      const rows = (data ?? []).map((row) => {
        const r = row as {
          start_at: string;
          end_at: string;
          shift_type: string;
          status: string;
          ratio: string;
          notes: string | null;
          houses: { name: string } | null;
          participants: { full_name: string } | null;
          worker: { full_name: string } | null;
        };
        return [
          r.start_at,
          r.end_at,
          r.houses?.name ?? "",
          r.participants?.full_name ?? "",
          r.worker?.full_name ?? "",
          r.shift_type,
          r.status,
          r.ratio,
          r.notes ?? "",
        ];
      });

      const csv = toCsv(
        [
          "Start",
          "End",
          "House",
          "Participant",
          "Worker",
          "Type",
          "Status",
          "Ratio",
          "Notes",
        ],
        rows.map((r) => r.map(String))
      );
      return csvResponse(`silman-roster-${stamp}.csv`, csv);
    }

    if (type === "compliance") {
      const { data, error } = await supabase
        .from("compliance_documents")
        .select(
          `
          doc_type, doc_name, status, expiry_date, submitted_at,
          workers (
            profiles!workers_worker_profile_id_fkey ( full_name )
          )
        `
        )
        .eq("organization_id", ctx.organization_id)
        .is("deleted_at", null)
        .gte("submitted_at", range.from)
        .lte("submitted_at", range.to)
        .order("submitted_at");

      if (error) {
        console.error("[reports/compliance]", error);
        return new Response("Export failed", { status: 500 });
      }

      const rows = (data ?? []).map((row) => {
        const r = row as {
          doc_type: string;
          doc_name: string;
          status: string;
          expiry_date: string | null;
          submitted_at: string;
          workers: { profiles: { full_name: string | null } | null } | null;
        };
        return [
          r.workers?.profiles?.full_name ?? "",
          r.doc_type,
          r.doc_name,
          r.status,
          r.expiry_date ?? "",
          r.submitted_at,
        ];
      });

      const csv = toCsv(
        ["Worker", "Doc type", "Document", "Status", "Expiry", "Submitted"],
        rows.map((r) => r.map(String))
      );
      return csvResponse(`silman-compliance-${stamp}.csv`, csv);
    }

    if (type === "incidents") {
      const { data, error } = await supabase
        .from("incidents")
        .select(
          `
          title, incident_type, severity, status, occurred_at, description,
          houses ( name ),
          participants ( full_name ),
          reporter:profiles!incidents_reported_by_fkey ( full_name )
        `
        )
        .eq("organization_id", ctx.organization_id)
        .is("deleted_at", null)
        .gte("occurred_at", range.from)
        .lte("occurred_at", range.to)
        .order("occurred_at", { ascending: false });

      if (error) {
        console.error("[reports/incidents]", error);
        return new Response("Export failed", { status: 500 });
      }

      const rows = (data ?? []).map((row) => {
        const r = row as {
          title: string;
          incident_type: string;
          severity: string;
          status: string;
          occurred_at: string;
          description: string;
          houses: { name: string } | null;
          participants: { full_name: string } | null;
          reporter: { full_name: string | null } | null;
        };
        return [
          r.occurred_at,
          r.title,
          r.incident_type,
          r.severity,
          r.status,
          r.houses?.name ?? "",
          r.participants?.full_name ?? "",
          r.reporter?.full_name ?? "",
          r.description,
        ];
      });

      const csv = toCsv(
        [
          "Occurred",
          "Title",
          "Type",
          "Severity",
          "Status",
          "House",
          "Participant",
          "Reporter",
          "Description",
        ],
        rows.map((r) => r.map(String))
      );
      return csvResponse(`silman-incidents-${stamp}.csv`, csv);
    }

    const { data, error } = await supabase
      .from("audit_log")
      .select("action, entity_type, entity_id, created_at, profiles:user_id ( full_name )")
      .eq("organization_id", ctx.organization_id)
      .gte("created_at", range.from)
      .lte("created_at", range.to)
      .order("created_at", { ascending: false })
      .limit(5000);

    if (error) {
      console.error("[reports/audit]", error);
      return new Response("Export failed", { status: 500 });
    }

    const rows = (data ?? []).map((row) => {
      const r = row as {
        action: string;
        entity_type: string;
        entity_id: string | null;
        created_at: string;
        profiles: { full_name: string | null } | null;
      };
      return [
        r.created_at,
        r.profiles?.full_name ?? "",
        r.action,
        r.entity_type,
        r.entity_id ?? "",
      ];
    });

    const csv = toCsv(
      ["When", "User", "Action", "Entity type", "Entity ID"],
      rows.map((r) => r.map(String))
    );
    return csvResponse(`silman-audit-${stamp}.csv`, csv);
  } catch (e) {
    console.error("[reports/export]", e);
    return new Response("Export failed", { status: 500 });
  }
}
