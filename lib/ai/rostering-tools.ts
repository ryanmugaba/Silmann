import type { ChatCompletionTool } from "openai/resources/chat/completions";

type JsonSchema = {
  type: "object";
  properties: Record<string, unknown>;
  required?: string[];
};

const TOOL_SCHEMAS: Array<{
  name: RosteringToolName;
  description: string;
  parameters: JsonSchema;
}> = [
  {
    name: "get_roster_context",
    description:
      "Fetch the user's scoped roster context: houses, workers, participants, shift presets, timezone, and today's date. Call this before creating shifts from natural-language names.",
    parameters: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "get_app_capabilities",
    description:
      "List the app operations Silman AI is allowed to perform from prompts for this user. Settings mutations are intentionally excluded.",
    parameters: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "navigate_app",
    description:
      "Return the best Silman page path for a user's prompt, for navigation or next-step guidance. Does not change settings.",
    parameters: {
      type: "object",
      properties: {
        destination: {
          type: "string",
          enum: [
            "dashboard",
            "roster",
            "participants",
            "workers",
            "reminders",
            "notice_board",
            "messages",
            "my_availability",
            "my_compliance",
          ],
        },
      },
      required: ["destination"],
    },
  },
  {
    name: "create_shift",
    description:
      "Create a roster shift after resolving natural-language names to IDs. Evaluates rules engine before saving. Requires house, start, end, and shift type.",
    parameters: {
      type: "object",
      properties: {
        house_id: { type: "string", description: "House UUID" },
        participant_id: { type: "string", description: "Optional participant UUID" },
        worker_id: { type: "string", description: "Optional worker profile UUID" },
        start: { type: "string", description: "ISO 8601 start datetime" },
        end: { type: "string", description: "ISO 8601 end datetime" },
        shift_type: {
          type: "string",
          enum: [
            "day",
            "afternoon",
            "evening",
            "sleepover",
            "active_overnight",
            "community_access",
            "transport",
            "broken_shift",
          ],
        },
        ratio: { type: "string", description: "Shift ratio, default 1:1" },
        notes: {
          type: "string",
          description: "Optional note explaining this was created by Silman AI.",
        },
        override_reason: {
          type: "string",
          description: "Required when confirm-level rules are triggered",
        },
      },
      required: ["house_id", "start", "end", "shift_type"],
    },
  },
  {
    name: "update_shift_times",
    description:
      "Update the start and end time for an existing shift. Use only when the user identifies a specific shift ID or after listing shifts.",
    parameters: {
      type: "object",
      properties: {
        shift_id: { type: "string" },
        start: { type: "string", description: "ISO 8601 start datetime" },
        end: { type: "string", description: "ISO 8601 end datetime" },
        override_reason: { type: "string" },
      },
      required: ["shift_id", "start", "end"],
    },
  },
  {
    name: "cancel_shift",
    description:
      "Cancel an existing shift. Use only when the user clearly asks to cancel a specific shift.",
    parameters: {
      type: "object",
      properties: {
        shift_id: { type: "string" },
        reason: { type: "string" },
      },
      required: ["shift_id"],
    },
  },
  {
    name: "query_availability",
    description: "Query worker availability for a date range and optional house.",
    parameters: {
      type: "object",
      properties: {
        date_range_start: { type: "string", description: "YYYY-MM-DD" },
        date_range_end: { type: "string", description: "YYYY-MM-DD" },
        house_id: { type: "string" },
        shift_type: { type: "string" },
      },
      required: ["date_range_start", "date_range_end"],
    },
  },
  {
    name: "submit_availability",
    description:
      "Submit the current user's own availability. This never submits availability for another user.",
    parameters: {
      type: "object",
      properties: {
        cells: {
          type: "array",
          items: {
            type: "object",
            properties: {
              date: { type: "string", description: "YYYY-MM-DD" },
              status: {
                type: "string",
                enum: ["available", "preferred", "unavailable"],
              },
              startTime: { type: "string", description: "HH:mm" },
              endTime: { type: "string", description: "HH:mm" },
              notes: { type: "string" },
            },
            required: ["date", "status"],
          },
        },
      },
      required: ["cells"],
    },
  },
  {
    name: "request_shift_swap",
    description:
      "Request a swap for the current user's shift. Use only when the user clearly identifies the shift and provides a reason.",
    parameters: {
      type: "object",
      properties: {
        shift_id: { type: "string" },
        target_worker_id: { type: "string" },
        reason: { type: "string" },
      },
      required: ["shift_id", "reason"],
    },
  },
  {
    name: "find_replacement",
    description: "Find available workers who could cover an existing shift.",
    parameters: {
      type: "object",
      properties: {
        shift_id: { type: "string" },
      },
      required: ["shift_id"],
    },
  },
  {
    name: "check_schads_compliance",
    description: "Check SCHADS fortnight hours compliance for a worker.",
    parameters: {
      type: "object",
      properties: {
        worker_id: { type: "string" },
        fortnight_start: { type: "string", description: "YYYY-MM-DD" },
      },
      required: ["worker_id"],
    },
  },
  {
    name: "get_unfilled_shifts",
    description: "List unfilled shifts in a date range.",
    parameters: {
      type: "object",
      properties: {
        date_range_start: { type: "string" },
        date_range_end: { type: "string" },
        house_id: { type: "string" },
      },
      required: ["date_range_start", "date_range_end"],
    },
  },
  {
    name: "create_reminder",
    description:
      "Create a reminder for the current user or a specific assignee/house when the user gives enough details.",
    parameters: {
      type: "object",
      properties: {
        title: { type: "string" },
        description: { type: "string" },
        due_at: { type: "string", description: "ISO 8601 datetime" },
        recurrence_rule: { type: "string" },
        category: { type: "string" },
        assigned_to: { type: "string", description: "Optional user UUID" },
        house_id: { type: "string", description: "Optional house UUID" },
      },
      required: ["title", "due_at"],
    },
  },
  {
    name: "complete_reminder",
    description: "Mark an existing reminder as completed.",
    parameters: {
      type: "object",
      properties: {
        reminder_id: { type: "string" },
      },
      required: ["reminder_id"],
    },
  },
  {
    name: "snooze_reminder",
    description: "Snooze an existing reminder until a specific datetime.",
    parameters: {
      type: "object",
      properties: {
        reminder_id: { type: "string" },
        until: { type: "string", description: "ISO 8601 datetime" },
      },
      required: ["reminder_id", "until"],
    },
  },
  {
    name: "create_notice",
    description:
      "Post a notice board announcement. Requires a specific audience unless the user explicitly asks to send to everyone.",
    parameters: {
      type: "object",
      properties: {
        title: { type: "string" },
        content: { type: "string" },
        category: { type: "string" },
        priority: { type: "string", enum: ["standard", "urgent"] },
        requires_acknowledgment: { type: "boolean" },
        pinned: { type: "boolean" },
        target_roles: { type: "array", items: { type: "string" } },
        target_houses: { type: "array", items: { type: "string" } },
        target_user_ids: { type: "array", items: { type: "string" } },
        scheduled_for: { type: "string", description: "ISO 8601 datetime" },
        expires_at: { type: "string", description: "ISO 8601 datetime" },
        broadcast_confirmed: {
          type: "boolean",
          description: "True only when the user explicitly requested everyone/all staff.",
        },
      },
      required: ["title", "content"],
    },
  },
  {
    name: "acknowledge_notice",
    description: "Acknowledge a notice board announcement for the current user.",
    parameters: {
      type: "object",
      properties: {
        announcement_id: { type: "string" },
      },
      required: ["announcement_id"],
    },
  },
  {
    name: "send_shift_comment",
    description:
      "Add a comment to a shift thread. Do not include @AI in the content to avoid AI feedback loops.",
    parameters: {
      type: "object",
      properties: {
        shift_id: { type: "string" },
        content: { type: "string" },
      },
      required: ["shift_id", "content"],
    },
  },
  {
    name: "invite_worker",
    description:
      "Invite a support worker to Silman and assign them to one or more houses.",
    parameters: {
      type: "object",
      properties: {
        email: { type: "string" },
        employment_type: {
          type: "string",
          enum: ["casual", "part_time", "full_time"],
        },
        house_ids: { type: "array", items: { type: "string" } },
      },
      required: ["email", "house_ids"],
    },
  },
  {
    name: "create_participant",
    description:
      "Create a participant intake record when the prompt includes the required NDIS, house, and emergency contact details. Do not invent missing clinical details.",
    parameters: {
      type: "object",
      properties: {
        full_name: { type: "string" },
        preferred_name: { type: "string" },
        ndis_number: { type: "string" },
        house_id: { type: "string" },
        date_of_birth: { type: "string", description: "YYYY-MM-DD" },
        gender: { type: "string" },
        primary_language: { type: "string" },
        has_vehicle_access: { type: "boolean" },
        emergency_contact_name: { type: "string" },
        emergency_contact_relationship: { type: "string" },
        emergency_contact_phone: { type: "string" },
        plan_start_date: { type: "string", description: "YYYY-MM-DD" },
        plan_end_date: { type: "string", description: "YYYY-MM-DD" },
      },
      required: [
        "full_name",
        "ndis_number",
        "house_id",
        "emergency_contact_name",
        "emergency_contact_relationship",
        "emergency_contact_phone",
      ],
    },
  },
];

export const ROSTERING_TOOLS: ChatCompletionTool[] = TOOL_SCHEMAS.map((tool) => ({
  type: "function",
  function: {
    name: tool.name,
    description: tool.description,
    parameters: tool.parameters,
  },
}));

export type RosteringToolName =
  | "get_roster_context"
  | "get_app_capabilities"
  | "navigate_app"
  | "create_shift"
  | "update_shift_times"
  | "cancel_shift"
  | "query_availability"
  | "submit_availability"
  | "request_shift_swap"
  | "find_replacement"
  | "check_schads_compliance"
  | "get_unfilled_shifts"
  | "create_reminder"
  | "complete_reminder"
  | "snooze_reminder"
  | "create_notice"
  | "acknowledge_notice"
  | "send_shift_comment"
  | "invite_worker"
  | "create_participant";
