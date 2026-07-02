import { type Component, Show, createSignal } from "solid-js";
import { cn } from "cnfast";

import { useVelomark } from "../lib/velomark-context";

const fileExtensionPattern = /\.[^/.]+$/;

const triggerDownload = (filename: string, blob: Blob): void => {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
};

export interface ImageComponentProps {
  alt?: string;
  class?: string;
  src?: string;
  title?: string;
}

/**
 * Streamdown-aligned image: wrapped in a `group relative` container with a
 * hover overlay and a download button (shown once the image has loaded).
 */
export const ImageComponent: Component<ImageComponentProps> = (props) => {
  const vm = useVelomark();
  const [imageLoaded, setImageLoaded] = createSignal(false);
  const [imageError, setImageError] = createSignal(false);

  const showDownload = () => imageLoaded() && !imageError();

  const handleRef = (img: HTMLImageElement) => {
    // Catch images already complete before the load/error handlers fire
    // (e.g. cached or SSR-hydrated).
    if (img.complete) {
      const loaded = img.naturalWidth > 0;
      setImageLoaded(loaded);
      setImageError(!loaded);
    }
  };

  const downloadImage = async (): Promise<void> => {
    if (!props.src) {
      return;
    }

    try {
      const response = await fetch(props.src);
      const blob = await response.blob();

      const urlPath = new URL(props.src, window.location.origin).pathname;
      const originalFilename = urlPath.split("/").pop() || "";
      const extension = originalFilename.split(".").pop();
      const hasExtension =
        originalFilename.includes(".") && extension !== undefined && extension.length <= 4;

      let filename = "";

      if (hasExtension) {
        filename = originalFilename;
      } else {
        const mimeType = blob.type;
        let fileExtension = "png";

        if (mimeType.includes("jpeg") || mimeType.includes("jpg")) {
          fileExtension = "jpg";
        } else if (mimeType.includes("png")) {
          fileExtension = "png";
        } else if (mimeType.includes("svg")) {
          fileExtension = "svg";
        } else if (mimeType.includes("gif")) {
          fileExtension = "gif";
        } else if (mimeType.includes("webp")) {
          fileExtension = "webp";
        }

        const baseName = props.alt || originalFilename || "image";
        filename = `${baseName.replace(fileExtensionPattern, "")}.${fileExtension}`;
      }

      triggerDownload(filename, blob);
    } catch {
      // CORS fallback: open the image in a new tab for manual save.
      window.open(props.src, "_blank");
    }
  };

  return (
    <Show when={props.src}>
      <div class={cn("vm-image group relative my-4 inline-block")} data-velomark="image-wrapper">
        <img
          ref={handleRef}
          alt={props.alt}
          class={cn("max-w-full rounded-lg", imageError() && "hidden", props.class)}
          loading="lazy"
          src={props.src}
          title={props.title}
          onError={() => {
            setImageLoaded(false);
            setImageError(true);
          }}
          onLoad={() => {
            setImageLoaded(true);
            setImageError(false);
          }}
        />
        <Show when={imageError()}>
          <span class={cn("text-muted-foreground text-xs italic")} data-velomark="image-fallback">
            {props.alt ? `[${props.alt}]` : "[image]"}
          </span>
        </Show>
        <div
          class={cn(
            "pointer-events-none absolute inset-0 hidden rounded-lg bg-black/10 group-hover:block",
          )}
        />
        <Show when={showDownload()}>
          <button
            class={cn(
              "vm-image-download absolute right-2 bottom-2 flex h-8 w-8 cursor-pointer items-center justify-center rounded-md border border-border bg-background/90 shadow-sm backdrop-blur-sm transition-all duration-200 hover:bg-background opacity-0 group-hover:opacity-100",
            )}
            title={vm.t.downloadImage}
            type="button"
            onClick={() => downloadImage()}
          >
            <vm.icons.DownloadIcon size={14} />
          </button>
        </Show>
      </div>
    </Show>
  );
};
