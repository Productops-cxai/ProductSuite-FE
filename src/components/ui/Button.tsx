import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "secondary" | "danger-outline";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: "sm" | "md";
  children: ReactNode;
};

const base =
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg border border-transparent font-semibold transition disabled:cursor-not-allowed disabled:opacity-55";

const variants: Record<Variant, string> = {
  primary: "bg-primary text-white hover:bg-primary-hover",
  secondary: "border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
  "danger-outline": "border-red-200 bg-white text-red-600 hover:bg-red-50",
};

const sizes = {
  md: "px-3.5 py-2 text-[0.9rem]",
  sm: "px-2.5 py-1.5 text-[0.82rem]",
};

export function Button({
  variant = "primary",
  size = "md",
  className = "",
  children,
  ...rest
}: Props) {
  return (
    <button type="button" className={`${base} ${variants[variant]} ${sizes[size]} ${className}`} {...rest}>
      {children}
    </button>
  );
}
