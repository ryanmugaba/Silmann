import { NextResponse } from "next/server";
import type {
  ChatCompletionMessageParam,
  ChatCompletionMessageToolCall,
} from "openai/resources/chat/completions";
import { getOpenAIClient, MODEL } from "@/lib/ai/openai";
import { ROSTERING_TOOLS, type RosteringToolName } from "@/lib/ai/rostering-tools";
import { executeRosterTool } from "@/lib/ai/execute-roster-tools";
import { getPermissionContext } from "@/lib/primitives/rbac/server";
import { z } from "zod";

const requestSchema = z.object({
  messages: z.array(
    z.object({
      role: z.enum(["user", "assistant"]),
      content: z.string(),
    })
  ),
});

export async function POST(request: Request) {
  try {
    const ctx = await getPermissionContext();
    const body = requestSchema.parse(await request.json());

    const client = getOpenAIClient();
    if (!client) {
      return NextResponse.json({
        role: "assistant",
        content:
          "AI rostering is not configured. Add OPENAI_API_KEY to .env.local to enable the command bar.",
        toolCalls: [],
      });
    }

    const system = `You are Silman AI, an NDIS SIL rostering assistant for Australian disability support.
The user's role is ${ctx.role}. House scope: ${ctx.house_ids.join(", ") || "all houses"}.
Use tools to create shifts, check availability, find replacements, and list unfilled shifts.
Always respect RBAC — tools enforce permissions server-side.
Be concise and action-oriented.`;

    const messages: ChatCompletionMessageParam[] = [
      { role: "system", content: system },
      ...body.messages.map(
        (m): ChatCompletionMessageParam => ({
          role: m.role,
          content: m.content,
        })
      ),
    ];

    const toolCallsLog: Array<{ name: string; input: unknown; result: unknown }> =
      [];
    let iterations = 0;
    const maxIterations = 5;

    while (iterations < maxIterations) {
      iterations++;
      const response = await client.chat.completions.create({
        model: MODEL,
        max_tokens: 1024,
        messages,
        tools: ROSTERING_TOOLS,
        tool_choice: "auto",
      });

      const choice = response.choices[0]?.message;
      if (!choice) {
        return NextResponse.json({
          role: "assistant",
          content: "No response from the model.",
          toolCalls: toolCallsLog,
        });
      }

      const toolCalls = choice.tool_calls;
      if (!toolCalls?.length) {
        return NextResponse.json({
          role: "assistant",
          content: choice.content ?? "",
          toolCalls: toolCallsLog,
        });
      }

      messages.push(choice);

      for (const call of toolCalls) {
        const result = await runToolCall(call, ctx, toolCallsLog);
        messages.push(result);
      }
    }

    return NextResponse.json({
      role: "assistant",
      content: "Reached maximum tool iterations. Please try a simpler request.",
      toolCalls: toolCallsLog,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "AI request failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

async function runToolCall(
  call: ChatCompletionMessageToolCall,
  ctx: Awaited<ReturnType<typeof getPermissionContext>>,
  toolCallsLog: Array<{ name: string; input: unknown; result: unknown }>
): Promise<ChatCompletionMessageParam> {
  const name = call.function.name as RosteringToolName;
  let input: Record<string, unknown> = {};
  try {
    input = JSON.parse(call.function.arguments) as Record<string, unknown>;
  } catch {
    input = {};
  }

  const result = await executeRosterTool(name, input, ctx);
  toolCallsLog.push({ name, input, result });

  return {
    role: "tool",
    tool_call_id: call.id,
    content: JSON.stringify(result),
  };
}
