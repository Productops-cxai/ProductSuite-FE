import { enterProduct } from "../api/platform";
import type { LoginNextStep, ProductBrief } from "../types";

/** In-app home path for a registered product code. */
export function productHome(code: string): string {
  const upper = code.toUpperCase();
  if (upper === "PAYFLOW") return "/payflow";
  if (upper === "INSIGHTIQ") return "/insightiq";
  return "/products";
}

/** Sync destination from login next_step (no entitlement re-check). */
export function pathForNextStep(
  step: LoginNextStep | null,
  products: ProductBrief[] = [],
): string {
  if (!step || step === "no_access") return "/no-access";
  if (step === "platform_admin") return "/platform";
  if (step === "direct_entry" && products.length === 1) {
    return productHome(products[0].code);
  }
  return "/products";
}

/**
 * Post-auth destination. For single-product (direct_entry), re-validates
 * entitlement via enter before sending the user into the product shell.
 */
export async function resolvePostAuthDestination(
  step: LoginNextStep,
  products: ProductBrief[],
): Promise<string> {
  if (step === "platform_admin") return "/platform";
  if (step === "no_access") return "/no-access";
  if (step === "direct_entry" && products.length === 1) {
    const code = products[0].code;
    await enterProduct(code);
    return productHome(code);
  }
  return "/products";
}
