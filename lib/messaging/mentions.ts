/** Extract @mention handles from plain text (names without spaces). */
export function parseMentionNames(content: string): string[] {
  const names = new Set<string>();
  Array.from(content.matchAll(/@([A-Za-z][\w.-]*)/g)).forEach((m) => {
    if (m[1].toLowerCase() === "ai") return;
    names.add(m[1]);
  });
  return Array.from(names);
}

export function stripAiMention(content: string): string {
  return content.replace(/@AI\b/gi, "").trim();
}
