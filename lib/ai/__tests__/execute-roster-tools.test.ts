import { describe, expect, it } from "vitest";
import { executeRosterTool } from "@/lib/ai/execute-roster-tools";
import { USER_ERROR } from "@/lib/errors/public";
import { createPermissionContext, PermissionKey } from "@/lib/primitives/rbac";

const managerContext = createPermissionContext({
  user_id: "00000000-0000-4000-8000-000000000010",
  organization_id: "00000000-0000-4000-8000-000000000001",
  role: "team_leader",
  house_ids: ["10000000-0000-4000-8000-000000000001"],
});

describe("executeRosterTool", () => {
  it("returns roster context structure (empty when database is not connected)", async () => {
    const result = await executeRosterTool("get_roster_context", {}, managerContext);

    expect(result).toEqual(
      expect.objectContaining({
        today: expect.any(String),
        timezone: "Australia/Sydney",
        houses: expect.any(Array),
        workers: expect.any(Array),
        participants: expect.any(Array),
        shift_presets: expect.any(Array),
        guidance: expect.any(Array),
      })
    );
  });

  it("returns a safe error when creating a shift without a database", async () => {
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

    expect(result.result).toEqual({ success: false, error: USER_ERROR });
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

  it("lists prompt capabilities without exposing settings mutations", async () => {
    const result = await executeRosterTool(
      "get_app_capabilities",
      {},
      managerContext
    );

    expect(result.settings_mutations).toBe("excluded");
    expect(result.tools).toEqual(
      expect.arrayContaining([
        "create roster shifts",
        "create, complete, and snooze reminders",
        "post notice board announcements",
        "invite support workers",
        "create participant intake records",
      ])
    );
  });

  it("returns app navigation paths from prompts", async () => {
    const result = await executeRosterTool(
      "navigate_app",
      { destination: "reminders" },
      managerContext
    );

    expect(result).toEqual({ path: "/reminders" });
  });

  it("returns a safe error when creating reminders without a database", async () => {
    const result = await executeRosterTool(
      "create_reminder",
      {
        title: "Review Alex plan",
        due_at: "2026-06-13T09:00:00+10:00",
        category: "participant",
      },
      managerContext
    );

    expect(result.result).toEqual({ success: false, error: USER_ERROR });
  });

  it("does not allow managers to submit availability through AI", async () => {
    const result = await executeRosterTool(
      "submit_availability",
      {
        cells: [{ date: "2026-06-13", status: "available" }],
      },
      managerContext
    );

    expect(result).toEqual({
      error: "Only support workers can submit their own availability.",
    });
  });

  it("requires an audience before posting notices unless broadcast is explicit", async () => {
    const result = await executeRosterTool(
      "create_notice",
      {
        title: "Fire drill",
        content: "Fire drill at 2pm.",
      },
      managerContext
    );

    expect(result).toEqual({
      error:
        "Notice audience is required. Ask who should receive it, or confirm this is for everyone.",
    });
  });

  it("returns a safe error when creating participants without a database", async () => {
    const result = await executeRosterTool(
      "create_participant",
      {
        full_name: "Mia Parker",
        ndis_number: "43012345679",
        house_id: "10000000-0000-4000-8000-000000000001",
        emergency_contact_name: "John Parker",
        emergency_contact_relationship: "Father",
        emergency_contact_phone: "0400000000",
      },
      managerContext
    );

    expect(result.result).toEqual({ success: false, error: USER_ERROR });
  });
});
