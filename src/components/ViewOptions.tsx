// The popover behind the sliders button: every view preference in one place.
//
// One button rather than a row of them. Toggles that live as bare icons in
// the toolbar read as mystery switches (the old "row details" toggle looked
// like it flipped the model), so they are all filed here under a label.
//
// There is no "Sort by": within a section the order is always newest-created
// first — a stack that never reshuffles under the cursor — and the manual
// drag already covers the case where that is not what the user wants.
import { Icon, type IconName } from "@/components/ui/icon";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { GroupBy } from "@/lib/sections";
import {
  CARD_DETAIL_KEYS,
  ROW_DETAIL_KEYS,
  ROW_LAYOUTS,
  type CardDetails,
  type RowDetails,
  type RowLayout,
} from "@/hooks/useViewState";

const DETAIL_LABEL: Record<keyof RowDetails, string> = {
  agent: "Agent",
  branch: "Branch",
  project: "Project",
  pullRequest: "PR",
  jira: "Jira",
  model: "Model",
  machine: "Machine",
  modes: "Plan/goal",
  status: "Status",
  changes: "Changes",
};

const CARD_LABEL: Record<keyof CardDetails, string> = {
  summary: "Summary",
  ask: "Ask",
  project: "Project",
  machine: "Machine",
  branch: "Branch",
  model: "Model",
  attention: "Attention",
  modes: "Plan/goal",
  queue: "Queue",
  pullRequest: "PR",
  jira: "Jira",
  nested: "Nested",
};

const LAYOUT_LABEL: Record<RowLayout, string> = {
  single: "Single line",
  compact: "Compact",
  detailed: "Detailed",
};

/** Facts on the line under the title, shown in compact rows. */
const COMPACT_DETAILS: ReadonlySet<keyof RowDetails> = new Set([
  "agent", "project", "pullRequest", "jira", "machine", "modes", "status", "changes",
]);

function only(...on: (keyof RowDetails)[]): RowDetails {
  const details = {} as RowDetails;
  for (const key of ROW_DETAIL_KEYS) details[key] = on.includes(key);
  return details;
}

const PRESETS: ReadonlyArray<{ label: string; details: RowDetails; layout: RowLayout }> = [
  { label: "Agent + title", details: only("agent"), layout: "single" },
  { label: "Agent + branch", details: only("agent", "branch"), layout: "single" },
  { label: "All", details: only(...ROW_DETAIL_KEYS), layout: "detailed" },
];

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="shrink-0 text-xs text-muted-foreground">{label}</span>
      <div className="w-[9.5rem] shrink-0">{children}</div>
    </div>
  );
}

function Heading({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground/70">
      {children}
    </span>
  );
}

function Check({
  id,
  label,
  checked,
  onChange,
}: {
  id: string;
  label: string;
  checked: boolean;
  onChange(next: boolean): void;
}) {
  return (
    <label
      htmlFor={id}
      className="flex cursor-pointer select-none items-center gap-2 whitespace-nowrap text-xs text-foreground"
    >
      <Checkbox
        id={id}
        checked={checked}
        onCheckedChange={(next) => onChange(next === true)}
        className="size-3.5"
      />
      {label}
    </label>
  );
}

