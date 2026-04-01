// Database Seed (i18n edition)
// Creates: Admin user · Tags · Featured showcase post (EN + FR) · About page (EN + FR)
//
// The demo content exercises every editor node type:
//   headings H2–H3 · inline marks · code blocks · callout blocks (all 4 types)
//   tables · video embed · file attachment · blockquote · lists · HR

import { PrismaClient, PostStatus } from "@prisma/client"
import bcrypt from "bcryptjs"

const prisma = new PrismaClient()

const ADMIN_EMAIL = process.env["ADMIN_EMAIL"] ?? "admin@chronos.dev"
const ADMIN_PASSWORD = process.env["ADMIN_PASSWORD"] ?? "Admin1234!"

const postContentEn = {
  type: "doc",
  content: [
    {
      type: "paragraph",
      content: [
        { type: "text", text: "Welcome to " },
        { type: "text", marks: [{ type: "bold" }], text: "Chronos CMS" },
        {
          type: "text",
          text: " — a self-hostable, open-source hybrid CMS that ships with a full admin UI, a built-in public blog, and a clean REST API. This post is a live demonstration of every content block, formatting option, and media type the editor supports. Open it in ",
        },
        { type: "text", marks: [{ type: "code" }], text: "/admin/posts" },
        {
          type: "text",
          text: " to see the source, or keep reading to explore the output.",
        },
      ],
    },

    {
      type: "callout",
      attrs: { calloutType: "info" },
      content: [
        {
          type: "paragraph",
          content: [
            {
              type: "text",
              marks: [{ type: "bold" }],
              text: "Slash commands are available everywhere. ",
            },
            { type: "text", text: "Type " },
            { type: "text", marks: [{ type: "code" }], text: "/" },
            {
              type: "text",
              text: " at the start of an empty line to open the command palette and insert any block type without leaving the keyboard.",
            },
          ],
        },
      ],
    },

    {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "Headings & Typography" }],
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "The toolbar provides four heading levels. Inline marks include ",
        },
        { type: "text", marks: [{ type: "bold" }], text: "bold" },
        { type: "text", text: ", " },
        { type: "text", marks: [{ type: "italic" }], text: "italic" },
        { type: "text", text: ", " },
        { type: "text", marks: [{ type: "underline" }], text: "underline" },
        { type: "text", text: ", " },
        { type: "text", marks: [{ type: "strike" }], text: "strikethrough" },
        { type: "text", text: ", " },
        { type: "text", marks: [{ type: "code" }], text: "inline code" },
        { type: "text", text: ", and combinations like " },
        {
          type: "text",
          marks: [{ type: "bold" }, { type: "italic" }],
          text: "bold italic",
        },
        {
          type: "text",
          text: ". Colour pickers for text and highlight are in the toolbar as well.",
        },
      ],
    },
    {
      type: "heading",
      attrs: { level: 3 },
      content: [{ type: "text", text: "Text Alignment" }],
    },
    {
      type: "paragraph",
      attrs: { textAlign: "center" },
      content: [
        {
          type: "text",
          marks: [{ type: "italic" }],
          text: "This paragraph is center-aligned. Left, right, and justify are also available.",
        },
      ],
    },

    {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "Lists" }],
    },
    {
      type: "heading",
      attrs: { level: 3 },
      content: [{ type: "text", text: "Unordered" }],
    },
    {
      type: "bulletList",
      content: [
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: "Multi-locale posts and pages — each locale gets its own title, slug, and content",
                },
              ],
            },
          ],
        },
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: "Revision history — last 10 revisions per post+locale, one-click restore",
                },
              ],
            },
          ],
        },
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [
                { type: "text", text: "Post scheduling — set " },
                {
                  type: "text",
                  marks: [{ type: "code" }],
                  text: "scheduledAt",
                },
                {
                  type: "text",
                  text: " and the API publishes automatically every 60 s",
                },
              ],
            },
          ],
        },
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: "Comment moderation — PENDING → APPROVED / SPAM / REJECTED workflow",
                },
              ],
            },
          ],
        },
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: "Webhooks with HMAC-SHA256 signing — fire on post/page create, update, publish, delete",
                },
              ],
            },
          ],
        },
      ],
    },
    {
      type: "heading",
      attrs: { level: 3 },
      content: [{ type: "text", text: "Ordered" }],
    },
    {
      type: "orderedList",
      content: [
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [
                { type: "text", text: "Clone the repo and copy " },
                {
                  type: "text",
                  marks: [{ type: "code" }],
                  text: ".env.example",
                },
                { type: "text", text: " → " },
                { type: "text", marks: [{ type: "code" }], text: ".env" },
              ],
            },
          ],
        },
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [
                { type: "text", text: "Run " },
                {
                  type: "text",
                  marks: [{ type: "code" }],
                  text: "docker compose up -d",
                },
                { type: "text", text: " (or " },
                {
                  type: "text",
                  marks: [{ type: "code" }],
                  text: "npm run db:migrate && npm run dev",
                },
                { type: "text", text: ")" },
              ],
            },
          ],
        },
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [
                { type: "text", text: "Open " },
                {
                  type: "text",
                  marks: [{ type: "code" }],
                  text: "http://localhost:5173/login",
                },
                { type: "text", text: " with the seeded admin credentials" },
              ],
            },
          ],
        },
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: "Start writing, uploading media, and publishing content",
                },
              ],
            },
          ],
        },
      ],
    },

    {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "Syntax-Highlighted Code Blocks" }],
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "Code blocks support TypeScript, JavaScript, Bash, JSON, and CSS — rendered with ",
        },
        { type: "text", marks: [{ type: "code" }], text: "lowlight" },
        { type: "text", text: " and " },
        { type: "text", marks: [{ type: "code" }], text: "highlight.js" },
        { type: "text", text: "." },
      ],
    },
    {
      type: "codeBlock",
      attrs: { language: "typescript" },
      content: [
        {
          type: "text",
          text: `// Fetch a post with French translation fallback
const res = await fetch("/posts/editor-feature-showcase?lang=fr&format=html");
const { data } = await res.json();

console.log(data.locale);          // "fr"
console.log(data.title);           // "Vitrine des Fonctionnalités…"
console.log(data.hreflang);        // [{ locale: "en", slug: "…" }, { locale: "fr", slug: "…" }]

// Generate a draft preview token (admin only)
const { data: { token } } = await previewApi.create(data.id);
window.open(\`/preview/\${token}\`, "_blank");`,
        },
      ],
    },
    {
      type: "codeBlock",
      attrs: { language: "bash" },
      content: [
        {
          type: "text",
          text: `# Quick start with Docker\ngit clone https://github.com/your-org/chronos-cms\ncd chronos-cms\ncp .env.example .env\ndocker compose up -d\n# API → http://localhost:4000\n# Web → http://localhost:5173`,
        },
      ],
    },

    {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "Callout Blocks" }],
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "Four semantic callout types help surface important information at a glance:",
        },
      ],
    },
    {
      type: "callout",
      attrs: { calloutType: "info" },
      content: [
        {
          type: "paragraph",
          content: [
            { type: "text", marks: [{ type: "bold" }], text: "Info — " },
            {
              type: "text",
              text: "Use for neutral context, background knowledge, or links to related resources.",
            },
          ],
        },
      ],
    },
    {
      type: "callout",
      attrs: { calloutType: "tip" },
      content: [
        {
          type: "paragraph",
          content: [
            { type: "text", marks: [{ type: "bold" }], text: "Tip — " },
            {
              type: "text",
              text: "Use for pro tips, shortcuts, and best-practice recommendations.",
            },
          ],
        },
      ],
    },
    {
      type: "callout",
      attrs: { calloutType: "warning" },
      content: [
        {
          type: "paragraph",
          content: [
            { type: "text", marks: [{ type: "bold" }], text: "Warning — " },
            {
              type: "text",
              text: "Use for deprecations, breaking changes, or anything that requires extra care.",
            },
          ],
        },
      ],
    },
    {
      type: "callout",
      attrs: { calloutType: "danger" },
      content: [
        {
          type: "paragraph",
          content: [
            { type: "text", marks: [{ type: "bold" }], text: "Danger — " },
            {
              type: "text",
              text: "Use for irreversible actions, data loss scenarios, or security-critical warnings.",
            },
          ],
        },
      ],
    },

    {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "Tables" }],
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "Tables support header rows, column/row add/delete, and resizable columns via the Table ops dropdown in the toolbar.",
        },
      ],
    },
    {
      type: "table",
      content: [
        {
          type: "tableRow",
          content: [
            {
              type: "tableHeader",
              attrs: { colspan: 1, rowspan: 1 },
              content: [
                {
                  type: "paragraph",
                  content: [
                    {
                      type: "text",
                      marks: [{ type: "bold" }],
                      text: "API Endpoint",
                    },
                  ],
                },
              ],
            },
            {
              type: "tableHeader",
              attrs: { colspan: 1, rowspan: 1 },
              content: [
                {
                  type: "paragraph",
                  content: [{ type: "text", marks: [{ type: "bold" }], text: "Auth" }],
                },
              ],
            },
            {
              type: "tableHeader",
              attrs: { colspan: 1, rowspan: 1 },
              content: [
                {
                  type: "paragraph",
                  content: [
                    {
                      type: "text",
                      marks: [{ type: "bold" }],
                      text: "Description",
                    },
                  ],
                },
              ],
            },
          ],
        },
        {
          type: "tableRow",
          content: [
            {
              type: "tableCell",
              attrs: { colspan: 1, rowspan: 1 },
              content: [
                {
                  type: "paragraph",
                  content: [
                    {
                      type: "text",
                      marks: [{ type: "code" }],
                      text: "GET /posts",
                    },
                  ],
                },
              ],
            },
            {
              type: "tableCell",
              attrs: { colspan: 1, rowspan: 1 },
              content: [
                {
                  type: "paragraph",
                  content: [{ type: "text", text: "Public" }],
                },
              ],
            },
            {
              type: "tableCell",
              attrs: { colspan: 1, rowspan: 1 },
              content: [
                {
                  type: "paragraph",
                  content: [
                    {
                      type: "text",
                      text: "Paginated list of published posts with locale fallback",
                    },
                  ],
                },
              ],
            },
          ],
        },
        {
          type: "tableRow",
          content: [
            {
              type: "tableCell",
              attrs: { colspan: 1, rowspan: 1 },
              content: [
                {
                  type: "paragraph",
                  content: [
                    {
                      type: "text",
                      marks: [{ type: "code" }],
                      text: "GET /posts/:slug",
                    },
                  ],
                },
              ],
            },
            {
              type: "tableCell",
              attrs: { colspan: 1, rowspan: 1 },
              content: [
                {
                  type: "paragraph",
                  content: [{ type: "text", text: "Public" }],
                },
              ],
            },
            {
              type: "tableCell",
              attrs: { colspan: 1, rowspan: 1 },
              content: [
                {
                  type: "paragraph",
                  content: [
                    {
                      type: "text",
                      text: "Single post — slug resolved across all locale translations",
                    },
                  ],
                },
              ],
            },
          ],
        },
        {
          type: "tableRow",
          content: [
            {
              type: "tableCell",
              attrs: { colspan: 1, rowspan: 1 },
              content: [
                {
                  type: "paragraph",
                  content: [
                    {
                      type: "text",
                      marks: [{ type: "code" }],
                      text: "GET /rss/fr.xml",
                    },
                  ],
                },
              ],
            },
            {
              type: "tableCell",
              attrs: { colspan: 1, rowspan: 1 },
              content: [
                {
                  type: "paragraph",
                  content: [{ type: "text", text: "Public" }],
                },
              ],
            },
            {
              type: "tableCell",
              attrs: { colspan: 1, rowspan: 1 },
              content: [
                {
                  type: "paragraph",
                  content: [
                    {
                      type: "text",
                      text: "Per-locale RSS 2.0 feed with atom:link self-reference",
                    },
                  ],
                },
              ],
            },
          ],
        },
        {
          type: "tableRow",
          content: [
            {
              type: "tableCell",
              attrs: { colspan: 1, rowspan: 1 },
              content: [
                {
                  type: "paragraph",
                  content: [
                    {
                      type: "text",
                      marks: [{ type: "code" }],
                      text: "POST /admin/posts/:id/preview",
                    },
                  ],
                },
              ],
            },
            {
              type: "tableCell",
              attrs: { colspan: 1, rowspan: 1 },
              content: [{ type: "paragraph", content: [{ type: "text", text: "JWT" }] }],
            },
            {
              type: "tableCell",
              attrs: { colspan: 1, rowspan: 1 },
              content: [
                {
                  type: "paragraph",
                  content: [
                    {
                      type: "text",
                      text: "Generate a 1-hour signed preview token for any draft",
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },

    {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "Blockquotes & Horizontal Rules" }],
    },
    {
      type: "blockquote",
      content: [
        {
          type: "paragraph",
          content: [
            {
              type: "text",
              text: "Content stored as structured JSON is the only honest way to future-proof a CMS. HTML is a presentation detail.",
            },
          ],
        },
        {
          type: "paragraph",
          content: [
            {
              type: "text",
              marks: [{ type: "italic" }],
              text: "— Chronos CMS design principle",
            },
          ],
        },
      ],
    },
    { type: "horizontalRule" },

    {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "Video Embeds" }],
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "Paste any YouTube or Vimeo URL into the video embed node and it converts to a responsive 16:9 iframe. The node stores the original URL; the embed URL is derived at render time. Click ",
        },
        { type: "text", marks: [{ type: "italic" }], text: "Edit URL" },
        {
          type: "text",
          text: " in the inline toolbar to swap the video without losing position.",
        },
      ],
    },
    {
      type: "videoEmbed",
      attrs: { src: "https://www.youtube.com/watch?v=dQw4w9WgXcQ" },
    },

    {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "Media: Images with Alt Text & Captions" }],
    },
    {
      type: "paragraph",
      content: [
        { type: "text", text: "The media picker now collects " },
        { type: "text", marks: [{ type: "bold" }], text: "alt text" },
        { type: "text", text: " (for accessibility and SEO) and an optional " },
        { type: "text", marks: [{ type: "bold" }], text: "caption" },
        { type: "text", text: " rendered as " },
        { type: "text", marks: [{ type: "code" }], text: "<figcaption>" },
        {
          type: "text",
          text: " below the image. Images can also be resized and aligned (float left/right, center, full-width) with drag handles.",
        },
      ],
    },

    {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "File Attachments" }],
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "Upload PDFs, ZIP archives, DOCX, XLSX, and more directly into the editor. They render as styled download cards with file type icon, name, and size.",
        },
      ],
    },
    {
      type: "fileAttachment",
      attrs: {
        href: "/uploads/sample-report.pdf",
        filename: "chronos-cms-technical-overview.pdf",
        size: 284672,
        mimeType: "application/pdf",
      },
    },

    {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "Internationalisation" }],
    },
    {
      type: "callout",
      attrs: { calloutType: "tip" },
      content: [
        {
          type: "paragraph",
          content: [
            { type: "text", text: "This post has an " },
            {
              type: "text",
              marks: [{ type: "bold" }],
              text: "French translation",
            },
            {
              type: "text",
              text: ". Use the language switcher on the top-right of the page, or append ",
            },
            { type: "text", marks: [{ type: "code" }], text: "?lang=fr" },
            {
              type: "text",
              text: " to the URL. Each locale has its own slug, so ",
            },
            {
              type: "text",
              marks: [{ type: "code" }],
              text: "/posts/vitrine-fonctionnalites-editeur",
            },
            { type: "text", text: " resolves directly to the French version." },
          ],
        },
      ],
    },
    {
      type: "paragraph",
      content: [
        { type: "text", text: "Every public response includes a " },
        { type: "text", marks: [{ type: "code" }], text: "hreflang[]" },
        {
          type: "text",
          text: " array for all available locale↔slug pairs — drop them straight into your ",
        },
        { type: "text", marks: [{ type: "code" }], text: "<head>" },
        { type: "text", text: " as " },
        {
          type: "text",
          marks: [{ type: "code" }],
          text: '<link rel="alternate" hreflang="…">',
        },
        { type: "text", text: " tags." },
      ],
    },

    {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "Draft Preview" }],
    },
    {
      type: "paragraph",
      content: [
        { type: "text", text: "Click " },
        { type: "text", marks: [{ type: "bold" }], text: "Preview" },
        {
          type: "text",
          text: " in the post editor to generate a one-hour signed token. The token is passed to ",
        },
        {
          type: "text",
          marks: [{ type: "code" }],
          text: "GET /preview/:token",
        },
        { type: "text", text: " — a fully public endpoint that returns " },
        { type: "text", marks: [{ type: "italic" }], text: "any" },
        {
          type: "text",
          text: " post regardless of status, so you can share a draft link with stakeholders before publishing.",
        },
      ],
    },

    { type: "horizontalRule" },
    {
      type: "paragraph",
      attrs: { textAlign: "center" },
      content: [
        {
          type: "text",
          marks: [{ type: "italic" }],
          text: "Chronos CMS — open-source, self-hosted, built with Fastify, React, TipTap, and PostgreSQL.",
        },
      ],
    },
  ],
}

