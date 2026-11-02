/**
 * Read a one-time token from ?token=… then strip it from the address bar
 * so it does not linger in history / Referer / screenshots.
 */
export function takeQueryToken(searchParams: URLSearchParams): string {
  const token = searchParams.get("token") || "";
  if (!token || typeof window === "undefined") return token;
  try {
    const url = new URL(window.location.href);
    if (url.searchParams.has("token")) {
      url.searchParams.delete("token");
      const next = `${url.pathname}${url.search}${url.hash}`;
      window.history.replaceState(window.history.state, "", next);
    }
  } catch {
    /* ignore */
  }
  return token;
}
