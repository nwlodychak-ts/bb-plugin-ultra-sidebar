import type { PluginSidebarThread } from "@get-bb/plugin-sdk/app";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "./ui/dialog";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "./ui/command";
import { Icon } from "./ui/icon";
import { useSidebar } from "./sidebar-context";

/** Pick the thread a row should sit under. */
export function MoveThreadDialog({
  thread,
  open,
  onOpenChange,
}: {
  thread: PluginSidebarThread;
  open: boolean;
  onOpenChange(open: boolean): void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-3 p-0 pt-5">
        <div className="grid gap-1 px-5 pr-10">
          <DialogTitle>Move under…</DialogTitle>
          <DialogDescription className="truncate">{thread.displayTitle}</DialogDescription>
        </div>
        {open && <MoveTargets thread={thread} onDone={() => onOpenChange(false)} />}
      </DialogContent>
    </Dialog>
  );
}

function MoveTargets({ thread, onDone }: { thread: PluginSidebarThread; onDone(): void }) {
  const sidebar = useSidebar();
  const targets = sidebar.moveOptionsOf(thread)?.targets ?? [];
  return (
    <Command loop label="Threads" className="rounded-none border-t">
      <CommandInput placeholder="Search threads…" autoFocus />
      <CommandList>
        <CommandEmpty>No threads to move under.</CommandEmpty>
        <CommandGroup>
          {targets.map((target) => (
            <CommandItem
              key={target.id}
              value={target.id}
              keywords={[target.title]}
              onSelect={() => {
                sidebar.moveThread(thread.id, target.id);
                onDone();
              }}
            >
              <Icon name="MessageSquare" aria-hidden />
              <span className="min-w-0 flex-1 truncate">{target.title}</span>
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </Command>
  );
}
