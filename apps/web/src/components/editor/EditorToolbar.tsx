import React, { useEffect, useRef, useState } from "react";
import type { Editor } from "@tiptap/react";
import { MediaPickerModal } from "./MediaPickerModal.js";
import type { ImageSelection } from "./MediaPickerModal.js";
import { mediaApi, pagesApi, resolveMediaUrl } from "../../lib/api.js";
import type { Page } from "../../types/index.js";

type Props = { editor: Editor };

const Sep = () => <div className="w-px self-stretch bg-slate-700 mx-1" />;

type BtnProps = {
  active?: boolean;
  disabled?: boolean;
  title: string;
  onClick: () => void;
  children: React.ReactNode;
  className?: string;
};

const Btn: React.FC<BtnProps> = ({
  active = false, disabled = false, title, onClick, children, className = "",
}) => (
  <button
    type="button"
    title={title}
    disabled={disabled}
    onMouseDown={(e) => { e.preventDefault(); onClick(); }}
    className={[
      "flex h-7 min-w-[1.75rem] items-center justify-center rounded px-1.5",
      "text-sm transition-colors select-none whitespace-nowrap",
      active   ? "bg-brand-600 text-white" : "text-slate-300 hover:bg-slate-700 hover:text-white",
      disabled ? "opacity-30 pointer-events-none" : "",
      className,
    ].join(" ")}
  >
    {children}
  </button>
);

