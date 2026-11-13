// Project styles and folder projects, kept in this browser's localStorage.
import { useCallback, useMemo, useState } from "react";
import {
  folderKey,
  isProjectColor,
  isProjectGlyph,
  type FolderProject,
  type ProjectStyle,
} from "@/lib/project-styles";

export const PROJECT_STYLES_KEY = "bb-workspace-sidebar:project-styles:v1";

/** Styles keyed by bb project id or folder key. A key with no style is absent. */
type StyleMap = Partial<Record<string, ProjectStyle>>;

interface Stored {
  styles: StyleMap;
  folders: FolderProject[];
}

const EMPTY: Stored = { styles: {}, folders: [] };

function isString(value: unknown): value is string {
  return typeof value === "string";
}

function parseStyle(value: unknown): ProjectStyle | null {
  if (typeof value !== "object" || value === null) return null;
  const { color, glyph } = value as Record<string, unknown>;
  return {
    color: isProjectColor(color) ? color : null,
    glyph: isProjectGlyph(glyph) ? glyph : null,
  };
}

function parseFolder(value: unknown): FolderProject | null {
  if (typeof value !== "object" || value === null) return null;
  const { id, name, folders } = value as Record<string, unknown>;
  if (!isString(id) || id === "" || !isString(name)) return null;
  if (!Array.isArray(folders) || !folders.every(isString)) return null;
  return { id, name, folders };
}

function read(): Stored {
  try {
    const raw = window.localStorage.getItem(PROJECT_STYLES_KEY);
    if (raw === null) return EMPTY;
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return EMPTY;
    const stored = parsed as Record<string, unknown>;
    const styles: StyleMap = {};
    if (typeof stored.styles === "object" && stored.styles !== null) {
      for (const [key, value] of Object.entries(stored.styles)) {
        const style = parseStyle(value);
        if (style !== null) styles[key] = style;
      }
    }
    const folders = Array.isArray(stored.folders)
      ? stored.folders.flatMap((value: unknown) => parseFolder(value) ?? [])
      : [];
    return { styles, folders };
  } catch {
    return EMPTY;
  }
}

export interface ProjectStyles {
  styles: Readonly<StyleMap>;
  folderProjects: readonly FolderProject[];
  setStyle(projectKey: string, style: ProjectStyle): void;
  /** Adds a new folder project or replaces the one with the same id. */
  saveFolderProject(project: FolderProject): void;
  removeFolderProject(id: string): void;
}

export function useProjectStyles(): ProjectStyles {
  const [stored, setStored] = useState(read);

  const update = useCallback((change: (current: Stored) => Stored) => {
    setStored((current) => {
      const next = change(current);
      try {
        window.localStorage.setItem(PROJECT_STYLES_KEY, JSON.stringify(next));
      } catch {
        // A full or unavailable store keeps the change for this session only.
      }
      return next;
    });
  }, []);

  return useMemo(
    () => ({
      styles: stored.styles,
      folderProjects: stored.folders,
      setStyle: (projectKey, style) =>
        update((current) => ({
          ...current,
          styles: { ...current.styles, [projectKey]: style },
        })),
      saveFolderProject: (project) =>
        update((current) => ({
          ...current,
          folders: current.folders.some((folder) => folder.id === project.id)
            ? current.folders.map((folder) => (folder.id === project.id ? project : folder))
            : [...current.folders, project],
        })),
      removeFolderProject: (id) =>
        update((current) => {
          const { [folderKey(id)]: _removed, ...styles } = current.styles;
          return { styles, folders: current.folders.filter((folder) => folder.id !== id) };
        }),
    }),
    [stored, update],
  );
}
