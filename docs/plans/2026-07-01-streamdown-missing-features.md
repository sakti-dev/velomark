# Streamdown Missing Features — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Port all streamdown-native components, contexts, hooks, and utilities that velomark doesn't have yet.

**Architecture:** Each missing feature maps 1:1 to a streamdown source file in `docs/references/streamdown/packages/streamdown/lib/`. They fall into four groups: (1) code-block extras (download, skeleton, context), (2) table extras (wrapper attr, copy, download, fullscreen, utils), (3) standalone components (link safety modal), and (4) infrastructure utilities (contexts, hooks, helpers).

**Tech Stack:** SolidJS, cnfast, shadcn CSS variables (via `bg-background`, `text-muted-foreground`, `border-border`, etc.)

## Key differences from streamdown (apply to ALL tasks)

| Streamdown concept                | Velomark equivalent                                                                   |
| --------------------------------- | ------------------------------------------------------------------------------------- |
| `useIcons()` / `IconProvider`     | Direct imports from `../icons` (or `../../icons` from deeper)                         |
| `useCn()` / `PrefixContext`       | Direct `import { cn } from "cnfast"` — no prefix context                              |
| `useTranslations()`               | Hardcoded English strings (see per-task string lists)                                 |
| `StreamdownContext` `isAnimating` | **Dropped** — velomark has no animation system. All `disabled={isAnimating}` omitted. |
| `data-streamdown="..."`           | `data-velomark="..."` — match existing convention                                     |
| `save()` from `../utils`          | `save()` from `../../lib/utils` (or appropriate relative path)                        |
| `createPortal` from `react-dom`   | `<Portal>` from `solid-js/web`                                                        |
| `useEffect` cleanup               | `onMount` + `onCleanup`                                                               |
| `useState`                        | `createSignal`                                                                        |
| `useRef`                          | plain `let` variable or `ref={el => ...}` callback                                    |
| `useCallback`                     | not needed in Solid (functions are stable by default)                                 |

## Icons already available (DO NOT re-add)

`icons.tsx` already has: `CheckIcon`, `CopyIcon`, `DownloadIcon`, `Maximize2Icon`, `RotateCcwIcon`, `XIcon`, `ZoomInIcon`, `ZoomOutIcon`.

## Icons that need adding (Task 1)

`Loader2Icon` (skeleton spinner), `ExternalLinkIcon` (link modal).

---

## Phase 1: Foundation (no dependencies — do these first, in parallel)

### Task 1: Add missing icons + extend IconProps

**Files:**

- Modify: `packages/core/src/render/icons.tsx`

**Why:** `CodeBlockSkeleton` needs `Loader2Icon` with `animate-spin` class. `LinkSafetyModal` needs `ExternalLinkIcon`. Current `IconProps` is `{ size?: number }` — needs `class?: string` so callers can apply Tailwind classes directly to the `<svg>`.

**Step 1: Extend IconProps and update all existing icons**

Change interface:

```ts
export interface IconProps {
  class?: string;
  size?: number;
}
```

Add `class={props.class}` to every existing icon's `<svg>` element (8 icons: CheckIcon, CopyIcon, DownloadIcon, Maximize2Icon, RotateCcwIcon, XIcon, ZoomInIcon, ZoomOutIcon).

**Step 2: Add Loader2Icon**

A feather-style spinner (circle with arc). SVG path for a loader spinner:

```tsx
export const Loader2Icon: Component<IconProps> = (props) => (
  <svg
    aria-hidden="true"
    class={props.class}
    color="currentColor"
    height={props.size ?? 16}
    viewBox="0 0 24 24"
    width={props.size ?? 16}
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M21 12a9 9 0 1 1-6.219-8.56"
      fill="none"
      stroke="currentColor"
      stroke-linecap="round"
      stroke-linejoin="round"
      stroke-width="2"
    />
  </svg>
);
```

**Step 3: Add ExternalLinkIcon**

Box with arrow pointing out (feather `external-link`):

```tsx
export const ExternalLinkIcon: Component<IconProps> = (props) => (
  <svg
    aria-hidden="true"
    class={props.class}
    color="currentColor"
    height={props.size ?? 16}
    viewBox="0 0 24 24"
    width={props.size ?? 16}
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M15 3h6v6M10 14 21 3M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"
      fill="none"
      stroke="currentColor"
      stroke-linecap="round"
      stroke-linejoin="round"
      stroke-width="2"
    />
  </svg>
);
```

**Step 4: Verify + commit**

```bash
vp check && vp run --filter ./packages/core test
```

```bash
git add packages/core/src/render/icons.tsx
git commit -m "feat(icons): add Loader2Icon, ExternalLinkIcon, extend IconProps with class"
```

---

### Task 2: Shared utilities — save(), scroll-lock, detect-direction

**Files:**

- Create: `packages/core/src/lib/utils.ts`
- Create: `packages/core/src/lib/scroll-lock.ts`
- Create: `packages/core/src/lib/detect-direction.ts`

#### 2a: `src/lib/utils.ts` — `save()` function

**Reference:** `docs/references/streamdown/packages/streamdown/lib/utils.ts:35-48`

