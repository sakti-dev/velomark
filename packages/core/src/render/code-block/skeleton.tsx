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
