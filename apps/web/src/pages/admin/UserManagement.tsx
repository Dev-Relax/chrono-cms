import React, { useCallback, useEffect, useState } from "react";
import { usersApi, ApiError } from "../../lib/api.js";
import type { AdminUser, Role } from "../../types/index.js";
import { Layout } from "../../components/common/Layout.js";
import { SkeletonTableRows } from "../../components/common/Skeleton.js";
import { useAuth } from "../../context/AuthContext.js";

const ROLES: Role[] = ["ADMIN", "EDITOR", "AUTHOR"];

const roleBadge = (role: Role) => {
  const styles: Record<Role, string> = {
    ADMIN:  "bg-purple-900/40 text-purple-400",
    EDITOR: "bg-emerald-900/40 text-emerald-400",
    AUTHOR: "bg-slate-800 text-slate-400",
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${styles[role]}`}>
      {role}
    </span>
  );
};

type EditState = { name: string; role: Role; password: string };

const EditRow: React.FC<{
  user: AdminUser;
  selfId: string;
  onSave: (id: string, data: Partial<EditState>) => Promise<void>;
  onDelete: (user: AdminUser) => void;
}> = ({ user, selfId, onSave, onDelete }) => {
  const [editing, setEditing] = useState(false);
  const [form, setForm]       = useState<EditState>({ name: user.name ?? "", role: user.role, password: "" });
  const [saving, setSaving]   = useState(false);

  const handleSave = async () => {
    setSaving(true);
    await onSave(user.id, {
      name:     form.name || undefined,
      role:     form.role,
      password: form.password || undefined,
    });
    setSaving(false);
    setEditing(false);
    setForm((f) => ({ ...f, password: "" }));
  };

  if (!editing) {
    return (
      <tr className="bg-slate-950 hover:bg-slate-900 transition-colors">
        <td className="px-4 py-3">
          <div className="font-medium text-slate-200">{user.name ?? "—"}</div>
          <div className="text-xs text-slate-500">{user.email}</div>
        </td>
        <td className="px-4 py-3">{roleBadge(user.role)}</td>
        <td className="px-4 py-3 text-xs text-slate-500">
          {new Date(user.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
        </td>
        <td className="px-4 py-3">
          <div className="flex items-center justify-end gap-2">
            <button
              onClick={() => setEditing(true)}
              className="rounded-md bg-slate-800 px-2.5 py-1 text-xs font-medium
                         text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
            >
              Edit
            </button>
            {user.id !== selfId && (
              <button
                onClick={() => onDelete(user)}
                className="rounded-md bg-red-900/30 px-2.5 py-1 text-xs font-medium
                           text-red-400 hover:bg-red-900/60 transition-colors"
              >
                Delete
              </button>
            )}
          </div>
        </td>
      </tr>
    );
  }

  const inputCls = "rounded border border-slate-700 bg-slate-800 px-2 py-1 text-xs text-slate-200 focus:border-brand-500 focus:outline-none w-full";

  return (
    <tr className="bg-slate-900">
      <td className="px-4 py-3 space-y-1.5">
        <input
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          placeholder="Display name"
          className={inputCls}
        />
        <input
          value={form.password}
          onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
          type="password"
          placeholder="New password (leave blank to keep)"
          className={inputCls}
        />
      </td>
      <td className="px-4 py-3">
        <select
          value={form.role}
          onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as Role }))}
          className="rounded border border-slate-700 bg-slate-800 px-2 py-1 text-xs text-slate-200 focus:outline-none"
        >
          {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
      </td>
      <td className="px-4 py-3 text-xs text-slate-600">{user.email}</td>
      <td className="px-4 py-3">
        <div className="flex items-center justify-end gap-2">
          <button
            onClick={handleSave}
            disabled={saving}
            className="rounded-md bg-brand-600 px-2.5 py-1 text-xs font-semibold text-white
                       hover:bg-brand-700 disabled:opacity-50 transition-colors"
          >
            {saving ? "Saving…" : "Save"}
          </button>
          <button
            onClick={() => setEditing(false)}
            className="rounded-md px-2 py-1 text-xs text-slate-400 hover:text-white transition-colors"
          >
            Cancel
          </button>
        </div>
      </td>
    </tr>
  );
};

const UserManagement: React.FC = () => {
  const { state } = useAuth();
  const selfId = state.status === "authenticated" ? state.user.id : "";

  const [users, setUsers]     = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({ email: "", password: "", name: "", role: "EDITOR" as Role });
  const [creating, setCreating]     = useState(false);

  const fetchUsers = useCallback(() => {
    setLoading(true);
    usersApi.list()
      .then(({ data }) => setUsers(data))
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const handleSave = async (id: string, data: { name?: string; role?: Role; password?: string }) => {
    try {
      const { data: updated } = await usersApi.update(id, data);
      setUsers((prev) => prev.map((u) => u.id === id ? updated : u));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Update failed");
    }
  };

  const handleDelete = async (user: AdminUser) => {
    if (!confirm(`Delete user "${user.email}"? This cannot be undone.`)) return;
    try {
      await usersApi.delete(user.id);
      setUsers((prev) => prev.filter((u) => u.id !== user.id));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Delete failed");
    }
  };

  const handleCreate = async () => {
    if (!createForm.email || !createForm.password) {
      setError("Email and password are required");
      return;
    }
    setCreating(true);
    setError(null);
    try {
      const { data: user } = await usersApi.create({
        email:    createForm.email,
        password: createForm.password,
        name:     createForm.name || undefined,
        role:     createForm.role,
      });
      setUsers((prev) => [...prev, user]);
      setShowCreate(false);
      setCreateForm({ email: "", password: "", name: "", role: "EDITOR" });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Create failed");
    } finally {
      setCreating(false);
    }
  };

  const inputCls = "w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-200 placeholder-slate-600 focus:border-brand-500 focus:outline-none";

  return (
    <Layout admin>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-50">Team</h1>
          <p className="mt-1 text-sm text-slate-500">Manage users and their roles.</p>
        </div>
        <button
          onClick={() => setShowCreate((v) => !v)}
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white
                     hover:bg-brand-700 transition-colors"
        >
          + Invite user
        </button>
      </div>

      {error && (
        <p className="mb-4 rounded-lg bg-red-900/30 border border-red-800 px-4 py-3 text-sm text-red-400">
          {error}
        </p>
      )}

      {showCreate && (
        <div className="mb-6 rounded-xl border border-slate-700 bg-slate-900/60 p-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-slate-500">Email *</label>
            <input value={createForm.email} onChange={(e) => setCreateForm((f) => ({ ...f, email: e.target.value }))} type="email" placeholder="user@example.com" className={inputCls} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-slate-500">Password *</label>
            <input value={createForm.password} onChange={(e) => setCreateForm((f) => ({ ...f, password: e.target.value }))} type="password" placeholder="Min 8 characters" className={inputCls} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-slate-500">Name</label>
            <input value={createForm.name} onChange={(e) => setCreateForm((f) => ({ ...f, name: e.target.value }))} placeholder="Display name" className={inputCls} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-slate-500">Role</label>
            <select value={createForm.role} onChange={(e) => setCreateForm((f) => ({ ...f, role: e.target.value as Role }))} className={inputCls}>
              {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <div className="sm:col-span-2 lg:col-span-4 flex gap-2">
            <button onClick={handleCreate} disabled={creating} className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50 transition-colors">
              {creating ? "Creating…" : "Create user"}
            </button>
            <button onClick={() => setShowCreate(false)} className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors">
              Cancel
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <SkeletonTableRows rows={6} cols={4} />
      ) : (
        <div className="rounded-xl border border-slate-800 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-900">
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">User</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Role</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Joined</th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-slate-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {users.map((user) => (
                <EditRow key={user.id} user={user} selfId={selfId} onSave={handleSave} onDelete={handleDelete} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Layout>
  );
};

export default UserManagement;
