import React, { useCallback, useEffect, useState } from "react";
import { apiKeysApi, ApiError } from "../../lib/api.js";
import { Layout } from "../../components/common/Layout.js";
import { SkeletonTableRows } from "../../components/common/Skeleton.js";

interface ApiKeyRecord {
  id:         string;
  name:       string;
  prefix:     string;
  lastUsedAt: string | null;
  createdAt:  string;
  user:       { id: string; name: string | null; email: string };
}

const ApiKeysAdmin: React.FC = () => {
  const [keys, setKeys]           = useState<ApiKeyRecord[]>([]);
  const [loading, setLoading]     = useState(true);
  const [showForm, setShowForm]   = useState(false);
  const [name, setName]           = useState("");
  const [saving, setSaving]       = useState(false);
  const [newKey, setNewKey]       = useState<string | null>(null);
  const [copied, setCopied]       = useState(false);
  const [error, setError]         = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    apiKeysApi.list()
      .then(({ data }) => setKeys(data as ApiKeyRecord[]))
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const { data } = await apiKeysApi.create(name.trim());
      setNewKey(data.key);
      setName("");
      setShowForm(false);
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Create failed");
    } finally {
      setSaving(false);
    }
  };

  const handleRevoke = async (k: ApiKeyRecord) => {
    if (!confirm(`Revoke key "${k.name}"? This cannot be undone and any service using it will lose access.`)) return;
    try {
      await apiKeysApi.delete(k.id);
      load();
    } catch (err) {
      alert((err as Error).message);
    }
  };

  const handleCopy = async () => {
    if (!newKey) return;
    await navigator.clipboard.writeText(newKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const fmt = (d: string | null) =>
    d ? new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "Never";

  return (
    <Layout admin>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-50">API Keys</h1>
          <p className="mt-1 text-sm text-slate-500">
            Long-lived tokens for server-to-server headless API access. Use instead of JWT.
          </p>
        </div>
        <button
          onClick={() => { setShowForm((v) => !v); setError(null); }}
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 transition-colors"
        >
          + New key
        </button>
      </div>

      {newKey && (
        <div className="mb-6 rounded-xl border border-amber-700 bg-amber-900/20 p-5">
          <p className="mb-1 text-sm font-semibold text-amber-300">
            Save this key — it will only be shown once.
          </p>
          <p className="mb-3 text-xs text-amber-500">
            Copy it now and store it securely. You cannot retrieve it again.
          </p>
          <div className="flex items-center gap-3">
            <code className="flex-1 rounded-lg bg-slate-900 px-4 py-2.5 font-mono text-sm text-emerald-300 break-all">
              {newKey}
            </code>
            <button
              onClick={() => void handleCopy()}
              className="shrink-0 rounded-lg border border-amber-700 px-3 py-2 text-xs font-medium text-amber-300 hover:bg-amber-900/40 transition-colors"
            >
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>
          <button
            onClick={() => setNewKey(null)}
            className="mt-3 text-xs text-amber-600 hover:text-amber-400 transition-colors"
          >
            I've saved it — dismiss
          </button>
        </div>
      )}

      {error && (
        <p className="mb-4 rounded-lg bg-red-900/30 border border-red-800 px-4 py-3 text-sm text-red-400">{error}</p>
      )}

      {showForm && (
        <form
          onSubmit={(e) => { void handleCreate(e); }}
          className="mb-6 flex items-end gap-3 rounded-xl border border-slate-700 bg-slate-900/80 p-5"
        >
          <div className="flex-1">
            <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-slate-500">Key name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="e.g. Next.js frontend, Zapier integration"
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100
                         placeholder-slate-600 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>
          <button
            type="submit" disabled={saving}
            className="rounded-lg bg-brand-600 px-5 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50 transition-colors"
          >
            {saving ? "Creating…" : "Create"}
          </button>
          <button
            type="button" onClick={() => setShowForm(false)}
            className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors"
          >
            Cancel
          </button>
        </form>
      )}

      <div className="mb-6 rounded-xl border border-slate-800 bg-slate-900/40 px-5 py-4 text-xs text-slate-500 space-y-1">
        <p className="font-medium text-slate-400">Usage</p>
        <p>Pass the key as a Bearer token or custom header:</p>
        <code className="block rounded bg-slate-900 px-3 py-2 font-mono text-slate-400">
          Authorization: Bearer ck_…
        </code>
        <code className="block rounded bg-slate-900 px-3 py-2 font-mono text-slate-400">
          X-Api-Key: ck_…
        </code>
        <p className="pt-1">Keys inherit the permissions of their creator (ADMIN role).</p>
      </div>

      {loading ? (
        <SkeletonTableRows rows={4} cols={6} />
      ) : keys.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-800 py-20 text-center">
          <p className="text-slate-500">No API keys yet.</p>
        </div>
      ) : (
        <div className="rounded-xl border border-slate-800 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-900">
                {["Name", "Key prefix", "Created by", "Created", "Last used", ""].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {keys.map((k) => (
                <tr key={k.id} className="bg-slate-950 hover:bg-slate-900 transition-colors">
                  <td className="px-4 py-3 font-medium text-slate-200">{k.name}</td>
                  <td className="px-4 py-3 font-mono text-slate-500">{k.prefix}…</td>
                  <td className="px-4 py-3 text-slate-500">{k.user.name ?? k.user.email}</td>
                  <td className="px-4 py-3 text-slate-500">{fmt(k.createdAt)}</td>
                  <td className="px-4 py-3 text-slate-500">{fmt(k.lastUsedAt)}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => void handleRevoke(k)}
                      className="rounded-md bg-red-900/30 px-2.5 py-1 text-xs font-medium text-red-400 hover:bg-red-900/60 hover:text-red-300 transition-colors"
                    >
                      Revoke
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Layout>
  );
};

export default ApiKeysAdmin;
