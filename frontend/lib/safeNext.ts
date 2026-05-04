// Sanitises a `next` redirect param to a same-origin path.
// Rejects anything that doesn't start with a single "/" — protocol-relative
// "//evil.com" and absolute URLs like "https://evil.com" both fall back to "/".
export function safeNext(raw: string | null | undefined): string {
  if (!raw) return "/";
  if (!raw.startsWith("/")) return "/";
  if (raw.startsWith("//") || raw.startsWith("/\\")) return "/";
  return raw;
}
