import { cn } from "../../lib/utils";

const API_BASE =
  import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, "") || "/api";

export function resolveAvatarUrl(avatarUrl?: string | null): string | null {
  if (!avatarUrl) return null;
  if (/^https?:\/\//i.test(avatarUrl)) return avatarUrl;
  return `${API_BASE}${avatarUrl.startsWith("/") ? "" : "/"}${avatarUrl}`;
}

export function initialsFromName(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() || "")
    .join("");
}

export function UserAvatar({
  name,
  avatarUrl,
  size = "md",
  className,
  onClick,
  title,
}: {
  name: string;
  avatarUrl?: string | null;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
  onClick?: () => void;
  title?: string;
}) {
  const resolved = resolveAvatarUrl(avatarUrl);
  const sizeClass =
    size === "xl"
      ? "size-[88px] text-[1.35rem]"
      : size === "lg"
        ? "size-10 text-[13px]"
        : size === "sm"
          ? "size-7 text-[10px]"
          : "size-8 text-[11px]";

  const interactive = Boolean(onClick);

  if (resolved) {
    const img = (
      <img
        src={resolved}
        alt={name}
        className={cn(
          "shrink-0 rounded-full object-cover",
          sizeClass,
          interactive && "cursor-pointer ring-offset-2 transition hover:ring-2 hover:ring-primary/40",
          className,
        )}
      />
    );
    if (!onClick) return img;
    return (
      <button type="button" onClick={onClick} title={title || `View ${name}'s photo`} className="rounded-full p-0">
        {img}
      </button>
    );
  }

  const fallback = (
    <div
      className={cn(
        "font-display grid shrink-0 place-items-center rounded-full bg-primary/10 font-bold text-primary",
        sizeClass,
        interactive && "cursor-pointer ring-offset-2 transition hover:ring-2 hover:ring-primary/40",
        className,
      )}
      aria-hidden={!onClick}
    >
      {initialsFromName(name)}
    </div>
  );
  if (!onClick) return fallback;
  return (
    <button type="button" onClick={onClick} title={title || name} className="rounded-full p-0">
      {fallback}
    </button>
  );
}
