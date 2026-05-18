import { describe, expect, it } from "vitest";
import { executeRosterTool } from "@/lib/ai/execute-roster-tools";
import { createPermissionContext, PermissionKey } from "@/lib/primitives/rbac";

const managerContext = createPermissionContext({
  user_id: "00000000-0000-4000-8000-000000000010",
  organization_id: "00000000-0000-4000-8000-000000000001",
  role: "team_leader",
  house_ids: ["10000000-0000-4000-8000-000000000001"],
});

describe("executeRosterTool", () => {
  it("returns scoped roster context for natural-language resolution", async () => {
    const result = await executeRosterTool("get_roster_context", {}, managerContext);

    expect(result.houses).toEqual([
      { id: "10000000-0000-4000-8000-000000000001", name: "Parramatta SIL" },
    ]);
    expect(result.workers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "p1",
          name: "Sarah Chen",
          house_names: ["Parramatta SIL"],
        }),
      ])
    );
    expect(result.participants).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: "Alex Nguyen",
          house_name: "Parramatta SIL",
        }),
      ])
    );
  });

  it("can execute a mock create-shift command after names are resolved", async () => {
    const result = await executeRosterTool(
      "create_shift",
      {
        house_id: "10000000-0000-4000-8000-000000000001",
        worker_id: "p1",
        participant_id: "20000000-0000-4000-8000-000000000001",
        start: "2026-06-13T07:00:00+10:00",
        end: "2026-06-13T15:00:00+10:00",
        shift_type: "day",
        notes: "Created by Silman AI from a manager command.",
      },
      managerContext
    );

    expect(result.result).toEqual(
      expect.objectContaining({
        success: true,
        message: "Demo mode: shift would be created.",
      })
    );
    expect(result.preview).toEqual(
      expect.objectContaining({
        house_id: "10000000-0000-4000-8000-000000000001",
        worker_id: "p1",
        shift_type: "day",
      })
    );
  });

  it("denies create-shift commands outside the user's house scope", async () => {
    const result = await executeRosterTool(
      "create_shift",
      {
        house_id: "10000000-0000-4000-8000-000000000002",
        worker_id: "p2",
        start: "2026-06-13T07:00:00+10:00",
        end: "2026-06-13T15:00:00+10:00",
        shift_type: "day",
      },
      managerContext
    );

    expect(result).toEqual({ error: "Permission denied: roster:create" });
  });

  it("denies roster context when roster view permission is disabled", async () => {
    const result = await executeRosterTool(
      "get_roster_context",
      {},
      createPermissionContext({
        ...managerContext,
        custom_permissions: { [PermissionKey.ROSTER_VIEW]: false },
      })
    );

    expect(result).toEqual({ error: "Permission denied: roster:view" });
  });
});
