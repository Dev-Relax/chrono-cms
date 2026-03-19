import React, { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { pagesApi, ApiError } from "../../lib/api.js";
import type { Page } from "../../types/index.js";
import { Layout } from "../../components/common/Layout.js";
import { SkeletonTableRows } from "../../components/common/Skeleton.js";

const PagesAdmin: React.FC = () => {
  const [pages, setPages]     = useState<Page[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  const fetchPages = useCallback(() => {
    setLoading(true);
    pagesApi.adminList()
      .then(({ data }) => setPages(data))
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchPages(); }, [fetchPages]);

  const handleDelete = async (page: Page) => {
    if (!confirm(`Delete page "${page.title}"? This cannot be undone.`)) return;
    try {
      await pagesApi.delete(page.id);
      setPages((prev) => prev.filter((p) => p.id !== page.id));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Delete failed");
    }
  };

  return (
    <Layout admin>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-50">Pages</h1>
          <p className="mt-1 text-sm text-slate-500">Standalone CMS pages (About, Contact, …)</p>
        </div>
        <Link
          to="/admin/pages/new"
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white
                     hover:bg-brand-700 transition-colors"
        >
          + New page
        </Link>
      </div>

      {error && (
        <p className="mb-4 rounded-lg bg-red-900/30 border border-red-800 px-4 py-3 text-sm text-red-400">
          {error}
        </p>
      )}

      {loading ? (
        <SkeletonTableRows rows={6} cols={4} />
      ) : pages.length === 0 ? (
        <p className="text-center text-slate-500 py-20">No pages yet.</p>
      ) : (
        <div className="rounded-xl border border-slate-800 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-900">
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Title</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Updated</th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-slate-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {pages.map((page) => (
                <tr key={page.id} className="bg-slate-950 hover:bg-slate-900 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-slate-200">{page.title}</span>
                      <span className="font-mono text-xs text-slate-600">/{page.slug}</span>
                      {(page.translationCount ?? 0) > 1 && (
                        <span className="inline-flex items-center rounded-full bg-brand-600/20 px-1.5 py-0.5 text-[10px] font-semibold text-brand-400">
                          {page.translationCount} langs
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={[
                      "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
                      page.status === "PUBLISHED"
                        ? "bg-emerald-900/40 text-emerald-400"
                        : "bg-amber-900/30 text-amber-500",
                    ].join(" ")}>
                      {page.status === "PUBLISHED" ? "● Published" : "○ Draft"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">
                    {new Date(page.updatedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      {page.status === "PUBLISHED" && (
                        <Link
                          to={`/${page.slug}`}
                          target="_blank"
                          className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
                        >
                          View ↗
                        </Link>
                      )}
                      <Link
                        to={`/admin/pages/${page.id}/edit`}
                        className="rounded-md bg-slate-800 px-2.5 py-1 text-xs font-medium
                                   text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
                      >
                        Edit
                      </Link>
                      <button
                        onClick={() => handleDelete(page)}
                        className="rounded-md bg-red-900/30 px-2.5 py-1 text-xs font-medium
                                   text-red-400 hover:bg-red-900/60 transition-colors"
                      >
                        Delete
                      </button>
                    </div>
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

export default PagesAdmin;