const postContentFr = {
  type: "doc",
  content: [
    {
      type: "paragraph",
      content: [
        { type: "text", text: "Bienvenue sur " },
        { type: "text", marks: [{ type: "bold" }], text: "Chronos CMS" },
        {
          type: "text",
          text: " — un CMS hybride open-source auto-hébergeable livré avec une interface d'administration complète, un blog public intégré et une API REST propre. Cet article est une démonstration en direct de chaque bloc de contenu, option de formatage et type de média pris en charge par l'éditeur.",
        },
      ],
    },
    {
      type: "callout",
      attrs: { calloutType: "info" },
      content: [
        {
          type: "paragraph",
          content: [
            {
              type: "text",
              marks: [{ type: "bold" }],
              text: "Les commandes slash sont disponibles partout. ",
            },
            { type: "text", text: "Tapez " },
            { type: "text", marks: [{ type: "code" }], text: "/" },
            {
              type: "text",
              text: " en début de ligne vide pour ouvrir la palette de commandes et insérer n'importe quel bloc sans quitter le clavier.",
            },
          ],
        },
      ],
    },
    {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "Titres et Typographie" }],
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "La barre d'outils offre quatre niveaux de titres. Les marques en ligne incluent ",
        },
        { type: "text", marks: [{ type: "bold" }], text: "gras" },
        { type: "text", text: ", " },
        { type: "text", marks: [{ type: "italic" }], text: "italique" },
        { type: "text", text: ", " },
        { type: "text", marks: [{ type: "underline" }], text: "souligné" },
        { type: "text", text: ", " },
        { type: "text", marks: [{ type: "strike" }], text: "barré" },
        { type: "text", text: " et " },
        { type: "text", marks: [{ type: "code" }], text: "code en ligne" },
        { type: "text", text: "." },
      ],
    },
    {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "Blocs d'Avertissement" }],
    },
    {
      type: "callout",
      attrs: { calloutType: "tip" },
      content: [
        {
          type: "paragraph",
          content: [
            { type: "text", marks: [{ type: "bold" }], text: "Astuce — " },
            {
              type: "text",
              text: "Quatre types de callouts : info, astuce, avertissement et danger.",
            },
          ],
        },
      ],
    },
    {
      type: "callout",
      attrs: { calloutType: "warning" },
      content: [
        {
          type: "paragraph",
          content: [
            { type: "text", marks: [{ type: "bold" }], text: "Attention — " },
            {
              type: "text",
              text: "Utilisez ce bloc pour les dépréciations et les changements importants.",
            },
          ],
        },
      ],
    },
    {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "Bloc de Code" }],
    },
    {
      type: "codeBlock",
      attrs: { language: "typescript" },
      content: [
        {
          type: "text",
          text: `// Récupérer un article avec repli sur la locale par défaut\nconst res = await fetch("/posts/vitrine-fonctionnalites-editeur?lang=fr");\nconst { data } = await res.json();\nconsole.log(data.title); // "Vitrine des Fonctionnalités de l'Éditeur"`,
        },
      ],
    },
    {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "Tableau" }],
    },
    {
      type: "table",
      content: [
        {
          type: "tableRow",
          content: [
            {
              type: "tableHeader",
              attrs: { colspan: 1, rowspan: 1 },
              content: [
                {
                  type: "paragraph",
                  content: [
                    {
                      type: "text",
                      marks: [{ type: "bold" }],
                      text: "Fonctionnalité",
                    },
                  ],
                },
              ],
            },
            {
              type: "tableHeader",
              attrs: { colspan: 1, rowspan: 1 },
              content: [
                {
                  type: "paragraph",
                  content: [
                    {
                      type: "text",
                      marks: [{ type: "bold" }],
                      text: "Description",
                    },
                  ],
                },
              ],
            },
          ],
        },
        {
          type: "tableRow",
          content: [
            {
              type: "tableCell",
              attrs: { colspan: 1, rowspan: 1 },
              content: [
                {
                  type: "paragraph",
                  content: [{ type: "text", text: "Traductions dynamiques" }],
                },
              ],
            },
            {
              type: "tableCell",
              attrs: { colspan: 1, rowspan: 1 },
              content: [
                {
                  type: "paragraph",
                  content: [
                    {
                      type: "text",
                      text: "Chaque locale a son propre titre, slug et contenu",
                    },
                  ],
                },
              ],
            },
          ],
        },
        {
          type: "tableRow",
          content: [
            {
              type: "tableCell",
              attrs: { colspan: 1, rowspan: 1 },
              content: [
                {
                  type: "paragraph",
                  content: [{ type: "text", text: "Historique des révisions" }],
                },
              ],
            },
            {
              type: "tableCell",
              attrs: { colspan: 1, rowspan: 1 },
              content: [
                {
                  type: "paragraph",
                  content: [
                    {
                      type: "text",
                      text: "10 dernières révisions par article+locale, restauration en un clic",
                    },
                  ],
                },
              ],
            },
          ],
        },
        {
          type: "tableRow",
          content: [
            {
              type: "tableCell",
              attrs: { colspan: 1, rowspan: 1 },
              content: [
                {
                  type: "paragraph",
                  content: [{ type: "text", text: "Flux RSS par locale" }],
                },
              ],
            },
            {
              type: "tableCell",
              attrs: { colspan: 1, rowspan: 1 },
              content: [
                {
                  type: "paragraph",
                  content: [
                    {
                      type: "text",
                      marks: [{ type: "code" }],
                      text: "GET /rss/fr.xml",
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
    {
      type: "blockquote",
      content: [
        {
          type: "paragraph",
          content: [
            {
              type: "text",
              text: "Le contenu stocké en JSON structuré est la seule façon honnête de pérenniser un CMS. Le HTML est un détail de présentation.",
            },
          ],
        },
        {
          type: "paragraph",
          content: [
            {
              type: "text",
              marks: [{ type: "italic" }],
              text: "— Principe de conception de Chronos CMS",
            },
          ],
        },
      ],
    },
    { type: "horizontalRule" },
    {
      type: "paragraph",
      attrs: { textAlign: "center" },
      content: [
        {
          type: "text",
          marks: [{ type: "italic" }],
          text: "Chronos CMS — open-source, auto-hébergé, construit avec Fastify, React, TipTap et PostgreSQL.",
        },
      ],
    },
  ],
}

const aboutPageContentEn = {
  type: "doc",
  content: [
    {
      type: "paragraph",
      content: [
        { type: "text", marks: [{ type: "bold" }], text: "Chronos CMS" },
        {
          type: "text",
          text: " is a self-hostable, open-source hybrid CMS that ships with everything you need to publish content — a rich text editor, media library, comment moderation, webhooks, API keys, and a clean headless REST API.",
        },
      ],
    },
    {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "Why Chronos?" }],
    },
    {
      type: "bulletList",
      content: [
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  marks: [{ type: "bold" }],
                  text: "Own your content.",
                },
                {
                  type: "text",
                  text: " Deployed on your infrastructure, backed by your PostgreSQL database. No monthly SaaS fees, no lock-in.",
                },
              ],
            },
          ],
        },
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  marks: [{ type: "bold" }],
                  text: "Built-in and headless, simultaneously.",
                },
                {
                  type: "text",
                  text: " Use the built-in public blog as-is, or consume the REST API from any frontend framework.",
                },
              ],
            },
          ],
        },
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  marks: [{ type: "bold" }],
                  text: "Internationalised out of the box.",
                },
                {
                  type: "text",
                  text: " Every post and page supports unlimited locales with independent slugs, SEO metadata, and content.",
                },
              ],
            },
          ],
        },
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  marks: [{ type: "bold" }],
                  text: "Structured content forever.",
                },
                {
                  type: "text",
                  text: " Content is stored as TipTap JSON — never raw HTML — so it can be rendered anywhere: React, Vue, native apps, email.",
                },
              ],
            },
          ],
        },
      ],
    },
    {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "The Editor" }],
    },
    {
      type: "paragraph",
      content: [
        { type: "text", text: "The editor is built on " },
        { type: "text", marks: [{ type: "bold" }], text: "TipTap v3" },
        {
          type: "text",
          text: " and supports every block type you'd expect from a modern writing tool:",
        },
      ],
    },
    {
      type: "callout",
      attrs: { calloutType: "info" },
      content: [
        {
          type: "paragraph",
          content: [
            { type: "text", text: "Type " },
            { type: "text", marks: [{ type: "code" }], text: "/" },
            { type: "text", text: " at the start of any line to open the " },
            {
              type: "text",
              marks: [{ type: "bold" }],
              text: "slash command palette",
            },
            {
              type: "text",
              text: " — headings, lists, callouts, tables, video embeds, file attachments, and more, all keyboard-accessible.",
            },
          ],
        },
      ],
    },
    {
      type: "table",
      content: [
        {
          type: "tableRow",
          content: [
            {
              type: "tableHeader",
              attrs: { colspan: 1, rowspan: 1 },
              content: [
                {
                  type: "paragraph",
                  content: [
                    {
                      type: "text",
                      marks: [{ type: "bold" }],
                      text: "Block Type",
                    },
                  ],
                },
              ],
            },
            {
              type: "tableHeader",
              attrs: { colspan: 1, rowspan: 1 },
              content: [
                {
                  type: "paragraph",
                  content: [
                    {
                      type: "text",
                      marks: [{ type: "bold" }],
                      text: "How to Insert",
                    },
                  ],
                },
              ],
            },
          ],
        },
        {
          type: "tableRow",
          content: [
            {
              type: "tableCell",
              attrs: { colspan: 1, rowspan: 1 },
              content: [
                {
                  type: "paragraph",
                  content: [{ type: "text", text: "Headings H1–H4" }],
                },
              ],
            },
            {
              type: "tableCell",
              attrs: { colspan: 1, rowspan: 1 },
              content: [
                {
                  type: "paragraph",
                  content: [
                    { type: "text", text: "Block type dropdown · " },
                    { type: "text", marks: [{ type: "code" }], text: "/h1" },
                    { type: "text", text: " … " },
                    { type: "text", marks: [{ type: "code" }], text: "/h3" },
                  ],
                },
              ],
            },
          ],
        },
        {
          type: "tableRow",
          content: [
            {
              type: "tableCell",
              attrs: { colspan: 1, rowspan: 1 },
              content: [
                {
                  type: "paragraph",
                  content: [{ type: "text", text: "Callout blocks" }],
                },
              ],
            },
            {
              type: "tableCell",
              attrs: { colspan: 1, rowspan: 1 },
              content: [
                {
                  type: "paragraph",
                  content: [
                    { type: "text", marks: [{ type: "code" }], text: "/info" },
                    { type: "text", text: " · " },
                    { type: "text", marks: [{ type: "code" }], text: "/tip" },
                    { type: "text", text: " · " },
                    { type: "text", marks: [{ type: "code" }], text: "/warn" },
                    { type: "text", text: " · " },
                    {
                      type: "text",
                      marks: [{ type: "code" }],
                      text: "/danger",
                    },
                  ],
                },
              ],
            },
          ],
        },
        {
          type: "tableRow",
          content: [
            {
              type: "tableCell",
              attrs: { colspan: 1, rowspan: 1 },
              content: [
                {
                  type: "paragraph",
                  content: [{ type: "text", text: "Tables" }],
                },
              ],
            },
            {
              type: "tableCell",
              attrs: { colspan: 1, rowspan: 1 },
              content: [
                {
                  type: "paragraph",
                  content: [
                    { type: "text", text: "Toolbar ⊞ button · " },
                    { type: "text", marks: [{ type: "code" }], text: "/table" },
                  ],
                },
              ],
            },
          ],
        },
        {
          type: "tableRow",
          content: [
            {
              type: "tableCell",
              attrs: { colspan: 1, rowspan: 1 },
              content: [
                {
                  type: "paragraph",
                  content: [{ type: "text", text: "Video embed" }],
                },
              ],
            },
            {
              type: "tableCell",
              attrs: { colspan: 1, rowspan: 1 },
              content: [
                {
                  type: "paragraph",
                  content: [
                    { type: "text", text: "Toolbar ▶ button · " },
                    { type: "text", marks: [{ type: "code" }], text: "/video" },
                    { type: "text", text: " (YouTube / Vimeo)" },
                  ],
                },
              ],
            },
          ],
        },
        {
          type: "tableRow",
          content: [
            {
              type: "tableCell",
              attrs: { colspan: 1, rowspan: 1 },
              content: [
                {
                  type: "paragraph",
                  content: [{ type: "text", text: "File attachment" }],
                },
              ],
            },
            {
              type: "tableCell",
              attrs: { colspan: 1, rowspan: 1 },
              content: [
                {
                  type: "paragraph",
                  content: [
                    {
                      type: "text",
                      text: "Toolbar 📄 button — uploads PDF, ZIP, DOCX, XLSX, and more",
                    },
                  ],
                },
              ],
            },
          ],
        },
        {
          type: "tableRow",
          content: [
            {
              type: "tableCell",
              attrs: { colspan: 1, rowspan: 1 },
              content: [
                {
                  type: "paragraph",
                  content: [{ type: "text", text: "Markdown import" }],
                },
              ],
            },
            {
              type: "tableCell",
              attrs: { colspan: 1, rowspan: 1 },
              content: [
                {
                  type: "paragraph",
                  content: [
                    {
                      type: "text",
                      text: "Toolbar markdown icon — paste and convert to structured JSON",
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
    {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "Tech Stack" }],
    },
    {
      type: "codeBlock",
      attrs: { language: "json" },
      content: [
        {
          type: "text",
          text: `{
  "frontend":  ["React 18", "Vite", "TypeScript", "Tailwind CSS", "TipTap v3"],
  "backend":   ["Fastify 4", "TypeScript", "@fastify/jwt", "Zod"],
  "database":  ["PostgreSQL", "Prisma ORM"],
  "media":     ["sharp (WebP conversion, max 1920px)"],
  "auth":      ["JWT in localStorage", "API keys with SHA-256 hashing"],
  "deploy":    ["Docker Compose", "or bare Node.js"]
}`,
        },
      ],
    },
    {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "Getting Started" }],
    },
    {
      type: "orderedList",
      content: [
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [
                { type: "text", text: "Copy " },
                {
                  type: "text",
                  marks: [{ type: "code" }],
                  text: ".env.example",
                },
                { type: "text", text: " → " },
                { type: "text", marks: [{ type: "code" }], text: ".env" },
                { type: "text", text: " and fill in " },
                {
                  type: "text",
                  marks: [{ type: "code" }],
                  text: "DATABASE_URL",
                },
                { type: "text", text: " and " },
                { type: "text", marks: [{ type: "code" }], text: "JWT_SECRET" },
              ],
            },
          ],
        },
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [
                { type: "text", text: "Run " },
                {
                  type: "text",
                  marks: [{ type: "code" }],
                  text: "docker compose up -d",
                },
                { type: "text", text: " or " },
                {
                  type: "text",
                  marks: [{ type: "code" }],
                  text: "npm run db:migrate && npm run dev",
                },
              ],
            },
          ],
        },
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [
                { type: "text", text: "Open " },
                {
                  type: "text",
                  marks: [{ type: "code" }],
                  text: "http://localhost:5173/login",
                },
                {
                  type: "text",
                  text: " — the seed creates an admin account automatically",
                },
              ],
            },
          ],
        },
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [
                { type: "text", text: "Start publishing. The API is live at " },
                {
                  type: "text",
                  marks: [{ type: "code" }],
                  text: "http://localhost:4000",
                },
              ],
            },
          ],
        },
      ],
    },
    {
      type: "callout",
      attrs: { calloutType: "tip" },
      content: [
        {
          type: "paragraph",
          content: [
            { type: "text", text: "This page has a " },
            {
              type: "text",
              marks: [{ type: "bold" }],
              text: "French translation",
            },
            { type: "text", text: " — use the language switcher or append " },
            { type: "text", marks: [{ type: "code" }], text: "?lang=fr" },
            { type: "text", text: " to the URL." },
          ],
        },
      ],
    },
    { type: "horizontalRule" },
    {
      type: "paragraph",
      attrs: { textAlign: "center" },
      content: [
        {
          type: "text",
          marks: [{ type: "italic" }],
          text: "Chronos CMS is MIT licensed. Contributions welcome.",
        },
      ],
    },
  ],
}

