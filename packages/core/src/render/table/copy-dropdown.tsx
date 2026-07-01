import { type Component, createSignal, onCleanup, onMount, Show } from "solid-js";
import { cn } from "cnfast";
import { CheckIcon, CopyIcon } from "../icons";
import {
  extractTableDataFromElement,
  tableDataToCSV,
  tableDataToMarkdown,
  tableDataToTSV,
} from "./utils";

const COPY_RESET_DELAY_MS = 2000;

export const TableCopyDropdown: Component<{ class?: string }> = (props) => {
  const [isOpen, setIsOpen] = createSignal(false);
  const [isCopied, setIsCopied] = createSignal(false);
  let dropdownRef: HTMLDivElement | undefined; // eslint-disable-line no-unassigned-vars
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  const copyTableData = async (format: "csv" | "tsv" | "md"): Promise<void> => {
    if (!dropdownRef) return;
    const tableWrapper = dropdownRef.closest('[data-velomark="table-wrapper"]');
    const tableElement = tableWrapper?.querySelector("table") as HTMLTableElement | null;
    if (!tableElement) return;

    const tableData = extractTableDataFromElement(tableElement);
    const formatters = { csv: tableDataToCSV, tsv: tableDataToTSV, md: tableDataToMarkdown };
    const content = formatters[format](tableData);

    try {
      const clipboardItemData = new ClipboardItem({
        "text/plain": new Blob([content], { type: "text/plain" }),
        "text/html": new Blob([tableElement.outerHTML], { type: "text/html" }),
      });
      await navigator.clipboard.write([clipboardItemData]);
      setIsCopied(true);
      setIsOpen(false);
      timeoutId = setTimeout(() => setIsCopied(false), COPY_RESET_DELAY_MS);
    } catch {
      // Clipboard API not available
    }
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

  onCleanup(() => {
    if (timeoutId !== undefined) clearTimeout(timeoutId);
  });

  return (
    <div class={cn("relative")} ref={dropdownRef}>
      <button
        class={cn(
          "cursor-pointer p-1 text-muted-foreground transition-all hover:text-foreground",
          props.class,
        )}
        onClick={() => setIsOpen(!isOpen())}
        title="Copy table"
        type="button"
      >
        <Show when={isCopied()} fallback={<CopyIcon size={14} />}>
          <CheckIcon size={14} />
        </Show>
      </button>
      <Show when={isOpen()}>
        <div
          class={cn(
            "absolute top-full right-0 z-20 mt-1 min-w-[120px] overflow-hidden rounded-md border border-border bg-background shadow-lg",
          )}
        >
          <button
            class={cn("w-full px-3 py-2 text-left text-sm transition-colors hover:bg-muted/40")}
            onClick={() => copyTableData("md")}
            type="button"
          >
            Markdown
          </button>
          <button
            class={cn("w-full px-3 py-2 text-left text-sm transition-colors hover:bg-muted/40")}
            onClick={() => copyTableData("csv")}
            type="button"
          >
            CSV
          </button>
          <button
            class={cn("w-full px-3 py-2 text-left text-sm transition-colors hover:bg-muted/40")}
            onClick={() => copyTableData("tsv")}
            type="button"
          >
            TSV
          </button>
        </div>
      </Show>
    </div>
  );
};
