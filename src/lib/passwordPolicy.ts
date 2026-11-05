/** Shared password rules for activation / reset (must match BE validate_password_policy). */

export const PASSWORD_MIN_LENGTH = 8;

export type PasswordRuleId = "minLength" | "uppercase" | "number" | "special";

export type PasswordRule = {
  id: PasswordRuleId;
  label: string;
  test: (password: string) => boolean;
};

export const PASSWORD_RULES: PasswordRule[] = [
  {
    id: "minLength",
    label: `At least ${PASSWORD_MIN_LENGTH} characters`,
    test: (p) => p.length >= PASSWORD_MIN_LENGTH,
  },
  {
    id: "uppercase",
    label: "At least 1 uppercase letter",
    test: (p) => /[A-Z]/.test(p),
  },
  {
    id: "number",
    label: "At least 1 number",
    test: (p) => /[0-9]/.test(p),
  },
  {
    id: "special",
    label: "At least 1 special character",
    test: (p) => /[^A-Za-z0-9]/.test(p),
  },
];

export function evaluatePasswordRules(password: string) {
  return PASSWORD_RULES.map((rule) => ({
    id: rule.id,
    label: rule.label,
    met: rule.test(password),
  }));
}

export function isPasswordPolicyMet(password: string): boolean {
  return PASSWORD_RULES.every((rule) => rule.test(password));
}

export function passwordPolicyError(password: string): string | null {
  const unmet = PASSWORD_RULES.filter((rule) => !rule.test(password)).map((r) => r.label.toLowerCase());
  if (!unmet.length) return null;
  if (unmet.length === 1) return `Password must include ${unmet[0]}.`;
  return `Password must include ${unmet.slice(0, -1).join(", ")} and ${unmet[unmet.length - 1]}.`;
}