const aboutPageContentFr = {
  type: "doc",
  content: [
    {
      type: "paragraph",
      content: [
        { type: "text", marks: [{ type: "bold" }], text: "Chronos CMS" },
        {
          type: "text",
          text: " est un CMS hybride open-source auto-hébergeable livré avec tout ce dont vous avez besoin pour publier du contenu — un éditeur de texte riche, une médiathèque, la modération des commentaires, des webhooks, des clés API et une API REST headless propre.",
        },
      ],
    },
    {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "Pourquoi Chronos ?" }],
    },
    {
      type: "bulletList",
      content: [
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  marks: [{ type: "bold" }],
                  text: "Votre contenu vous appartient.",
                },
                {
                  type: "text",
                  text: " Déployé sur votre infrastructure, sauvegardé dans votre base de données PostgreSQL.",
                },
              ],
            },
          ],
        },
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  marks: [{ type: "bold" }],
                  text: "Intégré et headless à la fois.",
                },
                {
                  type: "text",
                  text: " Utilisez le blog public intégré tel quel, ou consommez l'API REST depuis n'importe quel framework.",
                },
              ],
            },
          ],
        },
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  marks: [{ type: "bold" }],
                  text: "Internationalisation native.",
                },
                {
                  type: "text",
                  text: " Chaque article et page supporte des locales illimitées avec des slugs, métadonnées SEO et contenus indépendants.",
                },
              ],
            },
          ],
        },
      ],
    },
    {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "L'Éditeur" }],
    },
    {
      type: "callout",
      attrs: { calloutType: "info" },
      content: [
        {
          type: "paragraph",
          content: [
            { type: "text", text: "Tapez " },
            { type: "text", marks: [{ type: "code" }], text: "/" },
            {
              type: "text",
              text: " en début de ligne pour ouvrir la palette de commandes slash — titres, listes, callouts, tableaux, vidéos et pièces jointes, tous accessibles au clavier.",
            },
          ],
        },
      ],
    },
    {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "Démarrage Rapide" }],
    },
    {
      type: "codeBlock",
      attrs: { language: "bash" },
      content: [
        {
          type: "text",
          text: "git clone https://github.com/your-org/chronos-cms\ncp .env.example .env\ndocker compose up -d\n# API → http://localhost:4000\n# Web → http://localhost:5173/login",
        },
      ],
    },
    {
      type: "callout",
      attrs: { calloutType: "tip" },
      content: [
        {
          type: "paragraph",
          content: [
            {
              type: "text",
              text: "Cette page a une traduction anglaise — utilisez le sélecteur de langue ou ajoutez ",
            },
            { type: "text", marks: [{ type: "code" }], text: "?lang=en" },
            { type: "text", text: " à l'URL." },
          ],
        },
      ],
    },
    { type: "horizontalRule" },
    {
      type: "paragraph",
      attrs: { textAlign: "center" },
      content: [
        {
          type: "text",
          marks: [{ type: "italic" }],
          text: "Chronos CMS est sous licence MIT. Les contributions sont les bienvenues.",
        },
      ],
    },
  ],
}

