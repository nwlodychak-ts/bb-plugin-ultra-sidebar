import { describe, expect, it } from "vitest";
import type { PluginSidebarThread } from "@get-bb/plugin-sdk/app";
import { moveOptionsFor } from "./move-targets";

const thread = (
  id: string,
  parentThreadId: string | null = null,
  overrides: Partial<PluginSidebarThread> = {},
) =>
  ({
    id,
    parentThreadId,
    projectId: "p1",
    isArchived: false,
    displayTitle: `Title ${id}`,
    ...overrides,
  }) as PluginSidebarThread;

describe("moveOptionsFor", () => {
  const threads = [
    thread("root"),
    thread("child", "root"),
    thread("grandchild", "child"),
    thread("sibling"),
    thread("archived", null, { isArchived: true }),
    thread("elsewhere", null, { projectId: "p2" }),
  ];

  it("offers live threads in the same project, never the thread's own subtree or current parent", () => {
    expect(moveOptionsFor(threads, threads[1]!)).toEqual({
      parentThreadId: "root",
      targets: [{ id: "sibling", title: "Title sibling" }],
    });
    expect(moveOptionsFor(threads, threads[0]!)?.targets.map((target) => target.id)).toEqual(["sibling"]);
    expect(moveOptionsFor(threads, threads[3]!)?.targets.map((target) => target.id)).toEqual([
      "root",
      "child",
      "grandchild",
    ]);
  });

  it("refuses a row whose parent on screen is not the one bb records", () => {
    // A workflow worker: bb has it top level, the Workflows plugin draws it nested.
    expect(moveOptionsFor(threads, { ...threads[3]!, parentThreadId: "root" })).toBeNull();
    expect(moveOptionsFor(threads, thread("not-in-bb", "root"))).toBeNull();
  });
});
