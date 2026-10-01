import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  deactivatePayflowUser,
  getPayflowUser,
  listPayflowRoles,
  reactivatePayflowUser,
  resendPayflowInvitation,
  updatePayflowUser,
} from "../../api/payflow";
import {
  Btn,
  Field,
  PageHeader,
  Panel,
  SelectInput,
  StatusPill,
  TextInput,
} from "../../components/payflow-ui";
import { usePayFlowAccess } from "../../context/PayFlowAccessContext";
import type { PayflowUser } from "../../types";

function statusTone(status: string) {
  if (status === "active") return "success" as const;
  if (status === "invited") return "warning" as const;
  return "neutral" as const;
}

export function PayFlowUserDetailPage() {
  const { userId } = useParams<{ userId: string }>();
  const { isOperationsAdmin } = usePayFlowAccess();
  const navigate = useNavigate();
  const [user, setUser] = useState<PayflowUser | null>(null);
  const [roleOptions, setRoleOptions] = useState<{ value: string; label: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [statusBusy, setStatusBusy] = useState(false);

  const load = () => {
    if (!userId) return;
    setLoading(true);
    Promise.all([getPayflowUser(userId), listPayflowRoles()])
      .then(([u, rolesRes]) => {
        setUser(u);
        setRoleOptions(rolesRes.roles.map((r) => ({ value: r.code, label: r.name })));
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "User not found");
        setUser(null);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!isOperationsAdmin) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, isOperationsAdmin]);

  if (!isOperationsAdmin) {
    return (
      <Panel title="Administrator access required">
        <p className="text-sm text-slate-500">Only an Operations Admin can view user access details.</p>
      </Panel>
    );
  }

  if (loading) return <p className="text-sm text-slate-500">Loading…</p>;

  if (!user) {
    return (
      <Panel title="User not found">
        <p className="text-sm text-slate-500">{error || "This user no longer exists."}</p>
        <Link to="/payflow/users" className="mt-3 inline-block text-[13px] font-medium text-primary">
          Back to Users &amp; Permissions
        </Link>
      </Panel>
    );
  }

  const isSupervisor = user.role_scope !== "platform_wide";

  return (
    <>
      <PageHeader
        breadcrumb={[
          { label: "Users & Permissions", to: "/payflow/users" },
          { label: user.full_name },
        ]}
        backTo="/payflow/users"
        title={user.full_name}
        description={user.email}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <StatusPill tone={isSupervisor ? "neutral" : "info"}>{user.role_name}</StatusPill>
            <StatusPill tone={statusTone(user.status)}>{user.status_label}</StatusPill>
            <Btn onClick={() => setEditing((v) => !v)}>{editing ? "Close" : "Edit User"}</Btn>
            {user.status === "active" ? (
              <Btn
                variant="danger"
                disabled={statusBusy}
                onClick={() => {
                  setStatusBusy(true);
                  setMessage(null);
                  deactivatePayflowUser(user.id)
                    .then((updated) => {
                      setUser(updated);
                      setMessage("User deactivated. PayFlow access is blocked; configuration is preserved.");
                    })
                    .catch((err: unknown) =>
                      setMessage(err instanceof Error ? err.message : "Failed to deactivate"),
                    )
                    .finally(() => setStatusBusy(false));
                }}
              >
                {statusBusy ? "Working…" : "Deactivate"}
              </Btn>
            ) : null}
            {user.status === "disabled" ? (
              <Btn
                variant="secondary"
                disabled={statusBusy}
                onClick={() => {
                  setStatusBusy(true);
                  setMessage(null);
                  reactivatePayflowUser(user.id)
                    .then((updated) => {
                      setUser(updated);
                      setMessage(
                        updated.status === "invited"
                          ? "User reactivated as Invitation Pending so they can set a password."
                          : "User reactivated. Existing role, clients and permissions are unchanged.",
                      );
                    })
                    .catch((err: unknown) =>
                      setMessage(err instanceof Error ? err.message : "Failed to reactivate"),
                    )
                    .finally(() => setStatusBusy(false));
                }}
              >
                {statusBusy ? "Working…" : "Reactivate"}
              </Btn>
            ) : null}
            {user.status === "invited" ? (
              <Btn
                variant="secondary"
                onClick={() => {
                  setMessage(null);
                  resendPayflowInvitation(user.id)
                    .then((res) => setMessage(res.message || "Invitation resent"))
                    .catch((err: unknown) =>
                      setMessage(err instanceof Error ? err.message : "Failed to resend"),
                    );
                }}
              >
                Resend Invitation
              </Btn>
            ) : null}
          </div>
        }
      />

      {message ? (
        <p className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-[12px] text-emerald-800">
          {message}
        </p>
      ) : null}

      {editing ? (
        <div className="mb-5">
          <Panel title="Edit User">
            <EditUserForm
              user={user}
              roleOptions={roleOptions}
              onCancel={() => setEditing(false)}
              onSaved={(updated) => {
                setUser(updated);
                setEditing(false);
                setMessage("User updated");
              }}
            />
          </Panel>
        </div>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
        <div className="space-y-5">
          {isSupervisor ? (
            <Panel
              title="Assigned Clients & Access"
              description="Clients are assigned from Client create/edit. Permissions come from the role."
            >
              {user.assigned_clients.includes("None assigned") ||
              user.assigned_clients.length === 0 ? (
                <p className="rounded-lg border border-dashed border-slate-300 px-3 py-6 text-center text-[12px] text-slate-500">
                  No clients assigned yet. Assign this supervisor when creating or editing a client.
                </p>
              ) : (
                <p className="text-[13px] text-slate-700">{user.assigned_clients.join(", ")}</p>
              )}
            </Panel>
          ) : (
            <Panel title="Platform Access">
              <p className="text-[13px] text-slate-700">
                {user.role_name} works across every client — clients, accounts, cases, workflows,
                communications, human review, rules and analytics. No client assignment is required.
              </p>
            </Panel>
          )}
        </div>

        <Panel title="Profile">
          <dl className="space-y-2.5 text-[13px]">
            <Row label="Name" value={user.full_name} />
            <Row label="Email" value={user.email} />
            <Row label="Role" value={user.role_name} />
            <Row label="Access Scope" value={isSupervisor ? "Client-scoped" : "Platform-wide"} />
            <Row label="Status" value={user.status_label} />
            <Row label="Permission Profile" value={user.permission_profile} />
            <Row label="Assigned Clients" value={user.assigned_clients.join(", ") || "—"} />
          </dl>
          <Btn variant="ghost" className="mt-4" onClick={() => navigate("/payflow/users")}>
            Back to list
          </Btn>
        </Panel>
      </div>
    </>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-2">
      <dt className="text-[12px] text-slate-500">{label}</dt>
      <dd className="text-[13px] font-medium text-slate-900 dark:text-slate-100">{value}</dd>
    </div>
  );
}

function EditUserForm({
  user,
  roleOptions,
  onCancel,
  onSaved,
}: {
  user: PayflowUser;
  roleOptions: { value: string; label: string }[];
  onCancel: () => void;
  onSaved: (user: PayflowUser) => void;
}) {
  const [fullName, setFullName] = useState(user.full_name);
  const [email, setEmail] = useState(user.email);
  const [roleCode, setRoleCode] = useState(user.role_code);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const roleChanged = roleCode !== user.role_code;

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Full Name">
          <TextInput value={fullName} onChange={setFullName} />
        </Field>
        <Field label="Email">
          <TextInput value={email} onChange={setEmail} type="email" />
        </Field>
        <Field label="Role">
          <SelectInput value={roleCode} options={roleOptions} onChange={setRoleCode} />
        </Field>
      </div>

      {roleChanged ? (
        <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3.5 py-3 text-[12px] text-amber-900">
          Changing this role will change the user&apos;s access model. Platform-wide roles work
          across all clients; client-scoped roles are assigned to clients from Client create/edit.
        </p>
      ) : null}

      {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}

      <div className="mt-4 flex gap-2">
        <Btn
          variant="primary"
          disabled={fullName.trim().length < 2 || !/.+@.+\..+/.test(email) || saving}
          onClick={() => {
            setSaving(true);
            setError(null);
            updatePayflowUser(user.id, {
              full_name: fullName.trim(),
              email: email.trim(),
              role_code: roleCode,
              confirm_role_change: roleChanged,
            })
              .then(onSaved)
              .catch((err: unknown) => {
                setError(err instanceof Error ? err.message : "Failed to update user");
              })
              .finally(() => setSaving(false));
          }}
        >
          {saving ? "Saving…" : "Save Changes"}
        </Btn>
        <Btn variant="ghost" onClick={onCancel}>
          Cancel
        </Btn>
      </div>
    </>
  );
}
