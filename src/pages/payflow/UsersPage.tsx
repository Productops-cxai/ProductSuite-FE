import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  createPayflowRole,
  createPayflowUser,
  deletePayflowRole,
  listPayflowPermissions,
  listPayflowRoles,
  listPayflowUsers,
  updatePayflowRole,
} from "../../api/payflow";
import { PermissionPicker } from "../../components/payflow/PermissionPicker";
import {
  Btn,
  DataTable,
  EmptyState,
  Field,
  FilterSelect,
  KpiCard,
  PageHeader,
  Panel,
  PrimaryCell,
  SearchInput,
  SelectInput,
  StatusPill,
  Td,
  TextInput,
  Tr,
} from "../../components/payflow-ui";
import { usePayFlowAccess } from "../../context/PayFlowAccessContext";
import type {
  PayflowPermissionGroup,
  PayflowRoleListItem,
  PayflowUser,
} from "../../types";

function roleTone(scope: string) {
  return scope === "platform_wide" ? "info" : "neutral";
}

function statusTone(status: string) {
  if (status === "active") return "success" as const;
  if (status === "invited") return "warning" as const;
  return "neutral" as const;
}

function scopeLabel(scope: string) {
  return scope === "platform_wide" ? "Platform-wide" : "Client-scoped";
}

const SUPERVISOR_DEFAULT_CODES = [
  "view_client",
  "view_customer_accounts",
  "view_collection_cases",
  "view_workflows",
  "view_communications",
  "view_human_reviews",
  "approve_human_reviews",
  "view_rules",
  "view_analytics",
];

