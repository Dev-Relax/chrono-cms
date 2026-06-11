import React, { useCallback, useEffect, useState } from "react"
import { webhooksApi, ApiError } from "../../lib/api.js"
import { Layout } from "../../components/common/Layout.js"
import { SkeletonCardList } from "../../components/common/Skeleton.js"

interface Webhook {
  id: string
  name: string
  url: string
  secret: string | null
  events: string[]
  active: boolean
  createdAt: string
}

const ALL_EVENTS = [
  "post.created",
  "post.updated",
  "post.published",
  "post.deleted",
  "page.created",
  "page.updated",
  "page.published",
  "page.deleted",
  "project.created",
  "project.updated",
  "project.published",
  "project.deleted",
]

const inputCls =
  "w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm " +
  "text-slate-100 placeholder-slate-600 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"

const EMPTY_FORM = {
  name: "",
  url: "",
  secret: "",
  events: [] as string[],
  active: true,
}

const WebhooksAdmin: React.FC = () => {
  const [hooks, setHooks] = useState<Webhook[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Webhook | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [testStatus, setTestStatus] = useState<Record<string, string>>({})
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(() => {
    setLoading(true)
    webhooksApi
      .list()
      .then(({ data }) => setHooks(data as Webhook[]))
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const openCreate = () => {
    setEditing(null)
    setForm(EMPTY_FORM)
    setShowForm(true)
    setError(null)
  }
  const openEdit = (h: Webhook) => {
    setEditing(h)
    setForm({
      name: h.name,
      url: h.url,
      secret: h.secret ?? "",
      events: h.events,
      active: h.active,
    })
    setShowForm(true)
    setError(null)
  }
  const closeForm = () => {
    setShowForm(false)
    setEditing(null)
  }

  const toggleEvent = (ev: string) =>
    setForm((f) => ({
      ...f,
      events: f.events.includes(ev) ? f.events.filter((e) => e !== ev) : [...f.events, ev],
    }))

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const payload = {
        name: form.name.trim(),
        url: form.url.trim(),
        secret: form.secret.trim() || null,
        events: form.events,
        active: form.active,
      }
      if (editing) {
        await webhooksApi.update(editing.id, payload)
      } else {
        await webhooksApi.create(payload)
      }
      load()
      closeForm()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Save failed")
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (h: Webhook) => {
    if (!confirm(`Delete webhook "${h.name}"?`)) return
    try {
      await webhooksApi.delete(h.id)
      load()
    } catch (err) {
      alert((err as Error).message)
    }
  }

  const handleTest = async (h: Webhook) => {
    setTestStatus((s) => ({ ...s, [h.id]: "sending…" }))
    try {
      const res = await webhooksApi.test(h.id)
      setTestStatus((s) => ({
        ...s,
        [h.id]: res.ok ? `✓ ${res.status}` : `✗ ${res.status}`,
      }))
    } catch (err) {
      setTestStatus((s) => ({ ...s, [h.id]: `✗ ${(err as Error).message}` }))
    }
    setTimeout(
      () =>
        setTestStatus((s) => {
          const n = { ...s }
          delete n[h.id]
          return n
        }),
      4000,
    )
  }

  return (
    <Layout admin>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-50">Webhooks</h1>
          <p className="mt-1 text-sm text-slate-500">
            Outbound HTTP callbacks fired when content is created, updated, or deleted.
          </p>
        </div>
        <button
          onClick={openCreate}
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 transition-colors"
        >
          + New webhook
        </button>
      </div>

      {error && !showForm && (
        <p className="mb-4 rounded-lg bg-red-900/30 border border-red-800 px-4 py-3 text-sm text-red-400">
          {error}
        </p>
      )}

      {showForm && (
        <div className="mb-8 rounded-xl border border-slate-700 bg-slate-900/80 p-6">
          <h2 className="mb-5 text-base font-semibold text-slate-200">
            {editing ? "Edit webhook" : "Create webhook"}
          </h2>
          {error && (
            <p className="mb-4 rounded-lg bg-red-900/30 border border-red-800 px-4 py-3 text-sm text-red-400">
              {error}
            </p>
          )}
          <form
            onSubmit={(e) => {
              void handleSave(e)
            }}
            className="space-y-4"
          >
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-slate-500">
                  Name
                </label>
                <input
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  required
                  placeholder="My webhook"
                  className={inputCls}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-slate-500">
                  URL
                </label>
                <input
                  value={form.url}
                  onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))}
                  required
                  type="url"
                  placeholder="https://example.com/hooks/cms"
                  className={inputCls}
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-slate-500">
                Signing Secret{" "}
                <span className="normal-case font-normal text-slate-600">
                  (optional — sent as X-Webhook-Signature)
                </span>
              </label>
              <input
                value={form.secret}
                onChange={(e) => setForm((f) => ({ ...f, secret: e.target.value }))}
                placeholder="Leave blank to skip signing"
                className={inputCls}
              />
            </div>

            <div>
              <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-slate-500">
                Events{" "}
                <span className="normal-case font-normal text-slate-600">
                  (none selected = all events)
                </span>
              </label>
              <div className="flex flex-wrap gap-2">
                {ALL_EVENTS.map((ev) => (
                  <button
                    key={ev}
                    type="button"
                    onClick={() => toggleEvent(ev)}
                    className={[
                      "rounded-full px-3 py-1 text-xs font-medium transition-colors border",
                      form.events.includes(ev)
                        ? "border-brand-500 bg-brand-900/40 text-brand-300"
                        : "border-slate-700 text-slate-500 hover:border-slate-500 hover:text-slate-300",
                    ].join(" ")}
                  >
                    {ev}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setForm((f) => ({ ...f, active: !f.active }))}
                role="switch"
                aria-checked={form.active}
                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${form.active ? "bg-brand-600" : "bg-slate-700"}`}
              >
                <span
                  className={`inline-block h-4 w-4 rounded-full bg-white shadow transform transition-transform ${form.active ? "translate-x-4" : "translate-x-0"}`}
                />
              </button>
              <span className="text-sm text-slate-400">{form.active ? "Active" : "Inactive"}</span>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={saving}
                className="rounded-lg bg-brand-600 px-5 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50 transition-colors"
              >
                {saving ? "Saving…" : editing ? "Update" : "Create"}
              </button>
              <button
                type="button"
                onClick={closeForm}
                className="rounded-lg border border-slate-700 px-5 py-2 text-sm text-slate-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <SkeletonCardList rows={4} />
      ) : hooks.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-800 py-20 text-center">
          <p className="text-slate-500">No webhooks yet.</p>
          <p className="mt-1 text-xs text-slate-600">
            Create one to start receiving event notifications.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {hooks.map((h) => (
            <div
              key={h.id}
              className="rounded-xl border border-slate-800 bg-slate-900/60 px-5 py-4"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-slate-200">{h.name}</span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${h.active ? "bg-emerald-900/40 text-emerald-400" : "bg-slate-800 text-slate-500"}`}
                    >
                      {h.active ? "active" : "inactive"}
                    </span>
                    {testStatus[h.id] && (
                      <span
                        className={`text-xs font-mono ${testStatus[h.id]?.startsWith("✓") ? "text-emerald-400" : "text-red-400"}`}
                      >
                        {testStatus[h.id]}
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 font-mono text-xs text-slate-500 truncate">{h.url}</p>
                  {h.events.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {h.events.map((ev) => (
                        <span
                          key={ev}
                          className="rounded-full border border-slate-700 px-2 py-0.5 text-xs text-slate-500"
                        >
                          {ev}
                        </span>
                      ))}
                    </div>
                  )}
                  {h.events.length === 0 && (
                    <p className="mt-1 text-xs text-slate-600">Subscribed to all events</p>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <button
                    onClick={() => void handleTest(h)}
                    className="rounded-md border border-slate-700 px-2.5 py-1 text-xs text-slate-400 hover:text-white hover:border-slate-500 transition-colors"
                  >
                    Test
                  </button>
                  <button
                    onClick={() => openEdit(h)}
                    className="rounded-md bg-slate-800 px-2.5 py-1 text-xs text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => void handleDelete(h)}
                    className="rounded-md bg-red-900/30 px-2.5 py-1 text-xs text-red-400 hover:bg-red-900/60 hover:text-red-300 transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </Layout>
  )
}

export default WebhooksAdmin
