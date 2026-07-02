export interface VelomarkTranslations {
  close: string;
  copied: string;
  copyCode: string;
  copyLink: string;
  copyTable: string;
  copyTableAsCsv: string;
  copyTableAsMarkdown: string;
  copyTableAsTsv: string;
  diagramError: string;
  downloadDiagram: string;
  downloadDiagramAsMmd: string;
  downloadDiagramAsPng: string;
  downloadDiagramAsSvg: string;
  downloadFile: string;
  downloadImage: string;
  downloadTable: string;
  downloadTableAsCsv: string;
  downloadTableAsMarkdown: string;
  exitFullscreen: string;
  externalLinkWarning: string;
  imageNotAvailable: string;
  loadingDiagram: string;
  mermaidFormatMmd: string;
  mermaidFormatPng: string;
  mermaidFormatSvg: string;
  openExternalLink: string;
  openLink: string;
  retry: string;
  showCode: string;
  tableFormatCsv: string;
  tableFormatMarkdown: string;
  tableFormatTsv: string;
  viewFullscreen: string;
  zoomIn: string;
  zoomOut: string;
  zoomReset: string;
}

export const defaultTranslations: VelomarkTranslations = {
  close: "Close",
  copied: "Copied",
  copyCode: "Copy code",
  copyLink: "Copy link",
  copyTable: "Copy table",
  copyTableAsCsv: "Copy table as CSV",
  copyTableAsMarkdown: "Copy table as Markdown",
  copyTableAsTsv: "Copy table as TSV",
  diagramError: "Diagram error",
  downloadDiagram: "Download diagram",
  downloadDiagramAsMmd: "Download diagram as MMD",
  downloadDiagramAsPng: "Download diagram as PNG",
  downloadDiagramAsSvg: "Download diagram as SVG",
  downloadFile: "Download file",
  downloadImage: "Download image",
  downloadTable: "Download table",
  downloadTableAsCsv: "Download table as CSV",
  downloadTableAsMarkdown: "Download table as Markdown",
  exitFullscreen: "Exit fullscreen",
  externalLinkWarning:
    "You are about to open an external link. Please verify the URL before continuing.",
  imageNotAvailable: "Image not available",
  loadingDiagram: "Loading diagram...",
  mermaidFormatMmd: "MMD",
  mermaidFormatPng: "PNG",
  mermaidFormatSvg: "SVG",
  openExternalLink: "Open external link",
  openLink: "Open link",
  retry: "Retry",
  showCode: "Show Code",
  tableFormatCsv: "CSV",
  tableFormatMarkdown: "Markdown",
  tableFormatTsv: "TSV",
  viewFullscreen: "View fullscreen",
  zoomIn: "Zoom in",
  zoomOut: "Zoom out",
  zoomReset: "Reset zoom and pan",
};

export function resolveTranslations(
  overrides?: Partial<VelomarkTranslations>,
): VelomarkTranslations {
  return { ...defaultTranslations, ...overrides };
}
