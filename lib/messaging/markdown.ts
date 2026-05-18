/** Lightweight markdown → HTML for message display (bold, italic, code, links). */
export function renderMessageMarkdown(text: string): string {
  const escaped = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  return escaped
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/`(.+?)`/g, "<code class=\"rounded bg-muted px-1 py-0.5 text-sm\">$1</code>")
    .replace(
      /(https?:\/\/[^\s]+)/g,
      '<a href="$1" class="text-primary underline" target="_blank" rel="noopener noreferrer">$1</a>'
    )
    .replace(/\n/g, "<br />");
}
