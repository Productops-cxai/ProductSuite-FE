export function deletionSource(path?: string) {
  const q = new URLSearchParams();
  q.set("source", path || window.location.pathname);
  return `?${q.toString()}`;
}
