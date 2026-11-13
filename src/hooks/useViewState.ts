// Per-client view state: which sections are collapsed, which subagent
// subtrees are expanded. This is not worth a database round trip and it is
// reasonable for two windows to disagree, so it lives in localStorage.
//
// Every access is guarded. A throw inside a replaced thread list costs the
// user the whole sidebar, and localStorage throws for reasons that have
// nothing to do with us (private mode, quota, a disabled origin).
import { useCallback, useState } from "react";

const PREFIX = "bb-workspace-sidebar";

/** Versioned keys: a shape change becomes a new key, not a migration. */
export const COLLAPSED_SECTIONS_KEY = `${PREFIX}:collapsed-sections:v2`;
export const EXPANDED_SUBTREES_KEY = `${PREFIX}:expanded-subtrees:v1`;
export const ROW_DETAILS_KEY = `${PREFIX}:row-details:v1`;
export const COMPACT_ROWS_KEY = `${PREFIX}:compact-rows:v1`;
export const PROJECT_ICONS_KEY = `${PREFIX}:project-icons:v1`;
export const SINGLE_LINE_KEY = `${PREFIX}:single-line:v1`;
export const EMPTY_PROJECTS_OPEN_KEY = `${PREFIX}:empty-projects-open:v1`;
export const CARD_DETAILS_KEY = `${PREFIX}:card-details:v1`;
export const HOVER_CARD_KEY = `${PREFIX}:hover-card:v1`;
export const ROW_LAYOUT_KEY = `${PREFIX}:row-layout:v1`;
export const GROUP_BY_KEY = `${PREFIX}:group-by:v1`;
export const PROJECT_FILTER_KEY = `${PREFIX}:project-filter:v1`;

/** Which facts a row shows, in View options order. Each is its own switch. */
export const ROW_DETAIL_KEYS = [
  "agent",
  "branch",
  "project",
  "pullRequest",
  "jira",
  "model",
  "machine",
  "modes",
  "status",
  "changes",
] as const;

export type RowDetails = Record<(typeof ROW_DETAIL_KEYS)[number], boolean>;

/** How much of a row shows: one line, a title plus a summary line, or all three lines. */
export const ROW_LAYOUTS = ["single", "compact", "detailed"] as const;

export type RowLayout = (typeof ROW_LAYOUTS)[number];

/** The layout the two earlier single-line and compact-rows switches describe. */
export function legacyRowLayout(): RowLayout {
  try {
    if (window.localStorage.getItem(SINGLE_LINE_KEY) === "true") return "single";
    return window.localStorage.getItem(COMPACT_ROWS_KEY) === "false" ? "detailed" : "compact";
  } catch {
    return "compact";
  }
}

/** What the hover card on a row shows, beyond its title and status. */
export const CARD_DETAIL_KEYS = [
  "summary",
  "ask",
  "attention",
  "project",
  "machine",
  "branch",
  "model",
  "modes",
  "queue",
  "pullRequest",
  "jira",
  "nested",
] as const;

export type CardDetails = Record<(typeof CARD_DETAIL_KEYS)[number], boolean>;

function readSwitches<K extends string>(key: string, keys: readonly K[]): Record<K, boolean> {
  const next = Object.fromEntries(keys.map((name) => [name, true])) as Record<K, boolean>;
  try {
    const raw = window.localStorage.getItem(key);
    if (raw === null) return next;
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return next;
    for (const name of keys) {
      const value = (parsed as Record<string, unknown>)[name];
      if (typeof value === "boolean") next[name] = value;
    }
    return next;
  } catch {
    return next;
  }
}

/** A persisted set of named switches, each on by default. */
export function usePersistedSwitches<K extends string>(
  key: string,
  keys: readonly K[],
): [
  Record<K, boolean>,
  (name: K, on: boolean) => void,
  (next: Record<K, boolean>) => void,
] {
  const [value, setValue] = useState(() => readSwitches(key, keys));
  const set = useCallback(
    (name: K, on: boolean) => {
      setValue((current) => {
        if (current[name] === on) return current;
        const next = { ...current, [name]: on };
        writeJson(key, next);
        return next;
      });
    },
    [key],
  );
  const replace = useCallback(
    (next: Record<K, boolean>) => {
      writeJson(key, next);
      setValue(next);
    },
    [key],
  );
  return [value, set, replace];
}

