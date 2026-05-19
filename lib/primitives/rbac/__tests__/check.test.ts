import { describe, expect, it } from "vitest";
import { can, createPermissionContext, requirePermission } from "../check";
import { ForbiddenError, PermissionKey } from "../types";

const ORG_ID = "org-11111111-1111-1111-1111-111111111111";
const HOUSE_A = "house-aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const HOUSE_B = "house-bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";
const OWNER_ID = "user-owner000000-0000-0000-0000-000000000001";
const LEADER_ID = "user-leader00000-0000-0000-0000-000000000002";
const WORKER_ID = "user-worker00000-0000-0000-0000-000000000003";
const OTHER_WORKER_ID = "user-other000000-0000-0000-0000-000000000004";

describe("can()", () => {
  describe("owner", () => {
    const owner = createPermissionContext({
      user_id: OWNER_ID,
      organization_id: ORG_ID,
      role: "owner",
      house_ids: [],
    });

    it("can perform org-management permissions without house assignment", () => {
      expect(
        can(owner, PermissionKey.PARTICIPANT_EDIT, { house_id: HOUSE_B })
      ).toBe(true);
      expect(can(owner, PermissionKey.BILLING_MANAGE)).toBe(true);
      expect(can(owner, PermissionKey.USER_ROLE_CHANGE)).toBe(true);
    });

    it("cannot use frontline self-service permissions", () => {
      expect(can(owner, PermissionKey.AVAILABILITY_SUBMIT)).toBe(false);
      expect(can(owner, PermissionKey.COMPLIANCE_SUBMIT)).toBe(false);
    });

    it("does not throw via requirePermission for restricted resources", () => {
      expect(() =>
        requirePermission(owner, PermissionKey.ROSTER_DELETE, {
          house_id: HOUSE_A,
        })
      ).not.toThrow();
    });
  });

  describe("team leader house scope", () => {
    const teamLeader = createPermissionContext({
      user_id: LEADER_ID,
      organization_id: ORG_ID,
      role: "team_leader",
      house_ids: [HOUSE_A],
    });

    it("can edit participants in assigned houses", () => {
      expect(
        can(teamLeader, PermissionKey.PARTICIPANT_EDIT, {
          house_id: HOUSE_A,
        })
      ).toBe(true);
    });

    it("cannot edit participants in unassigned houses", () => {
      expect(
        can(teamLeader, PermissionKey.PARTICIPANT_EDIT, {
          house_id: HOUSE_B,
        })
      ).toBe(false);
    });

    it("can edit participants when no house scope is provided", () => {
      expect(can(teamLeader, PermissionKey.PARTICIPANT_EDIT)).toBe(true);
    });

    it("cannot manage billing or change user roles", () => {
      expect(can(teamLeader, PermissionKey.BILLING_MANAGE)).toBe(false);
      expect(can(teamLeader, PermissionKey.USER_ROLE_CHANGE)).toBe(false);
    });

    it("cannot submit own availability", () => {
      expect(can(teamLeader, PermissionKey.AVAILABILITY_SUBMIT)).toBe(false);
    });

    it("throws ForbiddenError for out-of-scope edits", () => {
      expect(() =>
        requirePermission(teamLeader, PermissionKey.PARTICIPANT_EDIT, {
          house_id: HOUSE_B,
        })
      ).toThrow(ForbiddenError);
    });
  });

  describe("support worker restrictions", () => {
    const worker = createPermissionContext({
      user_id: WORKER_ID,
      organization_id: ORG_ID,
      role: "support_worker",
      house_ids: [HOUSE_A],
    });

    it("cannot edit roster for any user", () => {
      expect(
        can(worker, PermissionKey.ROSTER_EDIT, {
          house_id: HOUSE_A,
          user_id: WORKER_ID,
        })
      ).toBe(false);
      expect(
        can(worker, PermissionKey.ROSTER_EDIT, {
          house_id: HOUSE_A,
          user_id: OTHER_WORKER_ID,
        })
      ).toBe(false);
    });

    it("can view own shifts in assigned house", () => {
      expect(
        can(worker, PermissionKey.SHIFT_VIEW_OWN, {
          house_id: HOUSE_A,
          user_id: WORKER_ID,
        })
      ).toBe(true);
    });

    it("cannot view another worker's shifts", () => {
      expect(
        can(worker, PermissionKey.SHIFT_VIEW_OWN, {
          house_id: HOUSE_A,
          user_id: OTHER_WORKER_ID,
        })
      ).toBe(false);
    });

    it("cannot edit participants", () => {
      expect(
        can(worker, PermissionKey.PARTICIPANT_EDIT, { house_id: HOUSE_A })
      ).toBe(false);
    });

    it("can submit availability for self", () => {
      expect(can(worker, PermissionKey.AVAILABILITY_SUBMIT)).toBe(true);
    });
  });

  describe("read-only", () => {
    const auditor = createPermissionContext({
      user_id: "user-readonly000-0000-0000-0000-000000000005",
      organization_id: ORG_ID,
      role: "read_only",
      house_ids: [HOUSE_A],
    });

    it("can view but not edit", () => {
      expect(
        can(auditor, PermissionKey.PARTICIPANT_VIEW, { house_id: HOUSE_A })
      ).toBe(true);
      expect(
        can(auditor, PermissionKey.PARTICIPANT_EDIT, { house_id: HOUSE_A })
      ).toBe(false);
    });
  });

  describe("custom permission overrides", () => {
    it("grants a permission not in role defaults", () => {
      const coordinator = createPermissionContext({
        user_id: "user-coord000000-0000-0000-0000-000000000006",
        organization_id: ORG_ID,
        role: "roster_coordinator",
        house_ids: [HOUSE_A],
        custom_permissions: {
          [PermissionKey.PARTICIPANT_VIEW]: true,
        },
      });

      expect(can(coordinator, PermissionKey.PARTICIPANT_VIEW)).toBe(true);
    });

    it("revokes a permission that role defaults include", () => {
      const leader = createPermissionContext({
        user_id: LEADER_ID,
        organization_id: ORG_ID,
        role: "team_leader",
        house_ids: [HOUSE_A],
        custom_permissions: {
          [PermissionKey.PARTICIPANT_EDIT]: false,
        },
      });

      expect(
        can(leader, PermissionKey.PARTICIPANT_EDIT, { house_id: HOUSE_A })
      ).toBe(false);
    });

    it("override takes precedence over default grant", () => {
      const owner = createPermissionContext({
        user_id: OWNER_ID,
        organization_id: ORG_ID,
        role: "owner",
        custom_permissions: {
          [PermissionKey.BILLING_MANAGE]: false,
        },
      });

      expect(can(owner, PermissionKey.BILLING_MANAGE)).toBe(false);
    });
  });
});
