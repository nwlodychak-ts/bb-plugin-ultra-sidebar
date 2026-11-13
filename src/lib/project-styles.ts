// Project colors, glyphs and folder projects the user sets by hand.
import {
  Atom01Icon,
  BotIcon,
  Book02Icon,
  BrainIcon,
  Briefcase01Icon,
  ChartLineData01Icon,
  CloudIcon,
  CodeIcon,
  ComputerTerminal01Icon,
  DatabaseIcon,
  DnaIcon,
  FireIcon,
  Flag01Icon,
  FolderIcon,
  GameController01Icon,
  Home01Icon,
  InternetIcon,
  Layers01Icon,
  Leaf01Icon,
  Package01Icon,
  PaintBoardIcon,
  PuzzleIcon,
  Rocket01Icon,
  ServerStack01Icon,
  Settings01Icon,
  Shield01Icon,
  StarIcon,
  Target02Icon,
  TestTube01Icon,
  UserIcon,
  Wrench01Icon,
  ZapIcon,
} from "@hugeicons/core-free-icons";
import { formatHomePathForDisplay } from "./utils";

export const PROJECT_GLYPHS = {
  Folder: FolderIcon,
  Code: CodeIcon,
  Terminal: ComputerTerminal01Icon,
  Database: DatabaseIcon,
  Server: ServerStack01Icon,
  Cloud: CloudIcon,
  Globe: InternetIcon,
  TestTube: TestTube01Icon,
  Dna: DnaIcon,
  Atom: Atom01Icon,
  Brain: BrainIcon,
  Bot: BotIcon,
  Chart: ChartLineData01Icon,
  Layers: Layers01Icon,
  Package: Package01Icon,
  Puzzle: PuzzleIcon,
  Wrench: Wrench01Icon,
  Settings: Settings01Icon,
  Book: Book02Icon,
  Briefcase: Briefcase01Icon,
  Home: Home01Icon,
  User: UserIcon,
  Rocket: Rocket01Icon,
  Zap: ZapIcon,
  Fire: FireIcon,
  Leaf: Leaf01Icon,
  Star: StarIcon,
  Flag: Flag01Icon,
  Target: Target02Icon,
  Shield: Shield01Icon,
  Paint: PaintBoardIcon,
  Game: GameController01Icon,
} as const;

export type ProjectGlyph = keyof typeof PROJECT_GLYPHS;

export const PROJECT_COLORS = [
  { name: "Gray", value: "#8b8d98" },
  { name: "Red", value: "#e5484d" },
  { name: "Orange", value: "#f76b15" },
  { name: "Yellow", value: "#e2a336" },
  { name: "Green", value: "#30a46c" },
  { name: "Teal", value: "#12a594" },
  { name: "Blue", value: "#0090ff" },
  { name: "Indigo", value: "#3e63dd" },
  { name: "Purple", value: "#8e4ec6" },
  { name: "Pink", value: "#d6409f" },
] as const;

export type ProjectColor = (typeof PROJECT_COLORS)[number]["value"];

/** A project's color and glyph. Null falls back to the detected artwork. */
export interface ProjectStyle {
  color: ProjectColor | null;
  glyph: ProjectGlyph | null;
}

/** A named set of folders. A thread with its checkout in one of them files here. */
export interface FolderProject {
  id: string;
  name: string;
  folders: readonly string[];
}

const FOLDER_PREFIX = "folder:";

/** The project key a folder project uses for styles, filters, headings and rows. */
export type FolderKey = `${typeof FOLDER_PREFIX}${string}`;

export function folderKey(id: string): FolderKey {
  return `${FOLDER_PREFIX}${id}`;
}

/** A key for a folder project not saved yet. */
export function newFolderKey(): FolderKey {
  return folderKey(crypto.randomUUID().slice(0, 8));
}

/** The folder project id inside a project key, or null for a bb project. */
export function folderIdOf(key: string): string | null {
  return key.startsWith(FOLDER_PREFIX) ? key.slice(FOLDER_PREFIX.length) : null;
}

export function isProjectColor(value: unknown): value is ProjectColor {
  return PROJECT_COLORS.some((option) => option.value === value);
}

export function isProjectGlyph(value: unknown): value is ProjectGlyph {
  return typeof value === "string" && Object.hasOwn(PROJECT_GLYPHS, value);
}

function trimPath(path: string): string {
  return path.trim().replace(/\/+$/, "");
}

/**
 * The folder project with a folder holding `path`, or null. The deepest
 * folder wins. A folder matches in its absolute form or its `~/` form.
 */
export function folderProjectFor(
  path: string,
  projects: readonly FolderProject[],
): FolderProject | null {
  const forms = [trimPath(path), trimPath(formatHomePathForDisplay(path))];
  let best: FolderProject | null = null;
  let bestLength = -1;
  for (const project of projects) {
    for (const raw of project.folders) {
      const folder = trimPath(raw);
      if (folder === "" || folder.length <= bestLength) continue;
      if (forms.some((form) => form === folder || form.startsWith(`${folder}/`))) {
        best = project;
        bestLength = folder.length;
      }
    }
  }
  return best;
}

/** Checkout paths in `~/` form, plus the repository root above each worktree. */
export function folderSuggestions(paths: Iterable<string>): string[] {
  const found = new Set<string>();
  for (const path of paths) {
    const shown = trimPath(formatHomePathForDisplay(path));
    found.add(shown);
    const worktrees = shown.indexOf("/worktrees/");
    if (worktrees > 0) found.add(shown.slice(0, worktrees));
  }
  return [...found].sort();
}