/** The per-row detail switches, persisted as one object. */
export function usePersistedDetails(
  key: string,
): ReturnType<typeof usePersistedSwitches<keyof RowDetails>> {
  return usePersistedSwitches(key, ROW_DETAIL_KEYS);
}

/** A persisted boolean, for view preferences with an on/off shape. */
export function usePersistedFlag(
  key: string,
  fallback: boolean,
): [boolean, (next: boolean) => void] {
  const [value, setValue] = useState<boolean>(() => {
    try {
      const raw = window.localStorage.getItem(key);
      return raw === null ? fallback : raw === "true";
    } catch {
      return fallback;
    }
  });

  const commit = useCallback(
    (next: boolean) => {
      try {
        window.localStorage.setItem(key, String(next));
      } catch {
        // See writeSet: losing the preference is acceptable, throwing is not.
      }
      setValue(next);
    },
    [key],
  );

  return [value, commit];
}

function readSet(key: string): Set<string> {
  // Introduce the Done default once, preserving other collapsed sections.
  // Subsequent explicit expansion is saved under v2 and survives reloads.
  const fallback = () => key === COLLAPSED_SECTIONS_KEY
    ? new Set([...readSet(`${PREFIX}:collapsed-sections:v1`), "status:done"])
    : new Set<string>();
  try {
    const raw = window.localStorage.getItem(key);
    if (raw === null) return fallback();
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return fallback();
    return new Set(parsed.filter((value): value is string => typeof value === "string"));
  } catch {
    return fallback();
  }
}

function writeJson(key: string, value: unknown): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // See writeSet.
  }
}

function writeSet(key: string, value: Set<string>): void {
  try {
    window.localStorage.setItem(key, JSON.stringify([...value]));
  } catch {
    // A full or unavailable store costs the user their collapse state on the
    // next reload. It must not cost them the sidebar.
  }
}

/** A persisted set of ids with a stable toggle. */
export function usePersistedSet(key: string): {
  has: (id: string) => boolean;
  toggle: (id: string) => void;
  set: (id: string, member: boolean) => void;
  addAll: (ids: Iterable<string>) => void;
  replace: (ids: Iterable<string>) => void;
} {
  const [ids, setIds] = useState<Set<string>>(() => readSet(key));

  const has = useCallback((id: string) => ids.has(id), [ids]);

  const set = useCallback(
    (id: string, member: boolean) => {
      setIds((current) => {
        if (current.has(id) === member) return current;
        const next = new Set(current);
        if (member) next.add(id);
        else next.delete(id);
        writeSet(key, next);
        return next;
      });
    },
    [key],
  );

  const toggle = useCallback(
    (id: string) => {
      setIds((current) => {
        const next = new Set(current);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        writeSet(key, next);
        return next;
      });
    },
    [key],
  );

  // Adding an ancestor chain is one update and at most one write. Returning
  // `current` unchanged when nothing was added is what keeps an effect that
  // calls this on every host push from looping.
  const addAll = useCallback(
    (incoming: Iterable<string>) => {
      setIds((current) => {
        let next: Set<string> | null = null;
        for (const id of incoming) {
          if (current.has(id)) continue;
          next ??= new Set(current);
          next.add(id);
        }
        if (next === null) return current;
        writeSet(key, next);
        return next;
      });
    },
    [key],
  );

  const replace = useCallback(
    (nextIds: Iterable<string>) => {
      const next = new Set(nextIds);
      writeSet(key, next);
      setIds(next);
    },
    [key],
  );

  return { has, toggle, set, addAll, replace };
}

/** A persisted value from a closed set; an unrecognized stored value resets. */
export function usePersistedChoice<T extends string>(
  key: string,
  fallback: T,
  allowed: readonly T[],
): [T, (next: T) => void] {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = window.localStorage.getItem(key);
      return allowed.includes(raw as T) ? (raw as T) : fallback;
    } catch {
      return fallback;
    }
  });
  const commit = useCallback(
    (next: T) => {
      try {
        window.localStorage.setItem(key, next);
      } catch {
        // See writeSet.
      }
      setValue(next);
    },
    [key],
  );
  return [value, commit];
}
