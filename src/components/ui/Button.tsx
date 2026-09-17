import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "secondary" | "danger-outline";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: "sm" | "md";
  children: ReactNode;
};

export function Button({
  variant = "primary",
  size = "md",
  className = "",
  children,
  ...rest
}: Props) {
  const classes = [
    "btn",
    variant === "primary" ? "btn-primary" : "",
    variant === "secondary" ? "btn-secondary" : "",
    variant === "danger-outline" ? "btn-danger-outline" : "",
    size === "sm" ? "btn-sm" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button className={classes} type="button" {...rest}>
      {children}
    </button>
  );
}
