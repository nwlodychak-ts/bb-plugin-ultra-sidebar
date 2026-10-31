import { describe, expect, it, vi } from "vitest";
import { createFakePluginHost } from "@get-bb/plugin-sdk/testing";
import type { BbPluginApi } from "@get-bb/plugin-sdk";
import plugin from "./server";

type Thread = Awaited<ReturnType<BbPluginApi["sdk"]["threads"]["get"]>>;

const threads: Record<string, Partial<Thread>> = {
  root: { id: "root", parentThreadId: null, projectId: "p1" },
  child: { id: "child", parentThreadId: "root", projectId: "p1" },
  grandchild: { id: "grandchild", parentThreadId: "child", projectId: "p1" },
  other: { id: "other", parentThreadId: null, projectId: "p2" },
};

async function withHost(run: (call: (input: unknown) => Promise<unknown>, update: ReturnType<typeof vi.fn>) => Promise<void>) {
  const get = vi.fn(async ({ threadId }: { threadId: string }) => threads[threadId] as Thread);
  const update = vi.fn(async () => ({}));
  const { bb, harness } = createFakePluginHost({
    pluginId: "workspace-sidebar",
    sdk: { threads: { get, update } } as never,
  });
  try {
    await plugin(bb);
    await run((input) => harness.behavior.callRpc("threads.setParent", input), update);
  } finally {
    await harness.lifecycle.dispose();
  }
}

describe("threads.setParent RPC", () => {
  it("moves a subthread to the top level", () =>
    withHost(async (call, update) => {
      await call({ threadId: "child", expected: "root", parentThreadId: null });
      expect(update).toHaveBeenCalledExactlyOnceWith({ threadId: "child", parentThreadId: null });
    }));

  it.each([
    ["the thread moved since", { threadId: "child", expected: null, parentThreadId: null }, /moved elsewhere/],
    ["it would nest under its own subthread", { threadId: "root", expected: null, parentThreadId: "grandchild" }, /cannot move under itself/],
    ["it would nest under itself", { threadId: "root", expected: null, parentThreadId: "root" }, /cannot move under itself/],
    ["the parent is in another project", { threadId: "child", expected: "root", parentThreadId: "other" }, /own project/],
  ])("refuses when %s", (_, input, error) =>
    withHost(async (call, update) => {
      await expect(call(input)).rejects.toThrow(error);
      expect(update).not.toHaveBeenCalled();
    }));
});
