import { describe, expect, it } from "vitest";
import {
  STATUS_BUCKETS,
  bucketFromSectionId,
  canFileInto,
  isFinished,
  statusBucket,
  statusSectionId,
} from "./status";

describe("statusBucket", () => {
  it("files a working thread In progress and a stopped one Complete", () => {
    expect(statusBucket(undefined, { working: true })).toBe("in-progress");
    expect(statusBucket(undefined)).toBe("complete");
  });

  it("reads the bucket off the pull request", () => {
    expect(statusBucket({ state: "open" })).toBe("pull-request");
    expect(statusBucket({ state: "draft" })).toBe("pull-request");
    expect(statusBucket({ state: "merged" })).toBe("merged");
    expect(statusBucket({ state: "closed" })).toBe("closed");
  });

  it("puts attention above an open pull request and below a finished one", () => {
    expect(statusBucket(undefined, { attention: true })).toBe("needs-attention");
    expect(statusBucket({ state: "open" }, { attention: true })).toBe("needs-attention");
    expect(statusBucket({ state: "merged" }, { attention: true })).toBe("merged");
  });

  it("files an archived thread under Archived ahead of any other rule", () => {
    expect(statusBucket({ state: "merged" }, { archived: true, attention: true })).toBe("archived");
    expect(statusBucket(undefined, { archived: true, working: true })).toBe("archived");
  });
});

describe("what a person can do to a bucket", () => {
  const keys = (pick: (bucket: (typeof STATUS_BUCKETS)[number]) => boolean) =>
    STATUS_BUCKETS.filter(pick).map((bucket) => bucket.key);

  it("files by hand into In progress alone", () => {
    expect(keys((bucket) => canFileInto(bucket.key))).toEqual(["in-progress"]);
  });

  it("counts Merged, Closed and Archived as finished", () => {
    expect(keys((bucket) => isFinished(bucket.key))).toEqual(["merged", "closed", "archived"]);
  });
});

describe("status section ids", () => {
  it("round-trips a bucket and rejects anything else", () => {
    expect(bucketFromSectionId(statusSectionId("pull-request"))).toBe("pull-request");
    expect(bucketFromSectionId("status:nope")).toBeNull();
    expect(bucketFromSectionId("project:p1")).toBeNull();
    expect(bucketFromSectionId(null)).toBeNull();
  });
});
