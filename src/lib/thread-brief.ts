// Hover card summary of a thread. Fields: opening prompt, latest agent reply,
// pending asks.
import type { BbPluginApi } from "@get-bb/plugin-sdk";
import { z } from "zod";

type Threads = BbPluginApi["sdk"]["threads"];
type Outline = Awaited<ReturnType<Threads["conversationOutline"]>>;
type Interaction = Awaited<ReturnType<Threads["interactions"]["list"]>>[number];
type Approval = Extract<Interaction["payload"], { kind: "approval" }>;

export const askSchema = z.object({ prompt: z.string(), options: z.array(z.string()) });

export const threadBriefSchema = z.object({
  about: z.string().nullable(),
  latest: z.string().nullable(),
  asks: z.array(askSchema),
});

export type Ask = z.infer<typeof askSchema>;
export type ThreadBrief = z.infer<typeof threadBriefSchema>;

/** The plan's first line, which is its heading or opening sentence. */
function firstLine(text: string): string {
  return text.trim().split("\n")[0]!.replace(/^#+\s*/, "");
}

function approvalPrompt({ reason, subject }: Approval): string {
  if (reason) return reason;
  switch (subject.kind) {
    case "command": return `Run ${subject.command}`;
    case "file_change": return subject.writeScope ? `Edit files in ${subject.writeScope}` : "Edit files";
    case "permission_grant": return `Allow ${subject.toolName ?? "a permission"}`;
    case "plan": return `Approve the plan: ${firstLine(subject.plan)}`;
    case "tool_use": return subject.presentation.title ?? subject.presentation.label.pending;
  }
}

/** What one pending interaction asks of the person. */
export function asksOf({ payload }: Interaction): Ask[] {
  switch (payload.kind) {
    case "user_question":
      return payload.questions.map((question) => ({
        prompt: question.prompt,
        options: question.options?.map((option) => option.label) ?? [],
      }));
    case "approval":
      return [{ prompt: approvalPrompt(payload), options: [] }];
    default:
      return [{ prompt: payload.title, options: [] }];
  }
}

export function briefOf(outline: Outline, interactions: Interaction[]): ThreadBrief {
  return {
    about: outline.items.find((item) => item.role === "user")?.preview ?? null,
    latest: outline.items.filter((item) => item.role === "assistant").at(-1)?.preview ?? null,
    asks: interactions.filter((interaction) => interaction.status === "pending").flatMap(asksOf),
  };
}
