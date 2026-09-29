import { useMemo, useState } from "react";
import { SearchInput } from "../payflow-ui";
import type { PayflowClient } from "../../types";

export function ClientAssignmentPicker({
  clients,
  selectedIds,
  onToggle,
  roleName,
}: {
  clients: PayflowClient[];
  selectedIds: number[];
  onToggle: (clientId: number) => void;
  roleName?: string;
}) {
  const [query, setQuery] = useState("");
  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return clients;
    return clients.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.category || "").toLowerCase().includes(q) ||
        c.code.toLowerCase().includes(q),
    );
  }, [clients, query]);

  const who = roleName ? `The ${roleName.toLowerCase()}` : "The user";

  return (
    <div>
      <SearchInput value={query} onChange={setQuery} placeholder="Search clients" />
      <div className="mt-2 max-h-[190px] divide-y divide-slate-100 overflow-y-auto rounded-lg border border-slate-200 bg-white dark:divide-slate-800 dark:border-slate-700 dark:bg-slate-900">
        {matches.length === 0 ? (
          <p className="px-3 py-3 text-[12px] text-slate-500">No clients match.</p>
        ) : (
          matches.map((c) => (
            <label
              key={c.id}
              className="flex cursor-pointer items-center gap-2.5 px-3 py-2.5"
            >
              <input
                type="checkbox"
                checked={selectedIds.includes(c.id)}
                onChange={() => onToggle(c.id)}
                className="size-3.5 accent-primary"
              />
              <span className="text-[13px] text-slate-800 dark:text-slate-100">{c.name}</span>
              <span className="ml-auto text-[11px] text-slate-400">{c.category || ""}</span>
            </label>
          ))
        )}
      </div>
      <p className="mt-1.5 text-[11px] text-slate-500">
        {who} can only access information belonging to assigned clients.
      </p>
    </div>
  );
}
