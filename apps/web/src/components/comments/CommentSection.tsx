import React, { useEffect, useState, useCallback } from "react";
import { commentsApi, type CommentPayload } from "../../lib/api.js";
import type { Comment } from "../../types/index.js";

const MAX_DEPTH = 3;

const timeAgo = (iso: string): string => {
  const diff = Date.now() - new Date(iso).getTime();
  const mins  = Math.floor(diff / 60_000);
  if (mins < 1)   return "just now";
  if (mins < 60)  return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs  < 24)  return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30)  return `${days}d ago`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
};

const isNew = (iso: string): boolean =>
  Date.now() - new Date(iso).getTime() < 24 * 60 * 60 * 1000;

interface CommentFormProps {
  postId:      string;
  parentId?:   string;
  onSubmitted: (comment: Comment) => void;
  onCancel?:   () => void;
  compact?:    boolean;
}

const CommentForm: React.FC<CommentFormProps> = ({
  postId, parentId, onSubmitted, onCancel, compact = false,
}) => {
  const [content,     setContent]     = useState("");
  const [authorName,  setAuthorName]  = useState("");
  const [authorEmail, setAuthorEmail] = useState("");
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState<string | null>(null);
  const [success,     setSuccess]     = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const payload: CommentPayload = {
      content:     content.trim(),
      authorName:  authorName.trim(),
      authorEmail: authorEmail.trim(),
      ...(parentId ? { parentId } : {}),
    };

    try {
      const res = await commentsApi.submit(postId, payload);
      setSuccess(true);
      setContent("");
      onSubmitted(res.data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to post comment.");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="rounded-lg border border-brand-500/30 bg-brand-500/5 px-4 py-3 text-sm text-brand-300">
        ✓ Comment submitted — it will appear after moderation.
        {onCancel && (
          <button onClick={onCancel} className="ml-3 text-slate-500 hover:text-slate-300">
            dismiss
          </button>
        )}
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className={compact ? "space-y-2" : "space-y-3"}>
      {!compact && (
        <div className="grid grid-cols-2 gap-3">
          <input
            required
            type="text"
            placeholder="Your name"
            value={authorName}
            onChange={(e) => setAuthorName(e.target.value)}
            maxLength={100}
            className="rounded-lg border border-slate-700 bg-slate-800/60 px-3 py-2 text-sm text-slate-200
                       placeholder-slate-500 focus:border-brand-500 focus:outline-none focus:ring-1
                       focus:ring-brand-500/40 transition-colors"
          />
          <input
            required
            type="email"
            placeholder="your@email.com (not shown)"
            value={authorEmail}
            onChange={(e) => setAuthorEmail(e.target.value)}
            className="rounded-lg border border-slate-700 bg-slate-800/60 px-3 py-2 text-sm text-slate-200
                       placeholder-slate-500 focus:border-brand-500 focus:outline-none focus:ring-1
                       focus:ring-brand-500/40 transition-colors"
          />
        </div>
      )}

      {compact && (
        <div className="grid grid-cols-2 gap-2">
          <input
            required
            type="text"
            placeholder="Name"
            value={authorName}
            onChange={(e) => setAuthorName(e.target.value)}
            maxLength={100}
            className="rounded border border-slate-700 bg-slate-800/60 px-2.5 py-1.5 text-xs text-slate-200
                       placeholder-slate-500 focus:border-brand-500 focus:outline-none transition-colors"
          />
          <input
            required
            type="email"
            placeholder="Email (private)"
            value={authorEmail}
            onChange={(e) => setAuthorEmail(e.target.value)}
            className="rounded border border-slate-700 bg-slate-800/60 px-2.5 py-1.5 text-xs text-slate-200
                       placeholder-slate-500 focus:border-brand-500 focus:outline-none transition-colors"
          />
        </div>
      )}

      <textarea
        required
        placeholder={compact ? "Write a reply…" : "Share your thoughts…"}
        value={content}
        onChange={(e) => setContent(e.target.value)}
        rows={compact ? 2 : 4}
        maxLength={2000}
        className={[
          "w-full resize-none rounded-lg border border-slate-700 bg-slate-800/60 text-slate-200",
          "placeholder-slate-500 focus:border-brand-500 focus:outline-none focus:ring-1",
          "focus:ring-brand-500/40 transition-colors",
          compact ? "px-2.5 py-1.5 text-xs" : "px-3 py-2 text-sm",
        ].join(" ")}
      />

      {error && (
        <p className="text-xs text-red-400">{error}</p>
      )}

      <div className="flex items-center gap-2">
        <button
          type="submit"
          disabled={loading}
          className={[
            "rounded-lg bg-brand-600 px-4 font-medium text-white transition-all",
            "hover:bg-brand-500 disabled:opacity-50",
            compact ? "py-1.5 text-xs" : "py-2 text-sm",
          ].join(" ")}
        >
          {loading ? "Posting…" : compact ? "Reply" : "Post comment"}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className={[
              "text-slate-500 hover:text-slate-300 transition-colors",
              compact ? "text-xs" : "text-sm",
            ].join(" ")}
          >
            Cancel
          </button>
        )}
        <span className={[
          "ml-auto text-slate-600",
          compact ? "text-[10px]" : "text-xs",
        ].join(" ")}>
          {content.length}/2000
        </span>
      </div>
    </form>
  );
};

