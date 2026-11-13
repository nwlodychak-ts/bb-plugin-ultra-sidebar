import { describe, expect, it } from "vitest";
import { jiraKeyOf, shortenModel } from "./MetaBadges";

describe("shortenModel", () => {
  it("keeps the family and the distinguishing parts", () => {
    expect(shortenModel("claude-opus-5")).toBe("opus-5");
    expect(shortenModel("claude-sonnet-5")).toBe("sonnet-5");
    expect(shortenModel("gpt-6-astra")).toBe("gpt-6-astra");
    expect(shortenModel("claude-haiku-4-5")).toBe("haiku-4-5");
  });

  it("strips context-window suffixes and vendor prefixes", () => {
    expect(shortenModel("claude-opus-5[1m]")).toBe("opus-5");
    expect(shortenModel("us.anthropic.claude-sonnet-5")).toBe("sonnet-5");
  });

  it("drops build dates and bare version tags", () => {
    expect(shortenModel("claude-haiku-4-5-20251001")).toBe("haiku-4-5");
    expect(shortenModel("claude-sonnet-5-v1")).toBe("sonnet-5");
  });

  it("falls back to a truncated tail for an unrecognized model", () => {
    expect(shortenModel("some-vendor/tiny")).toBe("tiny");
    expect(shortenModel("averylongunbrokenmodelidentifier")).toBe(
      "averylongunbroken…",
    );
  });
});

describe("jiraKeyOf", () => {
  it("takes the first key in source order", () => {
    expect(jiraKeyOf("ABC-123-duckdb-loop", "[SW-12] title")).toBe("ABC-123");
    expect(jiraKeyOf(null, undefined, "Check ABC-456 status")).toBe("ABC-456");
    expect(jiraKeyOf("ABC-789/project-landing")).toBe("ABC-789");
    expect(jiraKeyOf("ABC-8678_v2")).toBe("ABC-8678");
  });

  it("skips lowercase and embedded matches", () => {
    expect(jiraKeyOf("opus-5-5", "bb/rebase-and-merge", "xABC-12")).toBeNull();
  });
});