Port the `save()` function verbatim (it's pure DOM, no framework deps). This handles the UTF-8 BOM for CSV files (important for Excel compatibility):

```ts
export const save = (filename: string, content: string | Blob, mimeType: string): void => {
  const bom = typeof content === "string" && mimeType.startsWith("text/csv") ? "\uFEFF" : "";
  const blob =
    typeof content === "string" ? new Blob([bom + content], { type: mimeType }) : content;
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};
```

#### 2b: `src/lib/scroll-lock.ts`

**Reference:** `docs/references/streamdown/packages/streamdown/lib/scroll-lock.ts`

Port verbatim — uses **reference counting** with `overflow: hidden` (NOT `position: fixed`). Ref-counting is critical for nested overlays (fullscreen table + link modal inside it):

```ts
let activeCount = 0;

export const lockBodyScroll = (): void => {
  activeCount += 1;
  if (activeCount === 1) {
    document.body.style.overflow = "hidden";
  }
};

export const unlockBodyScroll = (): void => {
  activeCount = Math.max(0, activeCount - 1);
  if (activeCount === 0) {
    document.body.style.overflow = "";
  }
};
```

#### 2c: `src/lib/detect-direction.ts`

**Reference:** `docs/references/streamdown/packages/streamdown/lib/detect-direction.ts`

Port verbatim — pure TypeScript, no deps. Exports `detectTextDirection(text: string): "ltr" | "rtl"`.

**Step: Verify + commit (all three files together)**

```bash
vp check && vp run --filter ./packages/core test
```

```bash
git add packages/core/src/lib/utils.ts packages/core/src/lib/scroll-lock.ts packages/core/src/lib/detect-direction.ts
git commit -m "feat: add save(), scroll-lock, detect-direction utilities"
```

---

### Task 3: Incomplete code fence + table detection

**Files:**

- Create: `packages/core/src/lib/incomplete-code-utils.ts`

**Reference:** `docs/references/streamdown/packages/streamdown/lib/incomplete-code-utils.ts`

Port verbatim — pure TypeScript, no deps. Exports `hasIncompleteCodeFence(markdown: string): boolean` and `hasTable(markdown: string): boolean`.

These are used by:

- `BlockIncompleteContext` (Task 9) — to gate expensive renders during streaming
- The parser/model layer — to decide block boundaries during streaming
- Future `packages/remend` — to determine streaming status

**Step: Verify + commit**

```bash
vp check
```

```bash
git add packages/core/src/lib/incomplete-code-utils.ts
git commit -m "feat: add incomplete code fence and table detection utilities"
```

---

### Task 4: Table data conversion utilities

**Files:**

- Create: `packages/core/src/render/table/utils.ts`

**Reference:** `docs/references/streamdown/packages/streamdown/lib/table/utils.ts`

Port **the entire file** verbatim — pure TypeScript, no framework deps. This includes:

- `TableData` interface (`{ headers: string[]; rows: string[][] }`)
- `extractTableDataFromElement(tableElement: HTMLElement): TableData` — **KEEP THIS**. It reads table data from the DOM. The copy/download dropdowns (Tasks 8, 9) depend on it to find their table via `closest('[data-velomark="table-wrapper"]').querySelector("table")`.
- `tableDataToCSV(data: TableData): string`
- `tableDataToTSV(data: TableData): string`
- `tableDataToMarkdown(data: TableData): string`
- `escapeMarkdownTableCell(cell: string): string`

**Step: Verify + commit**

```bash
vp check
```

```bash
git add packages/core/src/render/table/utils.ts
git commit -m "feat(table): add CSV/TSV/markdown conversion + DOM extraction utilities"
```

---

## Phase 2: Components (depend on Phase 1)

### Task 5: Code block download button

**Files:**

- Create: `packages/core/src/render/code-block/download-button.tsx`
- Modify: `packages/core/src/render/code-block/index.tsx` (wire into actions pill)
- Modify: `packages/core/src/types.ts` (add `downloadButton` to interface)

**Reference:** `docs/references/streamdown/packages/streamdown/lib/code-block/download-button.tsx`

**Dependencies:** Task 2a (`save()` from `../../lib/utils`)

**Key differences from streamdown:**

- Use `DownloadIcon` from `../icons` (already exists)
- Use `save()` from `../../lib/utils` instead of `../utils`
- Use `cn` from `cnfast` directly
- Hardcode title="Download"
- No `onDownload`/`onError` callbacks (simplification — add later if needed)
- No `isAnimating` / `StreamdownContext`
- No `useCodeBlockContext()` — accept `code` prop directly (context wired in Task 7)

**languageExtensionMap:** Copy the **full 320-entry map** from the streamdown reference at `docs/references/streamdown/packages/streamdown/lib/code-block/download-button.tsx:14-321`. Do NOT truncate it.

**Step 1: Create download-button.tsx**

```tsx
import { type Component } from "solid-js";
import { cn } from "cnfast";
import { save } from "../../lib/utils";
import { DownloadIcon } from "../icons";

// Copy the full 320-entry map from streamdown reference:
// docs/references/streamdown/packages/streamdown/lib/code-block/download-button.tsx:14-321
const languageExtensionMap: Record<string, string> = {
  // ... 320 entries copied verbatim ...
};

export const CodeBlockDownloadButton: Component<{
  code: string;
  language?: string;
  class?: string;
}> = (props) => {
  const extension = () =>
    props.language && props.language in languageExtensionMap
      ? languageExtensionMap[props.language]
      : "txt";
  const filename = () => `file.${extension()}`;

  const handleDownload = (): void => {
    save(filename(), props.code, "text/plain");
  };

  return (
    <button
      class={cn(
        "vm-code-download cursor-pointer p-1 text-muted-foreground transition-all hover:text-foreground",
        props.class,
      )}
      onClick={handleDownload}
      title="Download"
      type="button"
    >
      <DownloadIcon size={14} />
    </button>
  );
};
```

**Step 2: Add `downloadButton` to `VelomarkCodeBlockOptions`**

In `packages/core/src/types.ts` (line ~138):

```ts
export interface VelomarkCodeBlockOptions {
  copyButton?: boolean;
  downloadButton?: boolean; // ADD THIS
  defaultView?: "preview" | "source";
  highlight?: boolean;
  highlightTheme?: string;
  languageLabel?: boolean;
  previewToggle?: boolean;
}
```

In `packages/core/src/render/code-block/index.tsx`, update `DEFAULT_CODE_BLOCK_OPTIONS`:

```ts
export const DEFAULT_CODE_BLOCK_OPTIONS: Required<VelomarkCodeBlockOptions> = {
  copyButton: true,
  downloadButton: true, // ADD THIS
  defaultView: "preview",
  highlight: true,
  highlightTheme: "github-dark",
  languageLabel: true,
  previewToggle: true,
};
```

**Step 3: Wire into actions pill in code-block/index.tsx**

Add import + re-export:

```tsx
import { CodeBlockDownloadButton } from "./download-button";
export { CodeBlockDownloadButton } from "./download-button";
```

Add `downloadButton` to `splitProps` and render inside the existing actions pill (lines 72-86 of current index.tsx), after the copy button:

```tsx
<Show when={local.copyButton}>
  <CodeBlockCopyButton code={local.code} />
</Show>
<Show when={local.downloadButton}>
  <CodeBlockDownloadButton code={local.code} language={local.language} />
</Show>
```

Also add `"downloadButton"` to the `splitProps` keys array.

**Step 4: Verify + commit**

```bash
vp check && vp run --filter ./packages/core test
```

```bash
git add packages/core/src/render/code-block/download-button.tsx packages/core/src/render/code-block/index.tsx packages/core/src/types.ts
git commit -m "feat(code-block): add download button"
```

---

### Task 6: Code block skeleton

**Files:**

- Create: `packages/core/src/render/code-block/skeleton.tsx`
- Modify: `packages/core/src/render/code-block/index.tsx` (re-export)

**Reference:** `docs/references/streamdown/packages/streamdown/lib/code-block/skeleton.tsx`

**Dependencies:** Task 1 (`Loader2Icon` with `class` prop)

**Step 1: Create skeleton.tsx**

```tsx
import type { Component } from "solid-js";
import { cn } from "cnfast";
import { Loader2Icon } from "../icons";

export const CodeBlockSkeleton: Component = () => (
  <div class={cn("w-full divide-y divide-border overflow-hidden rounded-xl border border-border")}>
    <div class={cn("h-[46px] w-full bg-muted/80")} />
    <div class={cn("flex w-full items-center justify-center p-4")}>
      <Loader2Icon class={cn("size-4 animate-spin")} size={16} />
    </div>
  </div>
);
```

**Step 2: Re-export in index.tsx**

```tsx
export { CodeBlockSkeleton } from "./skeleton";
```

**Step 3: Verify + commit**

```bash
vp check && vp run --filter ./packages/core test
```

```bash
git add packages/core/src/render/code-block/skeleton.tsx packages/core/src/render/code-block/index.tsx
git commit -m "feat(code-block): add skeleton loading state"
```

---

### Task 7: Code block context

**Files:**

- Create: `packages/core/src/render/code-block/context.ts`

**Reference:** `docs/references/streamdown/packages/streamdown/lib/code-block/context.tsx`

**Key detail:** Streamdown's context carries `{ code: string }` ONLY — no `language`. The download button gets language from a separate prop, not context. Match this exactly.

**Step 1: Create context.ts**

```ts
import { createContext, useContext } from "solid-js";

interface CodeBlockContextType {
  code: string;
}

export const CodeBlockContext = createContext<CodeBlockContextType>({ code: "" });

export const useCodeBlockContext = () => useContext(CodeBlockContext);
```

**Step 2: Wire into code-block/index.tsx**

Import and wrap children in provider:

```tsx
import { CodeBlockContext } from "./context";
```

In the CodeBlock component, wrap the rendered content:

```tsx
<CodeBlockContext.Provider value={{ code: local.code }}>
  {/* existing children */}
</CodeBlockContext.Provider>
```

**Step 3: Make `code` prop optional on copy/download buttons**

Update `CodeBlockCopyButton` and `CodeBlockDownloadButton` to fall back to context when `code` prop is omitted:

```tsx
import { useCodeBlockContext } from "./context";
// ...
const context = useCodeBlockContext();
const code = () => props.code ?? context.code;
```

Use `code()` instead of `props.code` throughout. Keep `code` optional in props type: `code?: string`. This preserves backward compatibility for callers that pass `code` explicitly.

**Step 4: Verify + commit**

```bash
vp check && vp run --filter ./packages/core test
```

```bash
git add packages/core/src/render/code-block/context.ts packages/core/src/render/code-block/index.tsx packages/core/src/render/code-block/copy-button.tsx packages/core/src/render/code-block/download-button.tsx
git commit -m "feat(code-block): add CodeBlockContext"
```

---

### Task 8: Add table-wrapper attribute to Table component

**Files:**

- Modify: `packages/core/src/render/table/index.tsx`

**Why:** Streamdown's copy/download dropdowns and fullscreen button find their parent table via `dropdownRef.closest('[data-streamdown="table-wrapper"]').querySelector("table")`. Velomark's Table component needs the equivalent `data-velomark="table-wrapper"` on its outer wrapper div so the dropdowns (Tasks 9, 10) can locate the `<table>` element.

**Step 1: Add attribute to outer wrapper**

In `packages/core/src/render/table/index.tsx`, the outer `<div>` (line ~28) currently has `class={cn("vm-table my-4 flex flex-col gap-2 rounded-lg border border-border bg-sidebar p-2")}`. Add the data attribute:

```tsx
<div
  class={cn("vm-table my-4 flex flex-col gap-2 rounded-lg border border-border bg-sidebar p-2")}
  data-velomark="table-wrapper"
>
```

**Step 2: Verify + commit**

```bash
vp check && vp run --filter ./packages/core test
```

```bash
git add packages/core/src/render/table/index.tsx
git commit -m "feat(table): add data-velomark table-wrapper attribute"
```

---

## Phase 3: Dropdowns + modals (depend on Phases 1+2)

### Task 9: Table copy dropdown

**Files:**

- Create: `packages/core/src/render/table/copy-dropdown.tsx`
- Modify: `packages/core/src/render/table/index.tsx` (wire into header)

**Reference:** `docs/references/streamdown/packages/streamdown/lib/table/copy-dropdown.tsx`

**Dependencies:** Task 4 (table utils), Task 8 (table-wrapper attribute)

**How it finds the table:** Uses `dropdownRef.closest('[data-velomark="table-wrapper"]').querySelector("table")` to locate the `<table>` element, then calls `extractTableDataFromElement()`.

**Translation strings (hardcoded):**

- Title: `"Copy table"`
- Options: `"Markdown"`, `"CSV"`, `"TSV"`

**Solid patterns for dropdown behavior:**

- `createSignal` for `isOpen` and `isCopied`
- `let dropdownRef: HTMLDivElement | undefined` for the ref
- `onMount` + `onCleanup` for click-outside listener (replaces React `useEffect`)
- `onCleanup` for the copied-reset timeout
- Uses `event.composedPath().includes(dropdownRef)` for Shadow DOM compatibility

**Step 1: Create copy-dropdown.tsx**

```tsx
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
  let dropdownRef: HTMLDivElement | undefined;
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  const copyTableData = async (format: "csv" | "tsv" | "md"): Promise<void> => {
    if (!dropdownRef) return;
    const tableWrapper = dropdownRef.closest('[data-velomark="table-wrapper"]');
    const tableElement = tableWrapper?.querySelector("table") as HTMLTableElement | null;
    if (!tableElement) return;

    const tableData = extractTableDataFromElement(tableElement);
    const formatters = {
      csv: tableDataToCSV,
      tsv: tableDataToTSV,
      md: tableDataToMarkdown,
    };
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
```

**Step 2: Wire into table/index.tsx**

Add import and render dropdowns in a header bar ABOVE the scroll container (inside the outer `vm-table` div, before the scroll div):

```tsx
import { TableCopyDropdown } from "./copy-dropdown";
```

```tsx
<div class={cn("flex justify-end gap-1")} data-velomark="table-actions">
  <TableCopyDropdown />
</div>
```

**Step 3: Verify + commit**

```bash
vp check && vp run --filter ./packages/core test
```

```bash
git add packages/core/src/render/table/copy-dropdown.tsx packages/core/src/render/table/index.tsx
git commit -m "feat(table): add copy dropdown (CSV/TSV/Markdown)"
```

---

### Task 10: Table download dropdown

**Files:**

- Create: `packages/core/src/render/table/download-dropdown.tsx`
- Modify: `packages/core/src/render/table/index.tsx` (wire into header)

**Reference:** `docs/references/streamdown/packages/streamdown/lib/table/download-dropdown.tsx`

**Dependencies:** Task 2a (`save()`), Task 4 (table utils), Task 8 (table-wrapper attribute)

**Translation strings (hardcoded):**

- Title: `"Download table"`
- Options: `"CSV"`, `"Markdown"`

**Key detail:** Streamdown's download dropdown only offers CSV and Markdown (NOT TSV — unlike copy). Match this exactly.

**Step 1: Create download-dropdown.tsx**

Same dropdown pattern as Task 9 (copy-dropdown). Uses `save()` from `../../lib/utils`, `extractTableDataFromElement` + `tableDataToCSV` + `tableDataToMarkdown` from `./utils`, `DownloadIcon` from `../icons`.

Filename: `table.${extension}` where extension is `"csv"` or `"md"`.
MIME type: `"text/csv"` or `"text/markdown"`.

**Step 2: Wire into table/index.tsx**

Add `<TableDownloadDropdown />` next to `<TableCopyDropdown />` in the actions header.

**Step 3: Verify + commit**

```bash
vp check && vp run --filter ./packages/core test
```

```bash
git add packages/core/src/render/table/download-dropdown.tsx packages/core/src/render/table/index.tsx
git commit -m "feat(table): add download dropdown (CSV/Markdown)"
```

---

### Task 11: Table fullscreen button

**Files:**

- Create: `packages/core/src/render/table/fullscreen-button.tsx`
- Modify: `packages/core/src/render/table/index.tsx` (wire into header)

**Reference:** `docs/references/streamdown/packages/streamdown/lib/table/fullscreen-button.tsx`

**Dependencies:** Task 2b (scroll-lock), Task 9 (copy dropdown), Task 10 (download dropdown)

**CRITICAL: This is NOT the Fullscreen API.** Streamdown renders a **custom fullscreen modal overlay via portal** — a `fixed inset-0 z-50` div rendered into `document.body`. Velomark uses `<Portal>` from `solid-js/web` (not `createPortal` from `react-dom`).

**How it works:**

1. Click button → `isFullscreen = true`
2. `<Portal mount={document.body}>` renders a fixed overlay covering the screen
3. The overlay contains: action bar (copy dropdown, download dropdown, close button) + scrollable table container
4. The children (table `<thead>`/`<tbody>`) are passed through and rendered inside a `<table>` in the portal
5. `lockBodyScroll()` on open, `unlockBodyScroll()` on close (via `onCleanup`)
6. ESC key closes (via `onMount` keydown listener + `onCleanup`)

**Translation strings (hardcoded):**

- Open title: `"View fullscreen"`
- Close title: `"Exit fullscreen"`

**Step 1: Create fullscreen-button.tsx**

```tsx
import {
  type Component,
  type JSX,
  createEffect,
  createSignal,
  onCleanup,
  onMount,
  Show,
} from "solid-js";
import { Portal } from "solid-js/web";
import { cn } from "cnfast";
import { lockBodyScroll, unlockBodyScroll } from "../../lib/scroll-lock";
import { Maximize2Icon, XIcon } from "../icons";
import { TableCopyDropdown } from "./copy-dropdown";
import { TableDownloadDropdown } from "./download-dropdown";

export const TableFullscreenButton: Component<{
  children: JSX.Element;
  showCopy?: boolean;
  showDownload?: boolean;
  class?: string;
}> = (props) => {
  const [isFullscreen, setIsFullscreen] = createSignal(false);
  const showCopy = () => props.showCopy ?? true;
  const showDownload = () => props.showDownload ?? true;

  const handleClose = () => setIsFullscreen(false);

  onMount(() => {
    const handleEsc = (e: KeyboardEvent): void => {
      if (e.key === "Escape") setIsFullscreen(false);
    };
    document.addEventListener("keydown", handleEsc);
    onCleanup(() => document.removeEventListener("keydown", handleEsc));
  });

  // Lock/unlock body scroll based on fullscreen state
  let prevFullscreen = false;
  createEffect(() => {
    const fs = isFullscreen();
    if (fs && !prevFullscreen) lockBodyScroll();
    if (!fs && prevFullscreen) unlockBodyScroll();
    prevFullscreen = fs;
  });
  onCleanup(() => {
    if (prevFullscreen) unlockBodyScroll();
  });

  return (
    <>
      <button
        class={cn(
          "cursor-pointer p-1 text-muted-foreground transition-all hover:text-foreground",
          props.class,
        )}
        onClick={() => setIsFullscreen(true)}
        title="View fullscreen"
        type="button"
      >
        <Maximize2Icon size={14} />
      </button>

      <Show when={isFullscreen()}>
        <Portal mount={document.body}>
          <div
            class={cn("fixed inset-0 z-50 flex flex-col bg-background")}
            data-velomark="table-fullscreen"
            onClick={handleClose}
            role="dialog"
            aria-modal="true"
            aria-label="View fullscreen"
          >
            <div
              class={cn("flex h-full flex-col")}
              onClick={(e) => e.stopPropagation()}
              role="presentation"
            >
              <div class={cn("flex items-center justify-end gap-1 p-4")}>
                <Show when={showCopy()}>
                  <TableCopyDropdown />
                </Show>
                <Show when={showDownload()}>
                  <TableDownloadDropdown />
                </Show>
                <button
                  class={cn(
                    "rounded-md p-1 text-muted-foreground transition-all hover:bg-muted hover:text-foreground",
                  )}
                  onClick={handleClose}
                  title="Exit fullscreen"
                  type="button"
                >
                  <XIcon size={20} />
                </button>
              </div>
              <div
                class={cn(
                  "flex-1 overflow-auto p-4 pt-0 [&_thead]:sticky [&_thead]:top-0 [&_thead]:z-10",
                )}
              >
                <table
                  class={cn("w-full border-collapse border border-border")}
                  data-velomark="table"
                >
                  {props.children}
                </table>
              </div>
            </div>
          </div>
        </Portal>
      </Show>
    </>
  );
};
```

**Note:** The `createEffect` import must be added to the solid-js import. Also note the dropdowns inside the fullscreen portal will NOT find a `data-velomark="table-wrapper"` ancestor (they're in a portal). They need the portal's `<table>` to be wrapped in a `data-velomark="table-wrapper"` div. Add that wrapper around the `<table>` inside the portal:

```tsx
<div data-velomark="table-wrapper">
  <table ...>
    {props.children}
  </table>
</div>
```

**Step 2: Wire into table/index.tsx**

The `TableFullscreenButton` needs the table's `<thead>` and `<tbody>` as children. Refactor `table/index.tsx` to extract the header+body into a function/fragment that can be passed to both the normal table and the fullscreen button.

Add `<TableFullscreenButton>` in the actions header next to copy/download dropdowns:

```tsx
<TableFullscreenButton>
  <thead ...>{/* existing header For loop */}</thead>
  <tbody ...>{/* existing body For loop */}</tbody>
</TableFullscreenButton>
```

This requires restructuring the table rendering — the `<thead>` and `<tbody>` are currently inline in the `<table>`. Extract them as a reusable fragment so they can render in both the inline table and the fullscreen portal.

**Step 3: Verify + commit**

```bash
vp check && vp run --filter ./packages/core test
```

```bash
git add packages/core/src/render/table/fullscreen-button.tsx packages/core/src/render/table/index.tsx
git commit -m "feat(table): add fullscreen modal overlay"
```

---

## Phase 4: Contexts, hooks, and link modal

### Task 12: Block incomplete context

**Files:**

- Create: `packages/core/src/lib/block-incomplete-context.ts`
- Modify: `packages/core/src/render/velomark.tsx` (wire provider)

**Reference:** `docs/references/streamdown/packages/streamdown/lib/block-incomplete-context.ts`

**Dependencies:** Task 3 (`hasIncompleteCodeFence`)

**Architectural note:** Streamdown sets this context true when: "streaming is active AND this is the last block AND it has an unclosed code fence." In velomark's model, a block with `status === "streaming"` already captures "this block is being accumulated and may have an unclosed fence." The parser handles fence detection — by the time we see a block at render time, `status` is the authoritative signal.

However, to match streamdown's semantics precisely and to gate expensive renders correctly, we use `hasIncompleteCodeFence()` on the raw markdown as an additional check at the Velomark level. This catches the edge case where the parser hasn't yet finalized a block boundary.

**Step 1: Create block-incomplete-context.ts**

```ts
import { createContext, useContext } from "solid-js";

/**
 * Context that indicates whether the current block has an incomplete code fence.
 * True when: the document is streaming AND this block may have an unclosed code fence.
 */
const BlockIncompleteContext = createContext(false);

export const useIsCodeFenceIncomplete = (): boolean => useContext(BlockIncompleteContext);

export { BlockIncompleteContext };
```

**Step 2: Wire provider in velomark.tsx**

At the `Velomark` component level, compute whether the markdown has an incomplete fence:

```tsx
import { hasIncompleteCodeFence } from "../lib/incomplete-code-utils";
import { BlockIncompleteContext } from "../lib/block-incomplete-context";
```

```tsx
const hasIncomplete = createMemo(() => hasIncompleteCodeFence(props.markdown));
```

In the `<For each={blockIds()}>` loop, wrap each `BlockSlot` with the provider. The context value is `true` when the block is streaming AND the document has an incomplete fence:

```tsx
<For each={blockIds()}>
  {(blockId, index) => (
    <BlockIncompleteContext.Provider
      value={/* TODO: need block status access here */}
    >
      <BlockSlot ... />
    </BlockIncompleteContext.Provider>
  )}
</For>
```

**Challenge:** The block's `status` isn't directly available in the `<For>` loop — it's inside `BlockSlot` via `blockLookup`. Two approaches:

**Approach A (simpler):** Move the provider inside `BlockSlot` where `block()` is accessible:

```tsx
// Inside BlockSlot, after block() memo:
const isIncomplete = createMemo(
  () => block().status === "streaming" && hasIncompleteCodeFence(/* raw markdown */),
);
```

But `BlockSlot` doesn't have `props.markdown`. Pass it down or pass the precomputed `hasIncomplete` boolean.

**Approach B (recommended):** Compute at Velomark level and pass down:

```tsx
// In Velomark:
const docHasIncomplete = createMemo(() => hasIncompleteCodeFence(props.markdown));

// Pass to BlockSlot as prop:
<BlockSlot ... docHasIncomplete={docHasIncomplete()} />

// In BlockSlot, wrap with provider:
<BlockIncompleteContext.Provider value={block().status === "streaming" && props.docHasIncomplete}>
  <RenderBlockView ... />
</BlockIncompleteContext.Provider>
```

Use Approach B.

**Step 3: Use in code-block to show skeleton for incomplete fences**

Inside `CodeBlock` component (or `HighlightedCodeBlockBody`), consume the context:

```tsx
import { useIsCodeFenceIncomplete } from "../../lib/block-incomplete-context";

const isIncomplete = useIsCodeFenceIncomplete();
```

When `isIncomplete` is true and highlighting is enabled, show `<CodeBlockSkeleton>` instead of the highlighted body (the fence is still open, highlighting would be wasted). Add a `<Show>` wrapper:

```tsx
<Show
  when={!isIncomplete && showHighlighted()}
  fallback={
    <Show when={isIncomplete} fallback={<CodeBlockBody code={local.code} language={local.language} />}>
      <CodeBlockSkeleton />
    </Show>
  }
>
  <HighlightedCodeBlockBody ... />
</Show>
```

**Step 4: Verify + commit**

```bash
vp check && vp run --filter ./packages/core test
```

```bash
git add packages/core/src/lib/block-incomplete-context.ts packages/core/src/render/velomark.tsx packages/core/src/render/code-block/index.tsx
git commit -m "feat: add BlockIncompleteContext for streaming code fence gating"
```

---

### Task 13: use-deferred-render hook

**Files:**

- Create: `packages/core/src/lib/hooks/use-deferred-render.ts`

**Reference:** `docs/references/streamdown/packages/streamdown/hooks/use-deferred-render.ts`

**Dependencies:** None

**What it does:** Defers rendering of heavy components (Mermaid, syntax highlighting) until the element enters the viewport, using IntersectionObserver + debounce + requestIdleCallback. Returns `{ shouldRender: Accessor<boolean>, containerRef }`.

**CRITICAL Solid translation notes:**

- React's `useState` → Solid's `createSignal` — return the **accessor**, not the value
- React's `useRef` → plain `let` variable for the ref
- React's `useEffect` with dependency array → Solid's `onMount` (runs once) + `createEffect` for reactive changes
- Return `{ shouldRender, containerRef }` where `shouldRender` is the **accessor function** (not `shouldRender()`)
- The `containerRef` must be assignable — use `let containerRef: HTMLDivElement | undefined` and a `ref={el => containerRef = el}` callback on the element

**Step 1: Create the hook**

```ts
import { type Accessor, createSignal, onCleanup, onMount } from "solid-js";

export const DEFERRED_RENDER_DEBOUNCE_DELAY = 300;
export const DEFERRED_RENDER_ROOT_MARGIN = "300px";
export const DEFERRED_RENDER_IDLE_TIMEOUT = 500;

export interface UseDeferredRenderOptions {
  debounceDelay?: number;
  idleTimeout?: number;
  immediate?: boolean;
  rootMargin?: string;
}

export interface UseDeferredRenderReturn {
  shouldRender: Accessor<boolean>;
  ref: (el: HTMLDivElement) => void;
}

export function useDeferredRender(options: UseDeferredRenderOptions = {}): UseDeferredRenderReturn {
  const {
    immediate = false,
    debounceDelay = DEFERRED_RENDER_DEBOUNCE_DELAY,
    rootMargin = DEFERRED_RENDER_ROOT_MARGIN,
    idleTimeout = DEFERRED_RENDER_IDLE_TIMEOUT,
  } = options;

  const [shouldRender, setShouldRender] = createSignal(false);
  let containerRef: HTMLDivElement | undefined;
  let renderTimeoutId: ReturnType<typeof setTimeout> | undefined;
  let idleCallbackId: number | undefined;

  const ref = (el: HTMLDivElement): void => {
    containerRef = el;
  };

  const requestIdleCallbackWrapper =
    typeof window !== "undefined" && window.requestIdleCallback
      ? (cb: IdleRequestCallback, opts?: IdleRequestOptions) => window.requestIdleCallback(cb, opts)
      : (cb: IdleRequestCallback): number => {
          const start = Date.now();
          return window.setTimeout(() => {
            cb({
              didTimeout: false,
              timeRemaining: () => Math.max(0, 50 - (Date.now() - start)),
            });
          }, 1) as unknown as number;
        };

  const cancelIdleCallbackWrapper =
    typeof window !== "undefined" && window.cancelIdleCallback
      ? (id: number) => window.cancelIdleCallback(id)
      : (id: number) => clearTimeout(id);

  const clearPendingRenders = (): void => {
    if (renderTimeoutId !== undefined) {
      clearTimeout(renderTimeoutId);
      renderTimeoutId = undefined;
    }
    if (idleCallbackId !== undefined) {
      cancelIdleCallbackWrapper(idleCallbackId);
      idleCallbackId = undefined;
    }
  };

  const scheduleRender = (obs: IntersectionObserver): void => {
    idleCallbackId = requestIdleCallbackWrapper(
      (deadline) => {
        if (deadline.timeRemaining() > 0 || deadline.didTimeout) {
          setShouldRender(true);
          obs.disconnect();
        } else {
          idleCallbackId = requestIdleCallbackWrapper(
            () => {
              setShouldRender(true);
              obs.disconnect();
            },
            { timeout: idleTimeout / 2 },
          );
        }
      },
      { timeout: idleTimeout },
    );
  };

  onMount(() => {
    if (immediate) {
      setShouldRender(true);
      return;
    }

    const container = containerRef;
    if (!container) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            clearPendingRenders();
            renderTimeoutId = setTimeout(() => {
              const records = observer.takeRecords();
              const isStillInView =
                records.length === 0 || (records.at(-1)?.isIntersecting ?? false);
              if (isStillInView) {
                scheduleRender(observer);
              }
            }, debounceDelay);
          } else {
            clearPendingRenders();
          }
        }
      },
      { rootMargin, threshold: 0 },
    );

    observer.observe(container);

    onCleanup(() => {
      clearPendingRenders();
      observer.disconnect();
    });
  });

  return { shouldRender, ref };
}
```

**Step 2: Verify + commit**

```bash
vp check
```

```bash
git add packages/core/src/lib/hooks/use-deferred-render.ts
git commit -m "feat: add useDeferredRender hook (IntersectionObserver + requestIdleCallback)"
```

---

### Task 14: use-throttled-debounce hook

**Files:**

- Create: `packages/core/src/lib/hooks/use-throttled-debounce.ts`

**Reference:** `docs/references/streamdown/packages/streamdown/hooks/use-throttled-debouce.ts`

**Dependencies:** None

**CRITICAL Solid translation notes:**

- React's `useEffect` with `[value]` dependency → Solid's `createEffect(() => { ... value() ... })` — the effect auto-tracks `value()` as a reactive read
- React's `useState` → Solid's `createSignal`
- Return the **accessor** `processedValue`, not `processedValue()`
- The input `value` must be an accessor (function), not a plain value — this is how Solid tracks reactivity

**Step 1: Create the hook**

```ts
import { type Accessor, createEffect, createSignal, onCleanup } from "solid-js";

export function useThrottledDebounce<T>(
  value: Accessor<T>,
  throttleMs = 200,
  debounceMs = 50,
): Accessor<T> {
  const [processedValue, setProcessedValue] = createSignal<T>(value());
  let lastRunTime = 0;
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  createEffect(() => {
    const currentValue = value(); // reactive read — effect re-runs when this changes
    const now = Date.now();
    const timeSinceLastRun = now - lastRunTime;

    if (timeoutId !== undefined) {
      clearTimeout(timeoutId);
    }

    if (timeSinceLastRun >= throttleMs) {
      setProcessedValue(currentValue);
      lastRunTime = now;
    } else {
      timeoutId = setTimeout(() => {
        setProcessedValue(currentValue);
        lastRunTime = Date.now();
      }, debounceMs);
    }
  });

  onCleanup(() => {
    if (timeoutId !== undefined) {
      clearTimeout(timeoutId);
    }
  });

  return processedValue;
}
```

**Step 2: Verify + commit**

```bash
vp check
```

```bash
git add packages/core/src/lib/hooks/use-throttled-debounce.ts
git commit -m "feat: add useThrottledDebounce hook"
```

---

### Task 15: Link safety modal

**Files:**

- Create: `packages/core/src/render/compat/link-safety-modal.tsx`
- Modify: `packages/core/src/index.tsx` (export public API)

**Reference:** `docs/references/streamdown/packages/streamdown/lib/link-modal.tsx`

**Dependencies:** Task 1 (`ExternalLinkIcon`), Task 2b (scroll-lock)

**Why in `compat/`:** Streamdown handles link safety via its unified/remark pipeline. Velomark handles links in its own inline parser — this is a velomark-specific alternative, grouped with other compat features.

**Translation strings (hardcoded):**

- `"Open external link"` — modal title
- `"You are about to open an external link. Please verify the URL before continuing."` — warning
- `"Copied"` — copy confirmation
- `"Copy link"` — copy button
- `"Open link"` — confirm button
- `"Close"` — close button title

**Step 1: Create link-safety-modal.tsx**

```tsx
import { type Component, createSignal, onCleanup, onMount, Show } from "solid-js";
import { cn } from "cnfast";
import { lockBodyScroll, unlockBodyScroll } from "../../lib/scroll-lock";
import { CheckIcon, CopyIcon, ExternalLinkIcon, XIcon } from "../icons";

const COPY_RESET_DELAY_MS = 2000;

export interface LinkSafetyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  url: string;
}

export const LinkSafetyModal: Component<LinkSafetyModalProps> = (props) => {
  const [copied, setCopied] = createSignal(false);
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  const handleCopy = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(props.url);
      setCopied(true);
      timeoutId = setTimeout(() => setCopied(false), COPY_RESET_DELAY_MS);
    } catch {
      // Clipboard API not available
    }
  };

  const handleConfirm = (): void => {
    props.onConfirm();
    props.onClose();
  };

  onMount(() => {
    const handleEsc = (e: KeyboardEvent): void => {
      if (e.key === "Escape") props.onClose();
    };

    // Only listen when open
    let prevOpen = props.isOpen;
    if (props.isOpen) {
      lockBodyScroll();
      document.addEventListener("keydown", handleEsc);
    }

    onCleanup(() => {
      if (prevOpen) {
        document.removeEventListener("keydown", handleEsc);
        unlockBodyScroll();
      }
      if (timeoutId !== undefined) clearTimeout(timeoutId);
    });
  });

  return (
    <Show when={props.isOpen}>
      <div
        class={cn(
          "fixed inset-0 z-50 flex items-center justify-center bg-background/50 backdrop-blur-sm",
        )}
        data-velomark="link-safety-modal"
        onClick={() => props.onClose()}
        role="button"
        tabIndex={0}
      >
        <div
          class={cn(
            "relative mx-4 flex w-full max-w-md flex-col gap-4 rounded-xl border bg-background p-6 shadow-lg",
          )}
          onClick={(e) => e.stopPropagation()}
          role="presentation"
        >
          <button
            class={cn(
              "absolute top-4 right-4 rounded-md p-1 text-muted-foreground transition-all hover:bg-muted hover:text-foreground",
            )}
            onClick={() => props.onClose()}
            title="Close"
            type="button"
          >
            <XIcon size={16} />
          </button>

          <div class={cn("flex flex-col gap-2")}>
            <div class={cn("flex items-center gap-2 font-semibold text-lg")}>
              <ExternalLinkIcon size={20} />
              <span>Open external link</span>
            </div>
            <p class={cn("text-muted-foreground text-sm")}>
              You are about to open an external link. Please verify the URL before continuing.
            </p>
          </div>

          <div
            class={cn(
              "break-all rounded-md bg-muted p-3 font-mono text-sm",
              props.url.length > 100 && "max-h-32 overflow-y-auto",
            )}
          >
            {props.url}
          </div>

          <div class={cn("flex gap-2")}>
            <button
              class={cn(
                "flex flex-1 items-center justify-center gap-2 rounded-md border bg-background px-4 py-2 font-medium text-sm transition-all hover:bg-muted",
              )}
              onClick={handleCopy}
              type="button"
            >
              <Show
                when={copied()}
                fallback={
                  <>
                    <CopyIcon size={14} />
                    <span>Copy link</span>
                  </>
                }
              >
                <CheckIcon size={14} />
                <span>Copied</span>
              </Show>
            </button>
            <button
              class={cn(
                "flex flex-1 items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 font-medium text-primary-foreground text-sm transition-all hover:bg-primary/90",
              )}
              onClick={handleConfirm}
              type="button"
            >
              <ExternalLinkIcon size={14} />
              <span>Open link</span>
            </button>
          </div>
        </div>
      </div>
    </Show>
  );
};
```

**Step 2: Export from public API**

In `packages/core/src/index.tsx`, add:

```tsx
export { LinkSafetyModal } from "./render/compat/link-safety-modal";
```

**Step 3: Verify + commit**

```bash
vp check && vp run --filter ./packages/core test
```

```bash
git add packages/core/src/render/compat/link-safety-modal.tsx packages/core/src/index.tsx
git commit -m "feat: add LinkSafetyModal component"
```

---

## Dependency graph + execution order

```
Phase 1 (parallel, no deps):
  Task 1: Icons (Loader2Icon, ExternalLinkIcon, extend IconProps)
  Task 2: Shared utils (save(), scroll-lock, detect-direction)
  Task 3: incomplete-code-utils
  Task 4: Table utils

Phase 2 (depend on Phase 1):
  Task 5: Code download button       ← needs Task 2 (save)
  Task 6: Code skeleton               ← needs Task 1 (Loader2Icon)
  Task 7: Code block context          ← no Phase-1 dep, but groups with 5-6
  Task 8: Table wrapper attribute     ← no Phase-1 dep

Phase 3 (depend on Phases 1+2):
  Task 9: Table copy dropdown         ← needs Task 4 (utils) + Task 8 (wrapper)
  Task 10: Table download dropdown    ← needs Task 2 (save) + Task 4 + Task 8
  Task 11: Table fullscreen           ← needs Task 2 (scroll-lock) + Task 9 + Task 10
  Task 12: Block incomplete context   ← needs Task 3 (hasIncompleteCodeFence)
  Task 13: use-deferred-render        ← no Phase-1 dep (but grouped here)
  Task 14: use-throttled-debounce     ← no Phase-1 dep (but grouped here)
  Task 15: Link safety modal          ← needs Task 1 (ExternalLinkIcon) + Task 2 (scroll-lock)
```

**Recommended execution order:**

1. Tasks 1, 2, 3, 4 (parallel — all independent)
2. Tasks 5, 6, 7, 8 (parallel — depend only on Phase 1)
3. Tasks 9, 10 (sequential — 10 mirrors 9)
4. Task 11 (depends on 9 + 10)
5. Tasks 12, 13, 14, 15 (parallel — independent of each other)

---

## Verification checklist (after all tasks)

- [ ] `vp check` passes
- [ ] `vp run --filter ./packages/core test` — same pass/fail count as before (96 pass / 1 pre-existing fail)
- [ ] No new TypeScript errors
- [ ] All new files have `data-velomark` attributes (not `data-streamdown`)
- [ ] All components use `cn` from `cnfast` (not `clsx`/`twMerge`)
- [ ] All icons imported from `../icons` (not `useIcons()`)
- [ ] No React imports anywhere in new files
- [ ] `packages/core/src/index.tsx` exports `LinkSafetyModal`
