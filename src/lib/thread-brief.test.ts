import { describe, expect, it } from "vitest";
import { briefOf } from "./thread-brief";

type Args = Parameters<typeof briefOf>;

const outline = {
  maxSeq: 9,
  items: [
    { id: "1", role: "user", preview: "Fix the hover cards", attachmentSummary: null },
    { id: "2", role: "assistant", preview: "Found the cause", attachmentSummary: null },
    { id: "3", role: "user", preview: "Ship it", attachmentSummary: null },
    { id: "4", role: "assistant", preview: "Shipped behind a switch", attachmentSummary: null },
  ],
} as Args[0];

const interactions = [
  {
    status: "pending",
    payload: {
      kind: "user_question",
      questions: [{ prompt: "Which summary?", options: [{ label: "Thread text" }, { label: "AI" }] }],
    },
  },
  { status: "pending", payload: { kind: "approval", reason: null, subject: { kind: "command", command: "npm test" } } },
  { status: "pending", payload: { kind: "approval", reason: null, subject: { kind: "plan", plan: "## Fix cards\nstep one" } } },
  { status: "resolved", payload: { kind: "approval", reason: "Already answered", subject: { kind: "command", command: "ls" } } },
] as unknown as Args[1];

describe("briefOf", () => {
  it("takes the first prompt, the last reply, and each pending ask", () => {
    expect(briefOf(outline, interactions)).toEqual({
      about: "Fix the hover cards",
      latest: "Shipped behind a switch",
      asks: [
        { prompt: "Which summary?", options: ["Thread text", "AI"] },
        { prompt: "Run npm test", options: [] },
        { prompt: "Approve the plan: Fix cards", options: [] },
      ],
    });
  });

  it("returns nulls for an empty thread", () => {
    expect(briefOf({ maxSeq: 0, items: [] }, [])).toEqual({ about: null, latest: null, asks: [] });
  });
});
