import React, { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { postsApi } from "../lib/api.js";
import type { Post, Tag } from "../types/index.js";
import type { CardStyle, SidebarWidget } from "../types/index.js";
import { DEFAULT_SIDEBAR_WIDGETS } from "../types/index.js";
import { Layout } from "../components/common/Layout.js";
import { useTheme } from "../context/ThemeContext.js";
import { readingTimeLabel } from "../lib/readingTime.js";
import { Sk } from "../components/common/Skeleton.js";

const BlogFeedPage: React.FC = () => {
  const [posts, setPosts]           = useState<Post[]>([]);
  const [loading, setLoading]       = useState(true);
  const [showSkeleton, setShowSkeleton] = useState(false);
  const [error, setError]           = useState<string | null>(null);
  const [searchQuery, setSearch]    = useState("");
  const [searchResults, setResults] = useState<Post[] | null>(null);
  const [searching, setSearching]   = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Only reveal the skeleton if the API hasn't responded within 150 ms.
  // Fast responses skip the skeleton entirely; posts just fade in.
  useEffect(() => {
    if (!loading) { setShowSkeleton(false); return; }
    const t = setTimeout(() => setShowSkeleton(true), 150);
    return () => clearTimeout(t);
  }, [loading]);

  const { savedTheme, savedBrand } = useTheme();
  const { cardStyle, showSidebar, sidebarWidgets } = savedTheme.layout;
  const widgets = sidebarWidgets ?? DEFAULT_SIDEBAR_WIDGETS;

  useEffect(() => {
    postsApi
      .list({ limit: 20 })
      .then(({ data }) => setPosts(data))
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  // Debounced search
  const handleSearch = (q: string) => {
    setSearch(q);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!q.trim()) { setResults(null); return; }
    setSearching(true);
    debounceRef.current = setTimeout(() => {
      postsApi.search(q)
        .then(({ data }) => setResults(data))
        .catch(() => setResults([]))
        .finally(() => setSearching(false));
    }, 300);
  };

  // Collect unique tags from fetched posts for the sidebar
  const uniqueTags: Tag[] = [
    ...new Map(
      posts.flatMap(({ tags }) => tags.map(({ tag }) => [tag.id, tag] as [string, Tag]))
    ).values(),
  ];

  // What to render in the feed column
  const displayPosts = searchResults ?? posts;
  const isSearchActive = searchQuery.trim().length > 0;

  return (
    <Layout>
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-4xl font-bold text-slate-50">{savedBrand.siteName}</h1>
          {savedBrand.tagline && (
            <p className="mt-2 text-slate-500">{savedBrand.tagline}</p>
          )}
        </div>
        {/* Search bar */}
        <div className="relative w-full max-w-xs">
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Search posts…"
            className="w-full rounded-lg border border-slate-700 bg-slate-800 py-2 pl-9 pr-3
                       text-sm text-slate-200 placeholder-slate-600
                       focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">⌕</span>
          {searching && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2">
              <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
            </span>
          )}
        </div>
      </div>

      {showSkeleton && (
        <div className="flex flex-col gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-slate-800 p-5"
                 style={{ backgroundColor: "rgb(var(--color-surface-rgb) / 0.6)" }}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 space-y-2">
                  <div className="flex gap-2">
                    <Sk className="h-4 w-16 rounded-full" />
                    <Sk className="h-4 w-20" />
                  </div>
                  <Sk className="h-5 w-2/3" />
                  <Sk className="h-3.5 w-full" />
                </div>
                <div className="shrink-0 space-y-1.5 text-right">
                  <Sk className="h-3.5 w-16" />
                  <Sk className="h-3.5 w-10" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {error && (
        <p className="rounded-lg bg-red-900/30 border border-red-800 px-4 py-3 text-red-400">
          {error}
        </p>
      )}

      {!loading && !isSearchActive && posts.length === 0 && !error && (
        <p className="text-slate-500 text-center py-20">No published posts yet.</p>
      )}

      {isSearchActive && !searching && searchResults?.length === 0 && (
        <p className="text-slate-500 text-center py-20">No posts match &ldquo;{searchQuery}&rdquo;.</p>
      )}

      {displayPosts.length > 0 && (
        <div className={`admin-page-enter ${showSidebar ? "flex gap-8 items-start" : ""}`}>
          <div className="flex-1 min-w-0">
            <div className={cardStyle === "grid" ? "grid sm:grid-cols-2 gap-6" : "flex flex-col gap-4"}>
              {displayPosts.map((post) => (
                <PostCard key={post.id} post={post} layout={cardStyle} />
              ))}
            </div>
          </div>

          {showSidebar && (
            <aside className="w-60 shrink-0 space-y-5 sticky top-24">
              {widgets
                .filter((w) => w.enabled)
                .map((widget) => (
                  <SidebarWidgetRenderer
                    key={widget.id}
                    widget={widget}
                    tags={uniqueTags}
                    posts={posts}
                  />
                ))}
            </aside>
          )}
        </div>
      )}
    </Layout>
  );
};

type PostCardProps = { post: Post; layout: CardStyle };

const articleBase = {
  onMouseEnter: (e: React.MouseEvent<HTMLElement>) => {
    e.currentTarget.style.backgroundColor = "var(--color-surface)";
  },
  onMouseLeave: (e: React.MouseEvent<HTMLElement>) => {
    e.currentTarget.style.backgroundColor = "rgb(var(--color-surface-rgb) / 0.6)";
  },
} as const;

const PostCard: React.FC<PostCardProps> = ({ post, layout }) => {
  const navigate = useNavigate();
  const date = new Date(post.publishedAt ?? post.createdAt).toLocaleDateString("en-US", {
    year: "numeric", month: "short", day: "numeric",
  });
  const firstTag = post.tags[0]?.tag;
  const readTime = readingTimeLabel(post.content);

  const goToPost = (e: React.MouseEvent) => {
    e.preventDefault();
    React.startTransition(() => navigate(`/posts/${post.slug}`));
  };

  if (layout === "grid") {
    return (
      <article
        {...articleBase}
        className="group rounded-xl border border-slate-800 overflow-hidden hover:border-slate-700 transition-all"
        style={{ backgroundColor: "rgb(var(--color-surface-rgb) / 0.6)" }}
      >
        {/* Gradient thumbnail */}
        <div
          className="relative h-32 w-full"
          style={{
            background:
              "linear-gradient(135deg, rgb(var(--color-primary-rgb) / 0.3), rgb(var(--color-surface-rgb) / 0.9))",
          }}
        >
          {post.featured && (
            <span className="absolute top-2 left-2 text-xs font-semibold text-amber-400 bg-amber-900/60 px-2 py-0.5 rounded-full">
              ★ Featured
            </span>
          )}
        </div>
        <div className="p-4">
          <div className="flex items-center gap-2 mb-2">
            {firstTag && (
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full text-brand-500 bg-brand-900">
                {firstTag.name}
              </span>
            )}
            <time className="text-xs text-slate-600">{date}</time>
            <span className="text-xs text-slate-600">{readTime}</span>
          </div>

          <Link to={`/posts/${post.slug}`} onClick={goToPost}>
            <h2 className="font-semibold text-slate-100 group-hover:text-white transition-colors line-clamp-2 leading-snug">
              {post.title}
            </h2>
          </Link>

          {post.excerpt && (
            <p className="mt-2 text-sm text-slate-400 line-clamp-2">{post.excerpt}</p>
          )}

          <Link
            to={`/posts/${post.slug}`}
            onClick={goToPost}
            className="inline-block mt-3 text-xs font-semibold text-brand-500 hover:text-brand-400 transition-colors"
          >
            Read more →
          </Link>
        </div>
      </article>
    );
  }

  // List layout
  return (
    <article
      {...articleBase}
      className="group rounded-xl border border-slate-800 p-5 hover:border-slate-700 transition-all"
      style={{ backgroundColor: "rgb(var(--color-surface-rgb) / 0.6)" }}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            {post.featured && (
              <span className="text-xs font-semibold text-amber-400">★ Featured</span>
            )}
            {firstTag && (
              <span className="text-xs font-semibold text-brand-500">{firstTag.name}</span>
            )}
            {post.tags.length > 1 && (
              <span className="text-xs text-slate-600">+{post.tags.length - 1}</span>
            )}
          </div>

          <Link to={`/posts/${post.slug}`} onClick={goToPost}>
            <h2 className="text-lg font-semibold text-slate-100 group-hover:text-white transition-colors truncate">
              {post.title}
            </h2>
          </Link>

          {post.excerpt && (
            <p className="mt-1 text-sm text-slate-400 line-clamp-1">{post.excerpt}</p>
          )}
        </div>

        <div className="shrink-0 flex flex-col items-end gap-1 mt-1">
          <time className="text-xs text-slate-600">{date}</time>
          <span className="text-xs text-slate-600">{readTime}</span>
        </div>
      </div>
    </article>
  );
};

const sidebarCard = {
  className: "rounded-xl border border-slate-800 p-4",
  style: { backgroundColor: "rgb(var(--color-surface-rgb) / 0.6)" },
} as const;

type WidgetProps = {
  widget: SidebarWidget;
  tags:   Tag[];
  posts:  Post[];
};

const SidebarWidgetRenderer: React.FC<WidgetProps> = ({ widget, tags, posts }) => {
  switch (widget.type) {
    case "about":
      return (
        <div {...sidebarCard}>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
            {widget.title}
          </h3>
          <p className="text-sm leading-relaxed text-slate-400">
            {widget.text ?? "A blog built with Chronos CMS."}
          </p>
        </div>
      );

    case "tags":
      if (tags.length === 0) return null;
      return (
        <div {...sidebarCard}>
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
            {widget.title}
          </h3>
          <div className="flex flex-wrap gap-2">
            {tags.map((tag) => (
              <span
                key={tag.id}
                className="rounded-full bg-slate-800 px-2.5 py-0.5 text-xs font-medium
                           text-slate-400 hover:bg-brand-900 hover:text-brand-500 transition-colors cursor-default"
              >
                {tag.name}
              </span>
            ))}
          </div>
        </div>
      );

    case "recent_posts": {
      const recent = posts.slice(0, widget.count ?? 5);
      if (recent.length === 0) return null;
      return (
        <div {...sidebarCard}>
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
            {widget.title}
          </h3>
          <ul className="space-y-2">
            {recent.map((post) => (
              <li key={post.id}>
                <Link
                  to={`/posts/${post.slug}`}
                  className="text-sm text-slate-400 hover:text-slate-200 transition-colors line-clamp-2 leading-snug"
                >
                  {post.title}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      );
    }

    case "social_links": {
      const links = (widget.links ?? []).filter((l) => l.url);
      if (links.length === 0) return null;
      return (
        <div {...sidebarCard}>
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
            {widget.title}
          </h3>
          <div className="flex flex-wrap gap-2">
            {links.map(({ platform, url }) => (
              <a
                key={platform}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs font-medium
                           capitalize text-slate-400 hover:border-brand-500 hover:text-brand-400 transition-colors"
              >
                {platform}
              </a>
            ))}
          </div>
        </div>
      );
    }

    case "custom_text":
      if (!widget.text) return null;
      return (
        <div {...sidebarCard}>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
            {widget.title}
          </h3>
          <p className="text-sm leading-relaxed text-slate-400 whitespace-pre-wrap">
            {widget.text}
          </p>
        </div>
      );

    default:
      return null;
  }
};

export default BlogFeedPage;