const main = async (): Promise<void> => {
  console.log("🌱  Seeding database…")

  const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, 12)
  const admin = await prisma.user.upsert({
    where: { email: ADMIN_EMAIL },
    update: {},
    create: {
      email: ADMIN_EMAIL,
      password: hashedPassword,
      name: "Admin",
      role: "ADMIN",
    },
  })
  console.log(`✓  Admin: ${admin.email}`)

  const tagNames = [
    "chronos-cms",
    "editor",
    "tiptap",
    "open-source",
    "headless-cms",
    "typescript",
    "tables",
    "i18n",
  ]
  const tags = await Promise.all(
    tagNames.map((name) =>
      prisma.tag.upsert({
        where: { slug: name },
        update: {},
        create: { name, slug: name },
      }),
    ),
  )
  console.log(`✓  Tags: ${tags.map((t) => t.name).join(", ")}`)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = prisma as any

  const existingPost = await db.post.findFirst({
    where: {
      translations: { some: { locale: "en", slug: "editor-feature-showcase" } },
    },
    select: { id: true },
  })

  if (existingPost) {
    await db.postTranslation.upsert({
      where: { postId_locale: { postId: existingPost.id, locale: "en" } },
      update: {
        title: "Everything Chronos CMS Can Do — A Complete Showcase",
        content: postContentEn,
        excerpt:
          "A live demonstration of every content block, formatting option, and media type the Chronos CMS editor supports: callouts, tables, video embeds, file attachments, code blocks, and more.",
        metaTitle: "Complete Feature Showcase — Chronos CMS",
        metaDescription:
          "Every editor feature in Chronos CMS: callout blocks, tables, video embeds, file attachments, syntax-highlighted code, and full i18n support.",
      },
      create: {
        postId: existingPost.id,
        locale: "en",
        slug: "editor-feature-showcase",
        title: "Everything Chronos CMS Can Do — A Complete Showcase",
        content: postContentEn,
        excerpt:
          "A live demonstration of every content block, formatting option, and media type the Chronos CMS editor supports: callouts, tables, video embeds, file attachments, code blocks, and more.",
        metaTitle: "Complete Feature Showcase — Chronos CMS",
        metaDescription:
          "Every editor feature in Chronos CMS: callout blocks, tables, video embeds, file attachments, syntax-highlighted code, and full i18n support.",
      },
    })
    await db.postTranslation.upsert({
      where: { postId_locale: { postId: existingPost.id, locale: "fr" } },
      update: {
        title: "Tout ce que Chronos CMS Peut Faire — Une Vitrine Complète",
        content: postContentFr,
        excerpt:
          "Une démonstration en direct de chaque bloc de contenu, option de formatage et type de média pris en charge par l'éditeur Chronos CMS.",
        metaTitle: "Vitrine Complète — Chronos CMS",
        metaDescription:
          "Toutes les fonctionnalités de l'éditeur Chronos CMS : callouts, tableaux, vidéos, pièces jointes, code syntaxe et i18n complet.",
      },
      create: {
        postId: existingPost.id,
        locale: "fr",
        slug: "vitrine-fonctionnalites-editeur",
        title: "Tout ce que Chronos CMS Peut Faire — Une Vitrine Complète",
        content: postContentFr,
        excerpt:
          "Une démonstration en direct de chaque bloc de contenu, option de formatage et type de média pris en charge par l'éditeur Chronos CMS.",
        metaTitle: "Vitrine Complète — Chronos CMS",
        metaDescription:
          "Toutes les fonctionnalités de l'éditeur Chronos CMS : callouts, tableaux, vidéos, pièces jointes, code syntaxe et i18n complet.",
      },
    })
    console.log(`✓  Post (updated): showcase (EN + FR)`)
  } else {
    const post = await db.post.create({
      data: {
        defaultLocale: "en",
        status: PostStatus.PUBLISHED,
        featured: true,
        publishedAt: new Date(),
        authorId: admin.id,
        tags: { create: tags.map((t: { id: string }) => ({ tagId: t.id })) },
        translations: {
          create: [
            {
              locale: "en",
              title: "Everything Chronos CMS Can Do — A Complete Showcase",
              slug: "editor-feature-showcase",
              content: postContentEn,
              excerpt:
                "A live demonstration of every content block, formatting option, and media type the Chronos CMS editor supports: callouts, tables, video embeds, file attachments, code blocks, and more.",
              metaTitle: "Complete Feature Showcase — Chronos CMS",
              metaDescription:
                "Every editor feature in Chronos CMS: callout blocks, tables, video embeds, file attachments, syntax-highlighted code, and full i18n support.",
            },
            {
              locale: "fr",
              title: "Tout ce que Chronos CMS Peut Faire — Une Vitrine Complète",
              slug: "vitrine-fonctionnalites-editeur",
              content: postContentFr,
              excerpt:
                "Une démonstration en direct de chaque bloc de contenu, option de formatage et type de média pris en charge par l'éditeur Chronos CMS.",
              metaTitle: "Vitrine Complète — Chronos CMS",
              metaDescription:
                "Toutes les fonctionnalités de l'éditeur Chronos CMS : callouts, tableaux, vidéos, pièces jointes, code syntaxe et i18n complet.",
            },
          ],
        },
      },
      select: { id: true },
    })
    console.log(`✓  Post: showcase (featured, EN + FR) — id: ${post.id}`)
  }

  const existingPage = await db.page.findFirst({
    where: { translations: { some: { locale: "en", slug: "about" } } },
    select: { id: true },
  })

  if (existingPage) {
    await db.pageTranslation.upsert({
      where: { pageId_locale: { pageId: existingPage.id, locale: "en" } },
      update: {
        title: "About Chronos CMS",
        content: aboutPageContentEn,
        metaTitle: "About — Chronos CMS",
        metaDescription:
          "What Chronos CMS is, why it was built, and how to get started in under five minutes.",
      },
      create: {
        pageId: existingPage.id,
        locale: "en",
        slug: "about",
        title: "About Chronos CMS",
        content: aboutPageContentEn,
        metaTitle: "About — Chronos CMS",
        metaDescription:
          "What Chronos CMS is, why it was built, and how to get started in under five minutes.",
      },
    })
    await db.pageTranslation.upsert({
      where: { pageId_locale: { pageId: existingPage.id, locale: "fr" } },
      update: {
        title: "À propos de Chronos CMS",
        content: aboutPageContentFr,
        metaTitle: "À propos — Chronos CMS",
        metaDescription:
          "Ce qu'est Chronos CMS, pourquoi il a été créé et comment démarrer en moins de cinq minutes.",
      },
      create: {
        pageId: existingPage.id,
        locale: "fr",
        slug: "a-propos",
        title: "À propos de Chronos CMS",
        content: aboutPageContentFr,
        metaTitle: "À propos — Chronos CMS",
        metaDescription:
          "Ce qu'est Chronos CMS, pourquoi il a été créé et comment démarrer en moins de cinq minutes.",
      },
    })
    console.log(`✓  Page (updated): About (EN + FR)`)
  } else {
    const page = await db.page.create({
      data: {
        defaultLocale: "en",
        status: "PUBLISHED",
        authorId: admin.id,
        translations: {
          create: [
            {
              locale: "en",
              title: "About Chronos CMS",
              slug: "about",
              content: aboutPageContentEn,
              metaTitle: "About — Chronos CMS",
              metaDescription:
                "What Chronos CMS is, why it was built, and how to get started in under five minutes.",
            },
            {
              locale: "fr",
              title: "À propos de Chronos CMS",
              slug: "a-propos",
              content: aboutPageContentFr,
              metaTitle: "À propos — Chronos CMS",
              metaDescription:
                "Ce qu'est Chronos CMS, pourquoi il a été créé et comment démarrer en moins de cinq minutes.",
            },
          ],
        },
      },
      select: { id: true },
    })
    console.log(`✓  Page: About (EN + FR) — id: ${page.id}`)
  }

  console.log("\n✅  Seed complete.")
  console.log(`   Showcase post (EN) → http://localhost:5173/posts/editor-feature-showcase`)
  console.log(`   Showcase post (FR) → http://localhost:5173/posts/vitrine-fonctionnalites-editeur`)
  console.log(`   About page   (EN) → http://localhost:5173/about`)
  console.log(`   About page   (FR) → http://localhost:5173/a-propos`)
  console.log(
    `   Admin panel       → http://localhost:5173/login  (${ADMIN_EMAIL} / ${ADMIN_PASSWORD})`,
  )
}

main()
  .catch((err) => {
    console.error("❌  Seed failed:", err)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
