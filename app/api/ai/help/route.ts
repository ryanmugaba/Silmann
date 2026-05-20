import { NextResponse } from "next/server";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import { getOpenAIClient, MODEL } from "@/lib/ai/openai";
import { USER_ERROR_UNAVAILABLE } from "@/lib/errors/public";
import { getPermissionContext } from "@/lib/primitives/rbac/server";
import { z } from "zod";

const requestSchema = z.object({
  messages: z.array(
    z.object({
      role: z.enum(["user", "assistant"]),
      content: z.string().min(1).max(4000),
    })
  ).min(1).max(20),
});

const HELP_FALLBACK = `I can help you use Silman. Try asking things like:
- How do I create a shift?
- How do I invite a worker?
- How do I submit my availability?
- Where do I find participant documents?
- What can Silman AI do from prompts?

For settings, open Settings from the sidebar. Settings changes are manual so owners stay in control of permissions, users, houses, and organisation details.`;

export async function POST(request: Request) {
  try {
    const ctx = await getPermissionContext();
    const body = requestSchema.parse(await request.json());
    const client = getOpenAIClient();

    if (!client) {
      return NextResponse.json({
        role: "assistant",
        content: `${USER_ERROR_UNAVAILABLE}\n\n${HELP_FALLBACK}`,
      });
    }

    const system = `You are Silman Help, a product guide for an NDIS SIL management web app.
Answer questions about how to use the website. Do not execute actions, mutate data, or call tools.

User role: ${ctx.role}. House scope: ${ctx.house_ids.join(", ") || "all houses"}.

Explain the app in practical steps. Keep answers concise and friendly.
Mention where to click or which section to open:
- Dashboard: overview, pending compliance, quick modules.
- Roster: create shifts, assign workers/participants, view calendar, find unfilled shifts.
- AI command bar: press Ctrl+K or Command+K and type operational prompts like "roster Sarah on 13 June".
- Participants: participant profiles, plans, medications, rules, audit history.
- Workers: worker records, compliance documents, invitations.
- My availability: workers submit availability.
- My compliance: workers submit documents.
- Notice Board: announcements and acknowledgments.
- Messages: team/channel conversations and shift comments.
- Reminders: tasks and due items.
- Settings: manual-only configuration for organisation details, houses, users, permissions, audit log, integrations.

If the user asks you to perform an operational action, explain they can use the AI command bar or the relevant module. If they ask for settings changes, tell them settings must be changed manually in Settings.`;

    const messages: ChatCompletionMessageParam[] = [
      { role: "system", content: system },
      ...body.messages.map(
        (message): ChatCompletionMessageParam => ({
          role: message.role,
          content: message.content,
        })
      ),
    ];

    const response = await client.chat.completions.create({
      model: MODEL,
      max_tokens: 800,
      messages,
    });

    return NextResponse.json({
      role: "assistant",
      content:
        response.choices[0]?.message.content ??
        "I could not generate help for that. Try asking a shorter question.",
    });
  } catch (error) {
    console.error("[ai/help]", error);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
