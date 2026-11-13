import { describe, expect, it } from "vitest";
import {
  folderIdOf,
  folderKey,
  folderProjectFor,
  folderSuggestions,
  type FolderProject,
} from "./project-styles";

const work: FolderProject = { id: "w", name: "Work", folders: ["~/work"] };
const viz: FolderProject = { id: "v", name: "Viz", folders: ["/Users/me/work/ts-lib-viz/"] };

describe("folderProjectFor", () => {
  it("matches the ~/ form of an absolute checkout path", () => {
    expect(folderProjectFor("/Users/me/work/ngs", [work])).toBe(work);
  });

  it("picks the deepest folder", () => {
    const path = "/Users/me/work/ts-lib-viz/worktrees/plots";
    expect(folderProjectFor(path, [work, viz])).toBe(viz);
    expect(folderProjectFor(path, [viz, work])).toBe(viz);
  });

  it("matches the folder itself and ignores a sibling sharing its prefix", () => {
    expect(folderProjectFor("/Users/me/work/ts-lib-viz", [viz])).toBe(viz);
    expect(folderProjectFor("/Users/me/work/ts-lib-viz-old", [viz])).toBeNull();
  });

  it("ignores an empty folder entry", () => {
    expect(folderProjectFor("/tmp/x", [{ id: "e", name: "E", folders: ["", "/"] }])).toBeNull();
  });
});

describe("folder keys", () => {
  it("round-trips an id and rejects a bb project id", () => {
    expect(folderIdOf(folderKey("abc"))).toBe("abc");
    expect(folderIdOf("proj_123")).toBeNull();
  });
});

describe("folderSuggestions", () => {
  it("adds the repository root above a worktree and dedupes", () => {
    expect(
      folderSuggestions([
        "/Users/me/work/repo/worktrees/a",
        "/Users/me/work/repo/worktrees/b",
        "/tmp/x/",
      ]),
    ).toEqual([
      "/tmp/x",
      "~/work/repo",
      "~/work/repo/worktrees/a",
      "~/work/repo/worktrees/b",
    ]);
  });
});