export function PayFlowUsersPage() {
  const { isOperationsAdmin } = usePayFlowAccess();
  const navigate = useNavigate();
  const [users, setUsers] = useState<PayflowUser[]>([]);
  const [roles, setRoles] = useState<PayflowRoleListItem[]>([]);
  const [summary, setSummary] = useState({
    total_users: 0,
    roles: 0,
    platform_wide_access: 0,
    client_scoped_users: 0,
    active_users: 0,
  });
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("All Roles");
  const [statusFilter, setStatusFilter] = useState("All Statuses");
  const [adding, setAdding] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    setError(null);
    const matchedRole = roles.find((r) => r.name === roleFilter);
    const role_code = roleFilter === "All Roles" ? undefined : matchedRole?.code;
    const status =
      statusFilter === "All Statuses"
        ? undefined
        : statusFilter === "Invitation Pending"
          ? "invited"
          : statusFilter === "Active"
            ? "active"
            : statusFilter === "Inactive"
              ? "disabled"
              : undefined;

    Promise.all([
      listPayflowUsers({ search: query || undefined, role_code, status }),
      listPayflowRoles(),
    ])
      .then(([usersRes, rolesRes]) => {
        setUsers(usersRes.users);
        setSummary(usersRes.summary);
        setRoles(rolesRes.roles);
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Failed to load users");
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!isOperationsAdmin) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOperationsAdmin, roleFilter, statusFilter]);

  useEffect(() => {
    if (!isOperationsAdmin) return;
    const t = window.setTimeout(() => load(), 250);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  if (!isOperationsAdmin) {
    return (
      <>
        <PageHeader
          title="Users & Permissions"
          description="Manage PayFlow users, Client assignments and operational access."
        />
        <Panel title="Administrator access required">
          <p className="text-sm text-slate-500">
            Only an Operations Admin can manage users, client assignments and permissions.
          </p>
        </Panel>
      </>
    );
  }

  const roleFilterOptions = ["All Roles", ...roles.map((r) => r.name)];

  return (
    <>
      <PageHeader
        title="Users & Permissions"
        description="Manage PayFlow users, roles and operational access. Client assignment is done from Clients."
        actions={
          <Btn variant="primary" onClick={() => setAdding((v) => !v)}>
            {adding ? "Close" : "+ Add User"}
          </Btn>
        }
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <KpiCard label="Total Users" value={String(summary.total_users)} />
        <KpiCard label="Roles" value={String(summary.roles)} />
        <KpiCard label="Platform-wide Access" value={String(summary.platform_wide_access)} />
        <KpiCard label="Client-scoped Users" value={String(summary.client_scoped_users)} />
        <KpiCard label="Active Users" value={String(summary.active_users)} tone="primary" />
      </div>

      {adding ? (
        <div className="mb-5">
          <AddUserForm
            roles={roles}
            onCancel={() => setAdding(false)}
            onCreated={(user) => {
              setAdding(false);
              navigate(`/payflow/users/${user.id}`);
            }}
          />
        </div>
      ) : null}

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <SearchInput
          value={query}
          onChange={setQuery}
          placeholder="Search users"
          className="w-full sm:w-[240px]"
        />
        <FilterSelect
          label="Role"
          value={roleFilter}
          options={roleFilterOptions}
          onChange={setRoleFilter}
        />
        <FilterSelect
          label="Status"
          value={statusFilter}
          options={["All Statuses", "Invitation Pending", "Active", "Inactive"]}
          onChange={setStatusFilter}
        />
      </div>

      {error ? <p className="mb-3 text-sm text-red-600">{error}</p> : null}
      {loading ? (
        <p className="text-sm text-slate-500">Loading users…</p>
      ) : users.length === 0 ? (
        <EmptyState title="No users match" description="Adjust the search or filters." />
      ) : (
        <DataTable
          head={[
            "User",
            "Role",
            "Assigned Clients",
            "Permission Profile / Access",
            "Status",
            "Last Active",
            "",
          ]}
          minWidth={900}
        >
          {users.map((u) => (
            <Tr key={u.id} onClick={() => navigate(`/payflow/users/${u.id}`)}>
              <Td>
                <PrimaryCell title={u.full_name} subtitle={u.email} />
              </Td>
              <Td>
                <StatusPill tone={roleTone(u.role_scope)}>{u.role_name}</StatusPill>
              </Td>
              <Td className="text-slate-500">{u.assigned_clients.join(", ")}</Td>
              <Td className="text-slate-500">{u.permission_profile}</Td>
              <Td>
                <StatusPill tone={statusTone(u.status)}>{u.status_label}</StatusPill>
              </Td>
              <Td className="text-slate-500">{u.last_active || "—"}</Td>
              <Td>
                <span className="text-[12px] font-medium text-primary">View</span>
              </Td>
            </Tr>
          ))}
        </DataTable>
      )}

      <div className="mt-5">
        <RolesPanel roles={roles} onRolesChanged={setRoles} onChanged={load} />
      </div>
    </>
  );
}

function AddUserForm({
  roles,
  onCancel,
  onCreated,
}: {
  roles: PayflowRoleListItem[];
  onCancel: () => void;
  onCreated: (user: PayflowUser) => void;
}) {
  const defaultRole =
    roles.find((r) => r.code === "supervisor") || roles[0] || null;
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [roleCode, setRoleCode] = useState(defaultRole?.code || "");
  const [status, setStatus] = useState("Active");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedRole = roles.find((r) => r.code === roleCode);
  const isPlatform = selectedRole?.scope === "platform_wide";
  const roleOptions = roles.map((r) => ({
    value: r.code,
    label: `${r.name} (${r.scope === "platform_wide" ? "Platform-wide" : "Client-scoped"})`,
  }));

  const valid =
    fullName.trim().length > 1 && /.+@.+\..+/.test(email.trim()) && Boolean(roleCode);

  return (
    <Panel
      title="Add User"
      description="Assign a role here. Client assignment happens when you create or edit a client."
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Full Name">
          <TextInput value={fullName} onChange={setFullName} placeholder="Amara Okafor" />
        </Field>
        <Field label="Email">
          <TextInput value={email} onChange={setEmail} placeholder="name@payflow.io" type="email" />
        </Field>
        <Field label="Role">
          <SelectInput value={roleCode} options={roleOptions} onChange={setRoleCode} />
        </Field>
        <Field label="Status">
          <SelectInput
            value={status}
            options={["Active", "Inactive"]}
            onChange={setStatus}
          />
        </Field>
      </div>

      {selectedRole ? (
        <p className="mt-4 rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-3 text-[12px] text-slate-500 dark:border-slate-700 dark:bg-slate-800">
          {isPlatform
            ? `${selectedRole.name} is platform-wide and works across every client. No client assignment is required.`
            : `${selectedRole.name} is client-scoped. Assign this user to clients from Client create/edit. Permissions come from the role (${selectedRole.permission_count} selected) and are managed under Roles.`}
        </p>
      ) : null}

      {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}

      {!valid && !saving ? (
        <p className="mt-3 text-[12px] text-amber-700 dark:text-amber-400">
          {!fullName.trim() || fullName.trim().length < 2
            ? "Enter a full name to continue."
            : !/.+@.+\..+/.test(email.trim())
              ? "Enter a valid email address."
              : !roleCode
                ? "Select a role."
                : null}
        </p>
      ) : null}

      <div className="mt-4 flex gap-2">
        <Btn
          variant="primary"
          disabled={!valid || saving}
          onClick={() => {
            setSaving(true);
            setError(null);
            createPayflowUser({
              full_name: fullName.trim(),
              email: email.trim(),
              role_code: roleCode,
              status: status === "Inactive" ? "disabled" : "invited",
            })
              .then(onCreated)
              .catch((err: unknown) => {
                setError(err instanceof Error ? err.message : "Failed to create user");
              })
              .finally(() => setSaving(false));
          }}
        >
          {saving ? "Creating…" : "Create User"}
        </Btn>
        <Btn variant="ghost" onClick={onCancel}>
          Cancel
        </Btn>
      </div>
    </Panel>
  );
}

function RolesPanel({
  roles,
  onRolesChanged,
  onChanged,
}: {
  roles: PayflowRoleListItem[];
  onRolesChanged: (roles: PayflowRoleListItem[]) => void;
  onChanged: () => void;
}) {
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [groups, setGroups] = useState<PayflowPermissionGroup[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listPayflowPermissions()
      .then((res) => setGroups(res.groups))
      .catch(() => setGroups([]));
  }, []);

  return (
    <Panel
      title="Roles"
      description="Each role is a named permission set. Roles appear in the role dropdown when assigning users."
      action={
        <Btn variant={adding ? "ghost" : "secondary"} onClick={() => setAdding((v) => !v)}>
          {adding ? "Close" : "+ Add Role"}
        </Btn>
      }
    >
      {adding ? (
        <div className="mb-4">
          <AddRoleForm
            groups={groups}
            existingNames={roles.map((r) => r.name)}
            busy={busy}
            onCancel={() => setAdding(false)}
            onCreate={(input) => {
              setBusy(true);
              setError(null);
              createPayflowRole(input)
                .then((res) => {
                  onRolesChanged(res.roles);
                  setAdding(false);
                  onChanged();
                })
                .catch((err: unknown) => {
                  setError(err instanceof Error ? err.message : "Failed to create role");
                })
                .finally(() => setBusy(false));
            }}
          />
        </div>
      ) : null}

      {error ? <p className="mb-3 text-sm text-red-600">{error}</p> : null}

      <DataTable head={["Role", "Scope", "Permissions", "Users", ""]} minWidth={720}>
        {roles.map((r) => (
          <Tr key={r.id}>
            <Td>
              <PrimaryCell title={r.name} subtitle={r.description || undefined} />
            </Td>
            <Td>
              <StatusPill tone={roleTone(r.scope)}>{scopeLabel(r.scope)}</StatusPill>
            </Td>
            <Td className="text-slate-500">
              {r.scope === "platform_wide" ? "All permissions" : `${r.permission_count} selected`}
            </Td>
            <Td className="text-slate-500">{r.user_count}</Td>
            <Td>
              <div className="flex justify-end gap-1.5">
                <Btn
                  variant="ghost"
                  onClick={() => setEditingId(editingId === r.id ? null : r.id)}
                >
                  {editingId === r.id ? "Hide" : r.is_built_in ? "View access" : "Edit access"}
                </Btn>
                <Btn
                  variant="danger"
                  disabled={r.is_built_in || r.user_count > 0 || busy}
                  title={
                    r.is_built_in
                      ? "Built-in roles cannot be deleted"
                      : r.user_count > 0
                        ? "Reassign users before deleting this role"
                        : `Delete ${r.name}`
                  }
                  onClick={() => {
                    if (r.is_built_in || r.user_count > 0) return;
                    if (!window.confirm(`Delete role "${r.name}"?`)) return;
                    setBusy(true);
                    setError(null);
                    deletePayflowRole(r.id)
                      .then(() => listPayflowRoles())
                      .then((res) => {
                        onRolesChanged(res.roles);
                        if (editingId === r.id) setEditingId(null);
                        onChanged();
                      })
                      .catch((err: unknown) => {
                        setError(err instanceof Error ? err.message : "Failed to delete role");
                      })
                      .finally(() => setBusy(false));
                  }}
                >
                  Delete
                </Btn>
              </div>
            </Td>
          </Tr>
        ))}
      </DataTable>

      {editingId != null ? (
        <RolePermissionsPanel
          role={roles.find((r) => r.id === editingId) || null}
          groups={groups}
          onSaved={(next) => {
            onRolesChanged(next);
            onChanged();
          }}
          onError={setError}
        />
      ) : null}
    </Panel>
  );
}

