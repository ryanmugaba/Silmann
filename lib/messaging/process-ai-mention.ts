import { getOpenAIClient, MODEL } from "@/lib/ai/openai";
import { ROSTERING_TOOLS } from "@/lib/ai/rostering-tools";
import { executeRosterTool } from "@/lib/ai/execute-roster-tools";
import type { PermissionContext } from "@/lib/primitives/rbac/types";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import { stripAiMention } from "@/lib/messaging/mentions";

export const AI_ATTACHMENT_MARKER = { kind: "ai_response" as const };

/** Post Silman AI reply in-channel after @AI mention (uses invoker's RBAC). */
export async function processChannelAiMention(
  supabase: SupabaseClient,
  ctx: PermissionContext,
  channelId: string,
  triggerMessageId: string,
  userContent: string
): Promise<void> {
  const client = getOpenAIClient();
  if (!client) return;

  const prompt = stripAiMention(userContent);
  if (!prompt) return;

  const system = `You are Silman AI in an NDIS SIL team chat.
The user's role is ${ctx.role}. House scope: ${ctx.house_ids.join(", ") || "all houses"}.
Answer concisely. Use roster tools when the user asks about shifts, availability, or staffing.`;

  const messages: ChatCompletionMessageParam[] = [
    { role: "system", content: system },
    { role: "user", content: prompt },
  ];

  let iterations = 0;
  let finalText = "";

  while (iterations < 5) {
    iterations++;
    const response = await client.chat.completions.create({
      model: MODEL,
      max_tokens: 1024,
      messages,
      tools: ROSTERING_TOOLS,
      tool_choice: "auto",
    });

    const choice = response.choices[0]?.message;
    if (!choice) break;

    const toolCalls = choice.tool_calls;
    if (!toolCalls?.length) {
      finalText = choice.content ?? "";
      break;
    }

    messages.push(choice);
    for (const call of toolCalls) {
      const name = call.function.name as Parameters<typeof executeRosterTool>[0];
      let input: Record<string, unknown> = {};
      try {
        input = JSON.parse(call.function.arguments) as Record<string, unknown>;
      } catch {
        messages.push({
          role: "tool",
          tool_call_id: call.id,
          content: JSON.stringify({
            error: "Invalid tool arguments. Ask the user to rephrase the request.",
          }),
        });
        continue;
      }
      const result = await executeRosterTool(name, input, ctx);
      messages.push({
        role: "tool",
        tool_call_id: call.id,
        content: JSON.stringify(result),
      });
    }
  }

  if (!finalText) {
    finalText = "I couldn't generate a response. Try rephrasing your question.";
  }

  await supabase.from("messages").insert({
    organization_id: ctx.organization_id,
    channel_id: channelId,
    user_id: ctx.user_id,
    content: finalText,
    parent_message_id: null,
    ai_invoked: true,
    attachments: [AI_ATTACHMENT_MARKER],
  });

  await supabase
    .from("messages")
    .update({ ai_invoked: true })
    .eq("id", triggerMessageId);
}
