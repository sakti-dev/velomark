export function hasIncompleteCodeFence(markdown: string): boolean {
  const lines = markdown.split("\n");
  let fenceOpen = false;

  for (const line of lines) {
    if (line.startsWith("```")) {
      fenceOpen = !fenceOpen;
    }
  }

  return fenceOpen;
}

export function hasTable(markdown: string): boolean {
  return /^|.*|$/m.test(markdown);
}