function RolePermissionsPanel({
  role,
  groups,
  onSaved,
  onError,
}: {
  role: PayflowRoleListItem | null;
  groups: PayflowPermissionGroup[];
  onSaved: (roles: PayflowRoleListItem[]) => void;
  onError: (msg: string | null) => void;
}) {
  const [selected, setSelected] = useState<string[]>(role?.permission_codes || []);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setSelected(role?.permission_codes || []);
  }, [role?.id, role?.permission_codes]);

  if (!role) return null;

  const editable = !role.is_built_in && role.scope === "client_scoped";
  const allCodes = groups.flatMap((g) => g.permissions.map((p) => p.code));

  return (
    <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-3 dark:border-slate-700 dark:bg-slate-800/60">
      <p className="text-[13px] font-semibold text-slate-900 dark:text-slate-100">
        {role.name} — permissions
      </p>
      <p className="mb-3 text-[11px] text-slate-500">
        {role.scope === "platform_wide"
          ? "A platform-wide role holds every permission across all clients."
          : editable
            ? "These permissions apply when this role is assigned to a client. Existing users keep their per-client access."
            : "Built-in role — its default permission set cannot be changed, but each assignment can be tuned per client."}
      </p>
      <PermissionPicker
        groups={groups}
        selected={role.scope === "platform_wide" ? allCodes : selected}
        disabled={!editable}
        onToggle={(code) =>
          setSelected((prev) =>
            prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code],
          )
        }
      />
      {editable ? (
        <div className="mt-3 flex gap-2">
          <Btn
            variant="primary"
            disabled={saving || selected.length === 0}
            onClick={() => {
              setSaving(true);
              onError(null);
              updatePayflowRole(role.id, { permission_codes: selected })
                .then((res) => onSaved(res.roles))
                .catch((err: unknown) => {
                  onError(err instanceof Error ? err.message : "Failed to update role");
                })
                .finally(() => setSaving(false));
            }}
          >
            {saving ? "Saving…" : "Save access"}
          </Btn>
        </div>
      ) : null}
    </div>
  );
}

