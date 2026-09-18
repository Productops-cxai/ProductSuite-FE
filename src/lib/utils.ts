/** Map BE menu routes to FE routes used by the lovable designs. */
export function normalizeMenuRoute(route: string): string {
  if (route === "/platform/overview") return "/platform";
  if (route === "/platform/product-access") return "/platform/access";
  if (route === "/platform/email-logs") return "/platform/email-logs";
  return route;
}

export function titleCaseStatus(status: string): string {
  if (!status) return "";
  return status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
}

export function orgDisplayName(name: string, isInternal?: boolean): string {
  if (isInternal && !/\(internal\)/i.test(name)) {
    return `${name} (internal)`;
  }
  return name;
}
