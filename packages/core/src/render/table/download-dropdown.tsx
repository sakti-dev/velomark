import { type Component, createSignal, onCleanup, onMount, Show } from "solid-js";
import { cn } from "cnfast";
import { save } from "../../lib/utils";
import { DownloadIcon } from "../icons";
import { extractTableDataFromElement, tableDataToCSV, tableDataToMarkdown } from "./utils";

export const TableDownloadDropdown: Component<{ class?: string }> = (props) => {
  const [isOpen, setIsOpen] = createSignal(false);
  let dropdownRef: HTMLDivElement | undefined; // eslint-disable-line no-unassigned-vars -- assigned by Solid ref

  const downloadTableData = (format: "csv" | "md"): void => {
    if (!dropdownRef) return;
    const tableWrapper = dropdownRef.closest('[data-velomark="table-wrapper"]');
    const tableElement = tableWrapper?.querySelector("table") as HTMLTableElement | null;
    if (!tableElement) return;

    const tableData = extractTableDataFromElement(tableElement);
    if (format === "csv") {
      save("table.csv", tableDataToCSV(tableData), "text/csv");
    } else {
      save("table.md", tableDataToMarkdown(tableData), "text/markdown");
    }
    setIsOpen(false);
  };

  onMount(() => {
    const handleClickOutside = (event: MouseEvent): void => {
      if (dropdownRef && !event.composedPath().includes(dropdownRef)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    onCleanup(() => document.removeEventListener("mousedown", handleClickOutside));
  });

  return (
    <div class={cn("relative")} ref={dropdownRef}>
      <button
        class={cn(
          "cursor-pointer p-1 text-muted-foreground transition-all hover:text-foreground",
          props.class,
        )}
        onClick={() => setIsOpen(!isOpen())}
        title="Download table"
        type="button"
      >
        <DownloadIcon size={14} />
      </button>
      <Show when={isOpen()}>
        <div
          class={cn(
            "absolute top-full right-0 z-20 mt-1 min-w-[120px] overflow-hidden rounded-md border border-border bg-background shadow-lg",
          )}
        >
          <button
            class={cn("w-full px-3 py-2 text-left text-sm transition-colors hover:bg-muted/40")}
            onClick={() => downloadTableData("csv")}
            type="button"
          >
            CSV
          </button>
          <button
            class={cn("w-full px-3 py-2 text-left text-sm transition-colors hover:bg-muted/40")}
            onClick={() => downloadTableData("md")}
            type="button"
          >
            Markdown
          </button>
        </div>
      </Show>
    </div>
  );
};