function AddRoleForm({
  groups,
  existingNames,
  onCancel,
  onCreate,
  busy,
}: {
  groups: PayflowPermissionGroup[];
  existingNames: string[];
  onCancel: () => void;
  onCreate: (input: {
    name: string;
    scope: string;
    description?: string;
    permission_codes: string[];
  }) => void;
  busy?: boolean;
}) {
  const [name, setName] = useState("");
  const [scope, setScope] = useState("Client-scoped");
  const [description, setDescription] = useState("");
  const [permissions, setPermissions] = useState<string[]>([...SUPERVISOR_DEFAULT_CODES]);

  const duplicate = existingNames.some((n) => n.toLowerCase() === name.trim().toLowerCase());
  const scopeApi = scope === "Platform-wide" ? "platform_wide" : "client_scoped";
  const valid =
    name.trim().length > 2 &&
    !duplicate &&
    (scopeApi === "platform_wide" || permissions.length > 0);

  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-3.5 dark:border-slate-700 dark:bg-slate-800/60">
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Role Name">
          <TextInput value={name} onChange={setName} placeholder="Collections Team Lead" />
        </Field>
        <Field label="Scope">
          <SelectInput
            value={scope}
            options={["Client-scoped", "Platform-wide"]}
            onChange={setScope}
          />
        </Field>
        <Field label="Description">
          <TextInput
            value={description}
            onChange={setDescription}
            placeholder="What this role is for"
          />
        </Field>
      </div>

      {duplicate ? (
        <p className="mt-2 text-[11px] text-red-600">A role with this name already exists.</p>
      ) : null}

      {scopeApi === "platform_wide" ? (
        <p className="mt-4 rounded-lg border border-slate-200 bg-white px-3.5 py-3 text-[12px] text-slate-500 dark:border-slate-600 dark:bg-slate-900">
          A platform-wide role works across every client and holds every permission. No client
          assignment is required.
        </p>
      ) : (
        <div className="mt-4">
          <p className="mb-1.5 text-[12px] font-medium text-slate-800 dark:text-slate-200">
            Permissions — what this role may do inside assigned clients
          </p>
          <PermissionPicker
            groups={groups}
            selected={permissions}
            onToggle={(code) =>
              setPermissions((prev) =>
                prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code],
              )
            }
          />
        </div>
      )}

      <div className="mt-4 flex gap-2">
        <Btn
          variant="primary"
          disabled={!valid || busy}
          onClick={() =>
            onCreate({
              name: name.trim(),
              scope: scopeApi,
              description: description.trim() || undefined,
              permission_codes: scopeApi === "platform_wide" ? [] : permissions,
            })
          }
        >
          {busy ? "Creating…" : "Create Role"}
        </Btn>
        <Btn variant="ghost" onClick={onCancel}>
          Cancel
        </Btn>
      </div>
    </div>
  );
}
