import { enterProduct } from "../api/platform";
import type { LoginNextStep, ProductBrief } from "../types";

const RETURN_PATH_KEY = "ps_return_to";

/** Only our own app pages: never an absolute or protocol-relative URL. */
function isSafeReturnPath(path: string | null): path is string {
  return (
    !!path &&
    path.startsWith("/") &&
    !path.startsWith("//") &&
    (path.startsWith("/payflow") || path.startsWith("/platform") || path.startsWith("/profile"))
  );
}

/** Remember the page a signed-out user was on, so sign-in can bring them back. */
export function rememberReturnPath(path: string): void {
  try {
    if (isSafeReturnPath(path)) window.sessionStorage.setItem(RETURN_PATH_KEY, path);
  } catch {
    /* storage unavailable: sign-in just goes to the home page */
  }
}

/** The remembered page (read once), or null. */
export function takeReturnPath(): string | null {
  try {
    const path = window.sessionStorage.getItem(RETURN_PATH_KEY);
    window.sessionStorage.removeItem(RETURN_PATH_KEY);
    return isSafeReturnPath(path) ? path : null;
  } catch {
    return null;
  }
}

/** Products that have an in-app shell in this FE phase. */
export function hasProductShell(code: string): boolean {
  const upper = code.toUpperCase();
  return upper === "PAYFLOW" || upper === "INSIGHTIQ";
}

/** In-app home path for a registered product code. */
export function productHome(code: string): string {
  const upper = code.toUpperCase();
  if (upper === "PAYFLOW") return "/payflow";
  if (upper === "INSIGHTIQ") return "/insightiq";
  // No shell yet — stay on launcher (callers must not treat this as a successful enter target).
  return "/products";
}

/** Sync destination from login next_step (no entitlement re-check). */
export function pathForNextStep(
  step: LoginNextStep | null,
  products: ProductBrief[] = [],
): string {
  if (!step || step === "no_access") return "/no-access";
  if (step === "platform_admin") return "/platform";
  if (step === "direct_entry" && products.length === 1 && hasProductShell(products[0].code)) {
    return productHome(products[0].code);
  }
  return "/products";
}

/**
 * Post-auth destination. For single-product (direct_entry), re-validates
 * entitlement via enter before sending the user into the product shell.
 * Products without an in-app shell go to the selection page instead of looping.
 */
export async function resolvePostAuthDestination(
  step: LoginNextStep,
  products: ProductBrief[],
): Promise<string> {
  if (step === "platform_admin") return "/platform";
  if (step === "no_access") return "/no-access";
  if (step === "direct_entry" && products.length === 1 && hasProductShell(products[0].code)) {
    const code = products[0].code;
    await enterProduct(code);
    return productHome(code);
  }
  return "/products";
}