interface CommentNodeProps {
  comment:     Comment;
  postId:      string;
  depth:       number;
  onNewReply:  (reply: Comment, parentId: string) => void;
}

const CommentNode: React.FC<CommentNodeProps> = ({ comment, postId, depth, onNewReply }) => {
  const [replyOpen, setReplyOpen] = useState(false);
  const fresh = isNew(comment.createdAt);

  const handleReplySubmitted = (reply: Comment) => {
    onNewReply(reply, comment.id);
    setReplyOpen(false);
  };

  return (
    <div className={depth > 0 ? "ml-4 border-l border-slate-800 pl-4" : ""}>
      <div
        className={[
          "group relative rounded-xl border p-4 transition-all",
          fresh
            ? "border-brand-500/40 bg-slate-900/80 shadow-[0_0_12px_0_rgba(99,102,241,0.15)]"
            : "border-slate-800 bg-slate-900/40",
        ].join(" ")}
      >
        {fresh && (
          <span className="absolute right-3 top-3 rounded-full border border-brand-500/50 bg-brand-500/10
                           px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-brand-400
                           shadow-[0_0_8px_0_rgba(99,102,241,0.4)]">
            New
          </span>
        )}

        <div className="mb-2 flex items-center gap-2">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full
                          bg-brand-700/60 text-xs font-bold text-brand-200">
            {comment.authorName.charAt(0).toUpperCase()}
          </div>
          <span className="text-sm font-medium text-slate-200">{comment.authorName}</span>
          <span className="text-xs text-slate-600">·</span>
          <time className="text-xs text-slate-500" dateTime={comment.createdAt}>
            {timeAgo(comment.createdAt)}
          </time>
        </div>

        <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-300">
          {comment.content}
        </p>

        {depth < MAX_DEPTH && (
          <button
            onClick={() => setReplyOpen((v) => !v)}
            className="mt-3 text-xs text-slate-500 hover:text-brand-400 transition-colors"
          >
            {replyOpen ? "✕ Cancel" : "↩ Reply"}
          </button>
        )}
      </div>

      {replyOpen && (
        <div className="ml-4 mt-2 border-l border-brand-500/20 pl-4">
          <CommentForm
            postId={postId}
            parentId={comment.id}
            compact
            onSubmitted={handleReplySubmitted}
            onCancel={() => setReplyOpen(false)}
          />
        </div>
      )}

      {comment.replies && comment.replies.length > 0 && (
        <div className="mt-3 space-y-3">
          {comment.replies.map((reply) => (
            <CommentNode
              key={reply.id}
              comment={reply}
              postId={postId}
              depth={depth + 1}
              onNewReply={onNewReply}
            />
          ))}
        </div>
      )}
    </div>
  );
};

interface CommentSectionProps {
  postId: string;
}

export const CommentSection: React.FC<CommentSectionProps> = ({ postId }) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState<string | null>(null);

  useEffect(() => {
    commentsApi
      .listForPost(postId)
      .then(({ data }) => setComments(data))
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [postId]);

  // Insert a new reply optimistically into the tree at the right parent node
  const insertReply = useCallback((reply: Comment, parentId: string) => {
    const insert = (nodes: Comment[]): Comment[] =>
      nodes.map((n) => {
        if (n.id === parentId) {
          return { ...n, replies: [...(n.replies ?? []), reply] };
        }
        return { ...n, replies: insert(n.replies ?? []) };
      });
    // New replies start as PENDING — show inline confirmation rather than
    // inserting them into the live tree (they won't appear until approved)
    setComments((prev) => insert(prev));
  }, []);

  const handleRootSubmit = (comment: Comment) => {
    // PENDING — don't add to visible tree; form shows its own success message
    void comment;
  };

  const totalCount = (() => {
    const count = (nodes: Comment[]): number =>
      nodes.reduce((acc, n) => acc + 1 + count(n.replies ?? []), 0);
    return count(comments);
  })();

  return (
    <section className="mt-16 border-t border-slate-800 pt-10">
      <h2 className="mb-8 text-xl font-semibold text-slate-100">
        {totalCount > 0
          ? `${totalCount} Comment${totalCount !== 1 ? "s" : ""}`
          : "Comments"}
      </h2>

      <div className="mb-10 rounded-xl border border-slate-800 bg-slate-900/40 p-5">
        <p className="mb-4 text-sm font-medium text-slate-400">Leave a comment</p>
        <CommentForm postId={postId} onSubmitted={handleRootSubmit} />
      </div>

      {loading && (
        <div className="flex justify-center py-8">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
        </div>
      )}

      {error && (
        <p className="text-sm text-red-400">Could not load comments: {error}</p>
      )}

      {!loading && !error && comments.length === 0 && (
        <p className="py-4 text-center text-sm text-slate-600">
          No comments yet — be the first to share your thoughts.
        </p>
      )}

      {!loading && !error && comments.length > 0 && (
        <div className="space-y-4">
          {comments.map((comment) => (
            <CommentNode
              key={comment.id}
              comment={comment}
              postId={postId}
              depth={0}
              onNewReply={insertReply}
            />
          ))}
        </div>
      )}
    </section>
  );
};
