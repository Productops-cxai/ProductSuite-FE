import { enterProduct } from "../api/platform";
import type { LoginNextStep, ProductBrief } from "../types";

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