const Icon: React.FC<{ d: string; size?: number }> = ({ d, size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
);

const icons = {
  undo:       "M3 7v6h6M3.51 15a9 9 0 1 0 .49-3",
  redo:       "M21 7v6h-6M20.49 15a9 9 0 1 1-.49-3",
  bold:       "M6 4h8a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6zM6 12h9a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z",
  italic:     "M19 4h-9M14 20H5M15 4 9 20",
  underline:  "M6 3v7a6 6 0 0 0 6 6 6 6 0 0 0 6-6V3M4 21h16",
  strike:     "M16 4H9a3 3 0 0 0-2.83 4M14 12H5m10 0a3 3 0 0 1 0 6H6",
  code:       "m16 18 6-6-6-6M8 6l-6 6 6 6",
  link:       "M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71",
  unlink:     "M18.84 12.25l1.72-1.71a4.87 4.87 0 1 0-6.88-6.9l-1.72 1.72M6.15 11.74l-1.72 1.71a4.87 4.87 0 1 0 6.88 6.9l1.72-1.72M5 5l14 14",
  image:      "M21 15l-5-5L5 21M3 3h18v18H3zM8.5 10a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3",
  quote:      "M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1zm12 0c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3c0 1 0 1 1 1z",
  codeblock:  "M10 20l4-16M6.04 9 2 12l4.04 3M17.96 9 22 12l-4.04 3",
  hr:         "M3 12h18",
  bullet:     "M9 6h11M9 12h11M9 18h11M5 6v.01M5 12v.01M5 18v.01",
  ordered:    "M10 6h11M10 12h11M10 18h11M4 6h1v4M4 10h2M6 18H4c0-1 2-2 2-3s-1-1.5-2-1",
  indent:     "M3 8h13M3 16h13M19 4v16M19 12l-4-4M19 12l-4 4",
  outdent:    "M11 8h10M11 16h10M3 4v16M3 12l4-4M3 12l4 4",
  alignL:     "M3 6h18M3 12h12M3 18h15",
  alignC:     "M3 6h18M6 12h12M4.5 18h15",
  alignR:     "M3 6h18M9 12h12M6 18h15",
  alignJ:     "M3 6h18M3 12h18M3 18h18",
  sub:        "M4 5l8 8m-8 0 8-8M20 21h-4c0-1.5.44-2 1.5-2.5S20 17.33 20 17c0-.47-.17-.93-.52-1.24a2 2 0 0 0-2.74.14",
  sup:        "M4 19l8-8m-8 0 8 8M20 3h-4c0-1.5.44-2 1.5-2.5S20-.67 20-1c0-.47-.17-.93-.52-1.24a2 2 0 0 0-2.74.14",
  clearfmt:   "M4 7V4h16v3M9 20h6M12 4v16M5 3 19 17",
  table:      "M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z",
  video:      "M15 10l4.553-2.277A1 1 0 0 1 21 8.68v6.641a1 1 0 0 1-1.447.894L15 14M3 8a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z",
  file:       "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M16 13H8M16 17H8M10 9H8",
  markdown:   "M3 5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h18a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2H3zm3 7l2 2 2-2m2 0v-4m2 4l2-2 2 2",
  addRow:     "M12 5v14M5 12h14",
  delRow:     "M5 12h14",
};

type BlockVal = "paragraph" | "h1" | "h2" | "h3" | "h4";

const getBlock = (editor: Editor): BlockVal => {
  if (editor.isActive("heading", { level: 1 })) return "h1";
  if (editor.isActive("heading", { level: 2 })) return "h2";
  if (editor.isActive("heading", { level: 3 })) return "h3";
  if (editor.isActive("heading", { level: 4 })) return "h4";
  return "paragraph";
};

const applyBlock = (editor: Editor, val: BlockVal) => {
  const c = editor.chain().focus();
  if (val === "paragraph") c.setParagraph().run();
  else if (val === "h1") c.toggleHeading({ level: 1 }).run();
  else if (val === "h2") c.toggleHeading({ level: 2 }).run();
  else if (val === "h3") c.toggleHeading({ level: 3 }).run();
  else if (val === "h4") c.toggleHeading({ level: 4 }).run();
};

const FONT_FAMILIES = [
  { label: "Default",         value: "" },
  { label: "Inter",           value: "Inter, sans-serif" },
  { label: "Georgia",         value: "Georgia, serif" },
  { label: "Times New Roman", value: "'Times New Roman', serif" },
  { label: "JetBrains Mono",  value: "'JetBrains Mono', monospace" },
  { label: "Courier New",     value: "'Courier New', monospace" },
] as const;

const FONT_SIZES = ["10px","12px","14px","16px","18px","20px","24px","28px","32px","36px","48px","64px"] as const;

type ColorBtnProps = {
  title: string; color: string;
  onChange: (color: string) => void;
  label: React.ReactNode; swatchColor?: string;
};

const ColorBtn: React.FC<ColorBtnProps> = ({ title, color, onChange, label, swatchColor }) => {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div className="relative flex flex-col items-center">
      <button
        type="button" title={title}
        onMouseDown={(e) => { e.preventDefault(); ref.current?.click(); }}
        className="flex h-7 min-w-[1.75rem] flex-col items-center justify-center rounded px-1.5
                   text-sm text-slate-300 hover:bg-slate-700 hover:text-white transition-colors select-none"
      >
        <span className="leading-none">{label}</span>
        <span className="mt-0.5 h-1 w-4 rounded-sm" style={{ backgroundColor: swatchColor ?? color }} />
      </button>
      <input ref={ref} type="color" value={color} onChange={(e) => onChange(e.target.value)}
        className="absolute opacity-0 h-0 w-0 pointer-events-none" tabIndex={-1} />
    </div>
  );
};

