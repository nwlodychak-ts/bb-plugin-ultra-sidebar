import { describe, expect, it } from "vitest";
import {
  hoverKeys,
  resolveDrop,
  sortableId,
  type DragSource,
  type DropZone,
} from "./dnd";
import { PINNED_SECTION_ID, projectSectionId } from "./sections";
import { statusSectionId } from "./status";

const zone = (
  kind: DropZone["kind"],
  refId: string | null,
  sectionId: string,
  projectId: string | null = "p1",
): DropZone => ({ kind, refId, sectionId, projectId });

const thread = (sectionId: string, projectId = "p1"): DragSource => ({
  kind: "thread",
  refId: "t1",
  sectionId,
  projectId,
});

const p1 = projectSectionId("p1");
const p2 = projectSectionId("p2");
const done = statusSectionId("merged");
const progress = statusSectionId("in-progress");

/** Every drop that leaves the order alone and nothing else. */
const justOrder = { reorder: true, pin: null, bucket: null };

describe("resolveDrop inside one section", () => {
  it("reorders a thread against a sibling, whatever the section is", () => {
    for (const section of [p1, done, PINNED_SECTION_ID]) {
      expect(resolveDrop(thread(section), zone("thread", "t2", section))).toEqual({
        sectionId: section,
        anchorRefId: "t2",
        ...justOrder,
      });
    }
  });

  it("ignores the row itself, and the heading it already sits under", () => {
    expect(resolveDrop(thread(p1), zone("thread", "t1", p1))).toBeNull();
    expect(resolveDrop(thread(p1), zone("section", p1, p1))).toBeNull();
    expect(resolveDrop(thread(p1), zone("project", "p1", p1))).toBeNull();
  });
});

describe("resolveDrop across sections", () => {
  it("files a thread into In progress and refuses Merged", () => {
    expect(resolveDrop(thread(done), zone("thread", "t2", progress))).toEqual({
      sectionId: progress,
      anchorRefId: "t2",
      reorder: false,
      pin: null,
      bucket: "in-progress",
    });
    expect(resolveDrop(thread(p1), zone("section", done, done))).toBeNull();
  });

  it("pins a thread dropped on the Pinned list", () => {
    expect(
      resolveDrop(thread(p1), zone("section", PINNED_SECTION_ID, PINNED_SECTION_ID)),
    ).toEqual({
      sectionId: PINNED_SECTION_ID,
      anchorRefId: null,
      reorder: false,
      pin: true,
      bucket: null,
    });
  });

  it("unpins a thread dragged out of the Pinned list, and files it where it lands", () => {
    const pinned = thread(PINNED_SECTION_ID);
    expect(resolveDrop(pinned, zone("section", p1, p1))).toEqual({
      sectionId: p1,
      anchorRefId: null,
      reorder: false,
      pin: false,
      bucket: null,
    });
    expect(resolveDrop(pinned, zone("thread", "t2", progress))).toEqual({
      sectionId: progress,
      anchorRefId: "t2",
      reorder: false,
      pin: false,
      bucket: "in-progress",
    });
  });

  it("reopens a finished thread dragged onto Pinned, since Pinned never shows one", () => {
    expect(resolveDrop(thread(done), zone("section", PINNED_SECTION_ID, PINNED_SECTION_ID))).toEqual({
      sectionId: PINNED_SECTION_ID,
      anchorRefId: null,
      reorder: false,
      pin: true,
      bucket: "in-progress",
    });
  });

  // The way back out of Done, Backlog and Canceled: the thread goes home to
  // its project and stops being parked.
  it("reopens a parked thread dropped back into its own project", () => {
    expect(resolveDrop(thread(done), zone("section", p1, p1))).toEqual({
      sectionId: p1,
      anchorRefId: null,
      reorder: false,
      pin: null,
      bucket: "in-progress",
    });
  });

  // In review is a fact about a pull request, so the drop has to be refused
  // outright. Accepting it would clear the manual status instead, and the row
  // would appear to land and then settle under In progress.
  it("refuses Pull request, a bucket a drag cannot bring about", () => {
    const review = statusSectionId("pull-request");
    for (const target of [
      zone("section", review, review),
      zone("thread", "t2", review),
    ]) {
      expect(resolveDrop(thread(p1), target)).toBeNull();
      expect(resolveDrop(thread(PINNED_SECTION_ID), target)).toBeNull();
    }
  });

  it("never moves a thread into another project: bb owns that", () => {
    expect(resolveDrop(thread(p1), zone("thread", "t2", p2))).toBeNull();
    expect(resolveDrop(thread(p1), zone("section", p2, p2))).toBeNull();
    expect(resolveDrop(thread(done), zone("project", "p2", p2))).toBeNull();
  });
});

describe("resolveDrop on a project heading", () => {
  const project: DragSource = { kind: "project", refId: "p1", sectionId: p1 };

  it("orders one project against another", () => {
    expect(resolveDrop(project, zone("project", "p2", p2))).toEqual({
      sectionId: p2,
      anchorRefId: "p2",
      ...justOrder,
    });
  });

  it("ignores itself, a thread row, and a status bucket", () => {
    expect(resolveDrop(project, zone("project", "p1", p1))).toBeNull();
    expect(resolveDrop(project, zone("thread", "t2", p2))).toBeNull();
    expect(resolveDrop(project, zone("section", done, done))).toBeNull();
  });
});

describe("hoverKeys", () => {
  it("lights nothing for a reorder, the list animation already says it", () => {
    expect(
      hoverKeys(
        { sectionId: p1, anchorRefId: "t2", ...justOrder },
        zone("thread", "t2", p1),
        "before",
      ),
    ).toEqual({ section: null, line: null });
  });

  it("rings the section and lines the row for a filing", () => {
    expect(
      hoverKeys(
        { sectionId: done, anchorRefId: "t2", reorder: false, pin: null, bucket: "in-progress" },
        zone("thread", "t2", done),
        "after",
      ),
    ).toEqual({ section: `section:${done}`, line: "thread:t2:after" });
    expect(
      hoverKeys(
        {
          sectionId: PINNED_SECTION_ID,
          anchorRefId: null,
          reorder: false,
          pin: true,
          bucket: null,
        },
        zone("section", PINNED_SECTION_ID, PINNED_SECTION_ID),
        "after",
      ),
    ).toEqual({ section: "section:pinned", line: null });
  });
});

describe("sortableId", () => {
  it("is unique per list, including one thread across two groupings", () => {
    expect(sortableId(zone("thread", "t1", p1))).toBe("thread:project:p1:t1");
    expect(sortableId(zone("thread", "t1", done))).toBe("thread:status:merged:t1");
    expect(sortableId(zone("project", "p1", p1))).toBe("project:p1");
    expect(sortableId(zone("section", done, done))).toBe("section:status:merged");
    // The inert heading node a status or Pinned section registers.
    expect(sortableId(zone("project", null, done))).toBe("project:status:merged");
    expect(sortableId(zone("project", null, PINNED_SECTION_ID))).toBe(
      "project:pinned",
    );
  });
});
