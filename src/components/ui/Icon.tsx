import type { ReactNode } from "react";

type Props = {
  name: string;
  className?: string;
};

const paths: Record<string, ReactNode> = {
  overview: (
    <>
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </>
  ),
  products: (
    <>
      <path d="M12 3 4 7.5v9L12 21l8-4.5v-9L12 3Z" />
      <path d="M12 12 4 7.5M12 12l8-4.5M12 12v9" />
    </>
  ),
  access: (
    <>
      <path d="M12 3 5 6v5c0 4.2 2.9 7.9 7 9 4.1-1.1 7-4.8 7-9V6l-7-3Z" />
      <path d="m9.5 12 1.8 1.8 3.7-3.8" />
    </>
  ),
  people: (
    <>
      <circle cx="9" cy="8" r="3" />
      <path d="M3.5 19a5.5 5.5 0 0 1 11 0" />
      <circle cx="17" cy="9" r="2.5" />
      <path d="M16 19a4.5 4.5 0 0 1 4.5-4" />
    </>
  ),
  billing: (
    <>
      <path d="M7 4h10a2 2 0 0 1 2 2v14l-3-2-3 2-3-2-3 2V6a2 2 0 0 1 2-2Z" />
      <path d="M9 10h6M9 14h4" />
    </>
  ),
  mail: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m3 7 9 7 9-7" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="6" />
      <path d="m20 20-3.5-3.5" />
    </>
  ),
};

const alias: Record<string, string> = {
  "layout-dashboard": "overview",
  box: "products",
  key: "access",
  shield: "access",
  users: "people",
  document: "billing",
  product_access: "access",
  product: "products",
  email_logs: "mail",
  mail: "mail",
};

export function Icon({ name, className = "size-4 shrink-0" }: Props) {
  const key = alias[name] || name;
  const content = paths[key] || paths.overview;
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {content}
    </svg>
  );
}