const LinkPopover: React.FC<{ editor: Editor }> = ({ editor }) => {
  const [open, setOpen]   = useState(false);
  const [tab, setTab]     = useState<"url" | "pages">("url");
  const [url, setUrl]     = useState("");
  const [pages, setPages] = useState<Pick<Page, "id" | "slug" | "title">[]>([]);
  const isActive = editor.isActive("link");

  // Lazy-load pages once when the popover opens on the Pages tab
  useEffect(() => {
    if (open && tab === "pages" && pages.length === 0) {
      pagesApi.list().then(({ data }) =>
        setPages(data.map((p) => ({ id: p.id, slug: p.slug, title: p.title })))
      ).catch(() => {/* ignore */});
    }
  }, [open, tab, pages.length]);

  const apply = (href: string) => {
    if (!href.trim()) return;
    editor.chain().focus().extendMarkRange("link").setLink({ href: href.trim() }).run();
    setOpen(false); setUrl("");
  };

  const remove = () => { editor.chain().focus().unsetLink().run(); setOpen(false); };

  const handleOpen = () => {
    if (isActive) { remove(); return; }
    setUrl((editor.getAttributes("link")["href"] as string | undefined) ?? "https://");
    setTab("url");
    setOpen((v) => !v);
  };

  return (
    <div className="relative">
      <Btn active={isActive} title={isActive ? "Remove link" : "Insert link"} onClick={handleOpen}>
        <Icon d={isActive ? icons.unlink : icons.link} />
      </Btn>
      {open && (
        <div
          className="absolute top-9 left-0 z-50 w-72 rounded-lg border border-slate-600 bg-slate-800 shadow-xl"
          onMouseDown={(e) => e.preventDefault()}
        >
          {/* Tab bar */}
          <div className="flex border-b border-slate-700">
            {(["url", "pages"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                className={[
                  "flex-1 py-1.5 text-xs font-medium capitalize transition-colors",
                  tab === t ? "text-brand-400 border-b-2 border-brand-500" : "text-slate-500 hover:text-slate-300",
                ].join(" ")}
              >
                {t === "url" ? "URL" : "Pages"}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="px-2 text-slate-500 hover:text-white"
            >✕</button>
          </div>

          {/* URL tab */}
          {tab === "url" && (
            <div className="flex items-center gap-1.5 p-2">
              <input
                autoFocus
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") apply(url); if (e.key === "Escape") setOpen(false); }}
                placeholder="https://example.com"
                className="flex-1 rounded border border-slate-600 bg-slate-900 px-2 py-1 text-xs
                           text-slate-200 placeholder-slate-500 focus:border-brand-500 focus:outline-none"
              />
              <button type="button" onClick={() => apply(url)}
                className="rounded bg-brand-600 px-2 py-1 text-xs font-medium text-white hover:bg-brand-700">
                Apply
              </button>
            </div>
          )}

          {/* Pages tab */}
          {tab === "pages" && (
            <div className="max-h-52 overflow-y-auto py-1">
              {pages.length === 0 && (
                <p className="px-3 py-4 text-center text-xs text-slate-600">Loading pages…</p>
              )}
              {pages.map((page) => (
                <button
                  key={page.id}
                  type="button"
                  onClick={() => apply(`/${page.slug}`)}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs
                             text-slate-300 hover:bg-slate-700 transition-colors"
                >
                  <span className="text-slate-600">☰</span>
                  <span className="flex-1 truncate">{page.title}</span>
                  <span className="shrink-0 text-slate-600">/{page.slug}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const MarkdownImport: React.FC<{ editor: Editor }> = ({ editor }) => {
  const [open, setOpen] = useState(false);
  const [md, setMd]     = useState("");
  const [busy, setBusy] = useState(false);

  const apply = async () => {
    if (!md.trim()) return;
    setBusy(true);
    const { marked } = await import("marked");
    const html = await marked(md);
    editor.commands.setContent(html);
    setOpen(false);
    setMd("");
    setBusy(false);
  };

  return (
    <div className="relative">
      <Btn title="Import Markdown" onClick={() => setOpen(true)}>
        <Icon d={icons.markdown} />
      </Btn>
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
          onMouseDown={() => setOpen(false)}
        >
          <div
            className="relative flex w-full max-w-xl flex-col rounded-xl border border-slate-700 bg-slate-900 shadow-2xl"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-800 px-5 py-3.5">
              <h2 className="text-sm font-semibold text-slate-200">Import Markdown</h2>
              <button type="button" onClick={() => setOpen(false)}
                className="text-slate-500 hover:text-white text-lg leading-none">✕</button>
            </div>
            <div className="p-5">
              <p className="mb-3 text-xs text-slate-500">
                Paste Markdown below. This will <strong className="text-slate-300">replace</strong> the current content.
              </p>
              <textarea
                autoFocus
                value={md}
                onChange={(e) => setMd(e.target.value)}
                rows={12}
                placeholder="# Heading&#10;&#10;Paragraph with **bold** and *italic*…"
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2.5
                           font-mono text-xs text-slate-100 placeholder-slate-600
                           focus:border-brand-500 focus:outline-none resize-y"
              />
              <div className="mt-3 flex gap-2 justify-end">
                <button type="button" onClick={() => setOpen(false)}
                  className="rounded-lg px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors">
                  Cancel
                </button>
                <button type="button" onClick={() => void apply()} disabled={busy || !md.trim()}
                  className="rounded-lg bg-brand-600 px-5 py-2 text-sm font-semibold text-white
                             hover:bg-brand-700 disabled:opacity-40 transition-colors">
                  {busy ? "Importing…" : "Import"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const FileUploadBtn: React.FC<{ editor: Editor }> = ({ editor }) => {
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    setUploading(true);
    try {
      const { data } = await mediaApi.upload(file);
      const resolved = resolveMediaUrl(data.url);
      const isImg = data.mimeType?.startsWith("image/");
      if (isImg) {
        editor.chain().focus().setImage({ src: resolved, alt: file.name }).run();
      } else {
        editor.chain().focus().insertContent({
          type: "fileAttachment",
          attrs: {
            href:     resolved,
            filename: data.originalName ?? file.name,
            size:     data.size,
            mimeType: data.mimeType ?? file.type,
          },
        }).run();
      }
    } catch {
      // silently ignore upload errors
    } finally {
      setUploading(false);
    }
  };

  return (
    <>
      <Btn
        title="Upload file or image"
        disabled={uploading}
        onClick={() => inputRef.current?.click()}
      >
        {uploading
          ? <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
          : <Icon d={icons.file} />}
      </Btn>
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void handleFile(f);
          e.target.value = "";
        }}
      />
    </>
  );
};

const TableOps: React.FC<{ editor: Editor }> = ({ editor }) => {
  const [open, setOpen] = useState(false);
  const inTable = editor.isActive("table");

  if (!inTable) return null;

  const ops: { label: string; action: () => void }[] = [
    { label: "Add row above",    action: () => editor.chain().focus().addRowBefore().run() },
    { label: "Add row below",    action: () => editor.chain().focus().addRowAfter().run() },
    { label: "Delete row",       action: () => editor.chain().focus().deleteRow().run() },
    { label: "Add column left",  action: () => editor.chain().focus().addColumnBefore().run() },
    { label: "Add column right", action: () => editor.chain().focus().addColumnAfter().run() },
    { label: "Delete column",    action: () => editor.chain().focus().deleteColumn().run() },
    { label: "Toggle header row",action: () => editor.chain().focus().toggleHeaderRow().run() },
    { label: "Delete table",     action: () => editor.chain().focus().deleteTable().run() },
  ];

  return (
    <div className="relative">
      <Btn active title="Table operations" onClick={() => setOpen((v) => !v)}>
        <Icon d={icons.table} />
        <span className="ml-0.5 text-xs">▾</span>
      </Btn>
      {open && (
        <div
          className="absolute top-9 left-0 z-50 w-44 overflow-hidden rounded-lg
                     border border-slate-700 bg-slate-800 shadow-xl"
          onMouseDown={(e) => e.preventDefault()}
        >
          {ops.map(({ label, action }) => (
            <button
              key={label}
              type="button"
              onMouseDown={(e) => { e.preventDefault(); action(); setOpen(false); }}
              className="flex w-full items-center px-3 py-2 text-xs text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
            >
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export const EditorToolbar: React.FC<Props> = ({ editor }) => {
  const [textColor, setTextColor]         = useState("#e2e8f0");
  const [hlColor, setHlColor]             = useState("#fbbf24");
  const [showMediaPicker, setMediaPicker] = useState(false);

  const applyTextColor = (c: string) => { setTextColor(c); editor.chain().focus().setColor(c).run(); };
  const applyHighlight = (c: string) => { setHlColor(c);   editor.chain().focus().setHighlight({ color: c }).run(); };

  const currentFamily = (editor.getAttributes("textStyle")["fontFamily"] as string | undefined) ?? "";
  const currentSize   = (editor.getAttributes("textStyle")["fontSize"]   as string | undefined) ?? "";

  return (
    <div className="sticky top-0 z-20 flex flex-wrap items-center gap-0.5
                    border-b border-slate-700 bg-slate-900 px-2 py-1.5 rounded-t-lg">

      <Btn title="Undo (Ctrl+Z)" disabled={!editor.can().undo()} onClick={() => editor.chain().focus().undo().run()}>
        <Icon d={icons.undo} />
      </Btn>
      <Btn title="Redo (Ctrl+Y)" disabled={!editor.can().redo()} onClick={() => editor.chain().focus().redo().run()}>
        <Icon d={icons.redo} />
      </Btn>

      <Sep />

      <select value={getBlock(editor)} onChange={(e) => applyBlock(editor, e.target.value as BlockVal)}
        className="h-7 rounded border border-slate-700 bg-slate-800 px-1.5 text-xs text-slate-200 focus:outline-none cursor-pointer">
        <option value="paragraph">Normal</option>
        <option value="h1">Heading 1</option>
        <option value="h2">Heading 2</option>
        <option value="h3">Heading 3</option>
        <option value="h4">Heading 4</option>
      </select>

      <Sep />

      <select value={currentFamily}
        onChange={(e) => {
          const val = e.target.value;
          if (val) editor.chain().focus().setFontFamily(val).run();
          else editor.chain().focus().unsetFontFamily().run();
        }}
        className="h-7 rounded border border-slate-700 bg-slate-800 px-1.5 text-xs text-slate-200 focus:outline-none cursor-pointer max-w-[130px]">
        {FONT_FAMILIES.map(({ label, value }) => (
          <option key={label} value={value}>{label}</option>
        ))}
      </select>

      <select value={currentSize}
        onChange={(e) => {
          const val = e.target.value;
          if (val) editor.chain().focus().setFontSize(val).run();
          else editor.chain().focus().unsetFontSize().run();
        }}
        className="h-7 w-[72px] rounded border border-slate-700 bg-slate-800 px-1.5 text-xs text-slate-200 focus:outline-none cursor-pointer">
        <option value="">Size</option>
        {FONT_SIZES.map((s) => (
          <option key={s} value={s}>{s.replace("px", "")}</option>
        ))}
      </select>

      <Sep />

      <Btn active={editor.isActive("bold")}      onClick={() => editor.chain().focus().toggleBold().run()}      title="Bold (Ctrl+B)">      <Icon d={icons.bold} /></Btn>
      <Btn active={editor.isActive("italic")}    onClick={() => editor.chain().focus().toggleItalic().run()}    title="Italic (Ctrl+I)">    <Icon d={icons.italic} /></Btn>
      <Btn active={editor.isActive("underline")} onClick={() => editor.chain().focus().toggleUnderline().run()} title="Underline (Ctrl+U)"> <Icon d={icons.underline} /></Btn>
      <Btn active={editor.isActive("strike")}    onClick={() => editor.chain().focus().toggleStrike().run()}    title="Strikethrough">      <Icon d={icons.strike} /></Btn>
      <Btn active={editor.isActive("subscript")}   onClick={() => editor.chain().focus().toggleSubscript().run()}   title="Subscript">   <Icon d={icons.sub} /></Btn>
      <Btn active={editor.isActive("superscript")} onClick={() => editor.chain().focus().toggleSuperscript().run()} title="Superscript"> <Icon d={icons.sup} /></Btn>
      <Btn active={editor.isActive("code")}     onClick={() => editor.chain().focus().toggleCode().run()}     title="Inline code">  <Icon d={icons.code} /></Btn>

      <Sep />

      <ColorBtn title="Text color" color={textColor} swatchColor={textColor} onChange={applyTextColor}
        label={<span className="font-bold text-sm">A</span>} />
      <ColorBtn title="Highlight" color={hlColor} swatchColor={hlColor} onChange={applyHighlight}
        label={<span className="text-sm font-bold" style={{ background: "linear-gradient(transparent 60%,#fbbf24 60%)" }}>H</span>} />
      <Btn title="Remove all color" onClick={() => editor.chain().focus().unsetColor().unsetHighlight().run()}>
        <span className="text-xs">✕A</span>
      </Btn>

      <Sep />

      <Btn active={editor.isActive({ textAlign: "left" })}    onClick={() => editor.chain().focus().setTextAlign("left").run()}    title="Align left">    <Icon d={icons.alignL} /></Btn>
      <Btn active={editor.isActive({ textAlign: "center" })}  onClick={() => editor.chain().focus().setTextAlign("center").run()}  title="Align center">  <Icon d={icons.alignC} /></Btn>
      <Btn active={editor.isActive({ textAlign: "right" })}   onClick={() => editor.chain().focus().setTextAlign("right").run()}   title="Align right">   <Icon d={icons.alignR} /></Btn>
      <Btn active={editor.isActive({ textAlign: "justify" })} onClick={() => editor.chain().focus().setTextAlign("justify").run()} title="Justify">       <Icon d={icons.alignJ} /></Btn>

      <Sep />

      <Btn active={editor.isActive("bulletList")}  onClick={() => editor.chain().focus().toggleBulletList().run()}  title="Bullet list">  <Icon d={icons.bullet} /></Btn>
      <Btn active={editor.isActive("orderedList")} onClick={() => editor.chain().focus().toggleOrderedList().run()} title="Ordered list"> <Icon d={icons.ordered} /></Btn>
      <Btn title="Increase indent" disabled={!editor.can().sinkListItem("listItem")}
        onClick={() => editor.chain().focus().sinkListItem("listItem").run()}>
        <Icon d={icons.indent} />
      </Btn>
      <Btn title="Decrease indent" disabled={!editor.can().liftListItem("listItem")}
        onClick={() => editor.chain().focus().liftListItem("listItem").run()}>
        <Icon d={icons.outdent} />
      </Btn>

      <Sep />

      <LinkPopover editor={editor} />

      <Btn title="Insert image" onClick={() => setMediaPicker(true)}>
        <Icon d={icons.image} />
      </Btn>
      {showMediaPicker && (
        <MediaPickerModal
          imagesOnly
          onSelectImage={(sel: ImageSelection) => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (editor.chain().focus() as any).setImage({ src: sel.url, alt: sel.alt, caption: sel.caption }).run();
          }}
          onClose={() => setMediaPicker(false)}
        />
      )}

      <Btn title="Insert video embed (YouTube / Vimeo)"
        onClick={() => editor.chain().focus().insertContent({ type: "videoEmbed", attrs: { src: "" } }).run()}>
        <Icon d={icons.video} />
      </Btn>

      <FileUploadBtn editor={editor} />

      <Btn title="Insert table (3×3)"
        onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}>
        <Icon d={icons.table} />
      </Btn>

      <CalloutMenu editor={editor} />

      <Btn active={editor.isActive("blockquote")} onClick={() => editor.chain().focus().toggleBlockquote().run()} title="Blockquote">
        <Icon d={icons.quote} />
      </Btn>
      <Btn active={editor.isActive("codeBlock")} onClick={() => editor.chain().focus().toggleCodeBlock().run()} title="Code block">
        <Icon d={icons.codeblock} />
      </Btn>
      <Btn title="Horizontal rule" onClick={() => editor.chain().focus().setHorizontalRule().run()}>
        <Icon d={icons.hr} />
      </Btn>

      <Sep />

      <TableOps editor={editor} />
      {editor.isActive("table") && <Sep />}

      <MarkdownImport editor={editor} />

      <Sep />

      <Btn title="Clear all formatting" onClick={() => editor.chain().focus().clearNodes().unsetAllMarks().run()}>
        <Icon d={icons.clearfmt} />
      </Btn>
    </div>
  );
};

const CALLOUT_TYPES = [
  { type: "info",    icon: "ℹ", label: "Info",    color: "text-blue-400" },
  { type: "warning", icon: "⚠", label: "Warning", color: "text-yellow-400" },
  { type: "danger",  icon: "✕", label: "Danger",  color: "text-red-400" },
  { type: "tip",     icon: "✓", label: "Tip",     color: "text-emerald-400" },
] as const;

const CalloutMenu: React.FC<{ editor: Editor }> = ({ editor }) => {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <Btn
        active={editor.isActive("callout")}
        title="Insert callout block"
        onClick={() => setOpen((v) => !v)}
      >
        <span className="text-xs font-bold">!</span>
        <span className="ml-0.5 text-xs">▾</span>
      </Btn>
      {open && (
        <div
          className="absolute top-9 left-0 z-50 w-36 overflow-hidden rounded-lg
                     border border-slate-700 bg-slate-800 shadow-xl"
          onMouseDown={(e) => e.preventDefault()}
        >
          {CALLOUT_TYPES.map(({ type, icon, label, color }) => (
            <button
              key={type}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                editor.chain().focus().insertContent({
                  type: "callout",
                  attrs: { calloutType: type },
                  content: [{ type: "paragraph" }],
                }).run();
                setOpen(false);
              }}
              className="flex w-full items-center gap-2 px-3 py-2 text-xs text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
            >
              <span className={color}>{icon}</span>
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