export function ViewOptions({
  open,
  onOpenChange,
  groupBy,
  onGroupByChange,
  rowLayout,
  onRowLayoutChange,
  projectIcons,
  onProjectIconsChange,
  rowDetails,
  onRowDetailChange,
  onRowDetailsReplace,
  hoverCard,
  onHoverCardChange,
  cardDetails,
  onCardDetailChange,
  showArchived,
  onShowArchivedChange,
  onCollapseAll,
  onExpandAll,
}: {
  open?: boolean;
  onOpenChange?(open: boolean): void;
  groupBy: GroupBy;
  onGroupByChange(next: GroupBy): void;
  rowLayout: RowLayout;
  onRowLayoutChange(next: RowLayout): void;
  projectIcons: boolean;
  onProjectIconsChange(next: boolean): void;
  rowDetails: RowDetails;
  onRowDetailChange(detail: keyof RowDetails, on: boolean): void;
  onRowDetailsReplace(next: RowDetails): void;
  hoverCard: boolean;
  onHoverCardChange(next: boolean): void;
  cardDetails: CardDetails;
  onCardDetailChange(detail: keyof CardDetails, on: boolean): void;
  showArchived: boolean;
  onShowArchivedChange(next: boolean): void;
  onCollapseAll(): void;
  onExpandAll(): void;
}) {
  const isLit = showArchived;
  const visibleDetails = ROW_DETAIL_KEYS.filter(
    (detail) => rowLayout !== "compact" || COMPACT_DETAILS.has(detail),
  );

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="View options"
          className={cn(
            "flex size-6 items-center justify-center rounded-md transition-colors",
            "text-muted-foreground/70 hover:bg-accent hover:text-foreground",
            isLit && "bg-accent/60 text-foreground",
          )}
        >
          <Icon name="SlidersHorizontal" className="size-3.5" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-72 p-3">
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-2">
            <Row label="Group by">
              <Select
                value={groupBy}
                onValueChange={(next) => onGroupByChange(next as GroupBy)}
              >
                <SelectTrigger className="h-7 w-full text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="project">Project</SelectItem>
                  <SelectItem value="status">Status</SelectItem>
                </SelectContent>
              </Select>
            </Row>
            <Row label="Rows">
              <Select
                value={rowLayout}
                onValueChange={(next) => {
                  const layout = ROW_LAYOUTS.find((option) => option === next);
                  if (layout !== undefined) onRowLayoutChange(layout);
                }}
              >
                <SelectTrigger className="h-7 w-full text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROW_LAYOUTS.map((layout) => (
                    <SelectItem key={layout} value={layout}>{LAYOUT_LABEL[layout]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Row>
          </div>

          <div className="flex flex-col gap-1.5">
            <Heading>Layout</Heading>
            <div className="grid grid-cols-2 gap-x-2 gap-y-1.5">
              <Check id="view-project-icons" label="Project icons" checked={projectIcons} onChange={onProjectIconsChange} />
              <Check id="view-show-archived" label="Archived" checked={showArchived} onChange={onShowArchivedChange} />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Heading>Show on rows</Heading>
            <div className="flex gap-1">
              {PRESETS.map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => {
                    onRowDetailsReplace(preset.details);
                    onRowLayoutChange(preset.layout);
                  }}
                  className="flex-1 whitespace-nowrap rounded-md border border-border px-1 py-0.5 text-[11px] text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                >
                  {preset.label}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-3 gap-x-2 gap-y-1.5">
              {visibleDetails.map((detail) => (
                <Check
                  key={detail}
                  id={`view-detail-${detail}`}
                  label={DETAIL_LABEL[detail]}
                  checked={rowDetails[detail]}
                  onChange={(next) => onRowDetailChange(detail, next)}
                />
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <Heading>Hover card</Heading>
              <Check id="view-hover-card" label="Show" checked={hoverCard} onChange={onHoverCardChange} />
            </div>
            <div className={cn("grid grid-cols-3 gap-x-2 gap-y-1.5", !hoverCard && "hidden")}>
              {CARD_DETAIL_KEYS.map((detail) => (
                <Check
                  key={detail}
                  id={`view-card-${detail}`}
                  label={CARD_LABEL[detail]}
                  checked={cardDetails[detail]}
                  onChange={(next) => onCardDetailChange(detail, next)}
                />
              ))}
            </div>
          </div>

          <div className="flex items-center gap-1.5 border-t border-border pt-2.5">
            <ActionButton icon="ChevronsUp" label="Collapse all" onClick={onCollapseAll} />
            <ActionButton icon="ChevronsDown" label="Expand all" onClick={onExpandAll} />
          </div>

        </div>
      </PopoverContent>
    </Popover>
  );
}

function ActionButton({
  icon,
  label,
  onClick,
}: {
  icon: IconName;
  label: string;
  onClick(): void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-1 items-center justify-center gap-1 rounded-md border border-border px-2 py-1 text-xs text-foreground transition-colors hover:bg-accent"
    >
      <Icon name={icon} className="size-3" />
      {label}
    </button>
  );
}
