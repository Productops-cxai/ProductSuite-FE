import { cn } from "../../lib/utils";
import type { PayflowPermissionGroup } from "../../types";

/** Grouped permission checkboxes — pages and actions a role may use. */
export function PermissionPicker({
  groups,
  selected,
  onToggle,
  disabled,
}: {
  groups: PayflowPermissionGroup[];
  selected: string[];
  onToggle: (permissionCode: string) => void;
  disabled?: boolean;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {groups.map((group) => (
        <div
          key={group.group_key}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 dark:border-slate-700 dark:bg-slate-900"
        >
          <p className="text-[10px] font-semibold tracking-[0.08em] text-slate-500 uppercase">
            {group.group_label}
          </p>
          <div className="mt-1.5 space-y-0.5">
            {group.permissions.map((perm) => (
              <label
                key={perm.code}
                className={cn(
                  "flex items-center gap-2.5 py-1",
                  disabled ? "cursor-default opacity-70" : "cursor-pointer",
                )}
              >
                <input
                  type="checkbox"
                  checked={selected.includes(perm.code)}
                  disabled={disabled}
                  onChange={() => onToggle(perm.code)}
                  className="size-3.5 accent-primary"
                />
                <span className="text-[12px] text-slate-800 dark:text-slate-200">{perm.name}</span>
              </label>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
