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
    name: "create_shift",
    description:
      "Create a roster shift. Evaluates rules engine before saving. Requires house, start, end, and shift type.",
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
        override_reason: {
          type: "string",
          description: "Required when confirm-level rules are triggered",
        },
      },
      required: ["house_id", "start", "end", "shift_type"],
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
  | "create_shift"
  | "query_availability"
  | "find_replacement"
  | "check_schads_compliance"
  | "get_unfilled_shifts";
