// Project editor: color and glyph for any project, name and folders for a folder project.
import { useId, useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import type { ProjectStyles } from "@/hooks/useProjectStyles";
import {
  PROJECT_COLORS,
  PROJECT_GLYPHS,
  folderIdOf,
  type ProjectColor,
  type ProjectGlyph,
} from "@/lib/project-styles";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "./ui/dialog";
import { Icon } from "./ui/icon";

const GLYPH_NAMES = Object.keys(PROJECT_GLYPHS) as ProjectGlyph[];

const chip =
  "flex size-7 items-center justify-center rounded-md border border-transparent text-muted-foreground transition-colors hover:bg-accent hover:text-foreground aria-pressed:border-border aria-pressed:bg-accent aria-pressed:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

const button =
  "rounded-md px-2.5 py-1 text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

const field =
  "h-7 min-w-0 flex-1 rounded-md border border-border bg-background px-2 text-xs text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring";

/** The project the dialog edits. A folder key with no saved project starts a new one. */
export interface ProjectEditTarget {
  key: string;
  /** The name a new folder project starts with. */
  initialName: string;
}

export function ProjectDialog({
  target,
  onClose,
  styles,
  nameOf,
  suggestions,
}: {
  /** Null closes the dialog. */
  target: ProjectEditTarget | null;
  onClose(): void;
  styles: ProjectStyles;
  nameOf(projectKey: string): string;
  suggestions: readonly string[];
}) {
  return (
    <Dialog open={target !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="gap-4 p-5">
        {target === null ? null : (
          <ProjectEditor
            key={target.key}
            target={target.key}
            initialName={target.initialName}
            onClose={onClose}
            styles={styles}
            nameOf={nameOf}
            suggestions={suggestions}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function ProjectEditor({
  target,
  initialName,
  onClose,
  styles,
  nameOf,
  suggestions,
}: {
  target: string;
  initialName: string;
  onClose(): void;
  styles: ProjectStyles;
  nameOf(projectKey: string): string;
  suggestions: readonly string[];
}) {
  const listId = useId();
  const folderId = folderIdOf(target);
  const existing =
    folderId === null ? null : styles.folderProjects.find((project) => project.id === folderId) ?? null;
  const [name, setName] = useState(existing?.name ?? initialName);
  const [folders, setFolders] = useState<readonly string[]>(existing?.folders ?? []);
  const [draft, setDraft] = useState("");
  const [color, setColor] = useState<ProjectColor | null>(styles.styles[target]?.color ?? null);
  const [glyph, setGlyph] = useState(styles.styles[target]?.glyph ?? null);

  const pending = draft.trim();
  const allFolders = pending !== "" && !folders.includes(pending) ? [...folders, pending] : folders;
  const canSave = folderId === null || (name.trim() !== "" && allFolders.length > 0);

  const addFolder = () => {
    setFolders(allFolders);
    setDraft("");
  };

  const save = () => {
    if (!canSave) return;
    if (folderId !== null) {
      styles.saveFolderProject({ id: folderId, name: name.trim(), folders: allFolders });
    }
    styles.setStyle(target, { color, glyph });
    onClose();
  };

  const title =
    folderId === null ? nameOf(target) || "Project" : existing === null ? "New folder project" : existing.name;

  return (
    <>
      <div className="grid gap-1 pr-6">
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription>
          {folderId === null
            ? "Color and glyph for this project's heading and rows."
            : "Threads with a checkout inside these folders file under this project."}
        </DialogDescription>
      </div>

      {folderId === null ? null : (
        <>
          <label className="flex flex-col gap-1 text-xs text-muted-foreground">
            Name
            <input
              autoFocus
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Lab apps"
              className={field}
            />
          </label>
          <div className="flex flex-col gap-1.5 text-xs text-muted-foreground">
            Folders
            {folders.length === 0 ? null : (
              <ul className="flex flex-col gap-1" aria-label="Folders">
                {folders.map((folder) => (
                  <li key={folder} className="flex items-center gap-2 text-foreground">
                    <Icon name="Folder" className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
                    <span className="min-w-0 flex-1 truncate">{folder}</span>
                    <button
                      type="button"
                      aria-label={`Remove ${folder}`}
                      onClick={() => setFolders(folders.filter((other) => other !== folder))}
                      className="rounded p-0.5 text-muted-foreground hover:bg-accent hover:text-foreground"
                    >
                      <Icon name="X" className="size-3" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <div className="flex items-center gap-1.5">
              <input
                aria-label="Add folder"
                list={listId}
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key !== "Enter") return;
                  event.preventDefault();
                  addFolder();
                }}
                placeholder="~/work/my-repo"
                className={field}
              />
              <button
                type="button"
                onClick={addFolder}
                disabled={pending === ""}
                className={cn(button, "border border-border text-foreground hover:bg-accent disabled:opacity-50")}
              >
                Add
              </button>
            </div>
            <datalist id={listId}>
              {suggestions.map((path) => (
                <option key={path} value={path} />
              ))}
            </datalist>
          </div>
        </>
      )}

      <fieldset className="flex flex-col gap-1.5">
        <legend className="mb-1.5 text-xs text-muted-foreground">Color</legend>
        <div className="flex flex-wrap gap-1">
          <button type="button" aria-label="No color" aria-pressed={color === null} onClick={() => setColor(null)} className={chip}>
            <Icon name="X" className="size-3" />
          </button>
          {PROJECT_COLORS.map((option) => (
            <button
              key={option.value}
              type="button"
              aria-label={option.name}
              aria-pressed={color === option.value}
              onClick={() => setColor(option.value)}
              className={chip}
            >
              <span className="size-3.5 rounded-full" style={{ backgroundColor: option.value }} />
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-1.5">
        <legend className="mb-1.5 text-xs text-muted-foreground">Glyph</legend>
        <div className="grid grid-cols-[repeat(auto-fill,minmax(1.75rem,1fr))] gap-1">
          <button
            type="button"
            aria-label="Detected icon"
            title="Detected icon"
            aria-pressed={glyph === null}
            onClick={() => setGlyph(null)}
            className={cn(chip, "text-[10px]")}
          >
            Auto
          </button>
          {GLYPH_NAMES.map((name) => (
            <button
              key={name}
              type="button"
              aria-label={name}
              title={name}
              aria-pressed={glyph === name}
              onClick={() => setGlyph(name)}
              className={chip}
              style={color === null ? undefined : { color }}
            >
              <HugeiconsIcon icon={PROJECT_GLYPHS[name]} className="size-4" aria-hidden="true" />
            </button>
          ))}
        </div>
      </fieldset>

      <div className="flex items-center gap-2 border-t border-border pt-3">
        {existing === null ? null : (
          <button
            type="button"
            onClick={() => {
              styles.removeFolderProject(existing.id);
              onClose();
            }}
            className={cn(button, "text-destructive hover:bg-destructive/10")}
          >
            Delete
          </button>
        )}
        <span className="flex-1" />
        <button type="button" onClick={onClose} className={cn(button, "text-muted-foreground hover:bg-accent hover:text-foreground")}>
          Cancel
        </button>
        <button
          type="button"
          onClick={save}
          disabled={!canSave}
          className={cn(button, "bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50")}
        >
          Save
        </button>
      </div>
    </>
  );
}
