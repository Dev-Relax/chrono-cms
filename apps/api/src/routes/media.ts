import type { FastifyInstance } from "fastify";
import {
  existsSync, mkdirSync, readdirSync, statSync,
  unlinkSync, writeFileSync, readFileSync,
} from "node:fs";
import { join, extname } from "node:path";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
export const UPLOADS_DIR = join(__dirname, "..", "..", "uploads");

if (!existsSync(UPLOADS_DIR)) {
  mkdirSync(UPLOADS_DIR, { recursive: true });
}

const IMAGE_MIMES = new Set([
  "image/jpeg", "image/jpg", "image/png", "image/gif",
  "image/webp", "image/svg+xml", "image/avif",
]);

const RASTER_MIMES = new Set([
  "image/jpeg", "image/jpg", "image/png", "image/gif",
  "image/webp", "image/avif",
]);

const DOCUMENT_MIMES = new Set([
  "application/pdf",
  "application/zip",
  "application/x-zip-compressed",
  "application/x-rar-compressed",
  "application/x-7z-compressed",
  "application/gzip",
  "application/x-tar",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "text/plain",
  "text/csv",
  "text/markdown",
]);

const ALLOWED_MIMES = new Set([...IMAGE_MIMES, ...DOCUMENT_MIMES]);

const MIME_TO_EXT: Record<string, string> = {
  "application/pdf":    "pdf",
  "application/zip":    "zip",
  "application/x-zip-compressed": "zip",
  "application/x-rar-compressed": "rar",
  "application/x-7z-compressed":  "7z",
  "application/gzip":  "gz",
  "application/x-tar": "tar",
  "application/msword": "doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
  "application/vnd.ms-excel": "xls",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
  "application/vnd.ms-powerpoint": "ppt",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": "pptx",
  "text/plain":    "txt",
  "text/csv":      "csv",
  "text/markdown": "md",
};

type FileMeta = { originalName: string; mimeType: string };

const sidecarPath = (filename: string) => join(UPLOADS_DIR, `${filename}.meta.json`);

const writeMeta = (filename: string, meta: FileMeta): void => {
  writeFileSync(sidecarPath(filename), JSON.stringify(meta));
};

const readMeta = (filename: string): FileMeta | null => {
  const p = sidecarPath(filename);
  if (!existsSync(p)) return null;
  try {
    return JSON.parse(readFileSync(p, "utf8")) as FileMeta;
  } catch {
    return null;
  }
};

export const mediaRoutes = async (fastify: FastifyInstance): Promise<void> => {

  fastify.post(
    "/admin/media",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const data = await request.file();
      if (!data) {
        return reply.status(400).send({ error: "No file uploaded" });
      }

      if (!ALLOWED_MIMES.has(data.mimetype)) {
        return reply.status(415).send({ error: "File type not allowed" });
      }

      const buffer = await data.toBuffer();

      let filename: string;
      let finalBuffer: Buffer;
      let finalMime: string;

      if (RASTER_MIMES.has(data.mimetype)) {
        // Resize to max 1920×1920, convert to WebP
        finalBuffer = await sharp(buffer)
          .resize({ width: 1920, height: 1920, fit: "inside", withoutEnlargement: true })
          .webp({ quality: 85 })
          .toBuffer();
        filename  = `${randomUUID()}.webp`;
        finalMime = "image/webp";

      } else if (data.mimetype === "image/svg+xml") {
        // SVG — store as-is
        finalBuffer = buffer;
        filename    = `${randomUUID()}.svg`;
        finalMime   = "image/svg+xml";

      } else {
        // Document / file — preserve extension from original filename
        finalBuffer = buffer;
        const originalExt = extname(data.filename ?? "").toLowerCase().replace(".", "");
        const ext = originalExt || (MIME_TO_EXT[data.mimetype] ?? "bin");
        filename  = `${randomUUID()}.${ext}`;
        finalMime = data.mimetype;
      }

      const dest = join(UPLOADS_DIR, filename);
      writeFileSync(dest, finalBuffer);
      writeMeta(filename, { originalName: data.filename ?? filename, mimeType: finalMime });

      const stat = statSync(dest);

      return reply.status(201).send({
        data: {
          filename,
          originalName: data.filename ?? filename,
          mimeType:     finalMime,
          size:         stat.size,
          url:          `/uploads/${filename}`,
        },
      });
    }
  );

  fastify.get(
    "/admin/media",
    { preHandler: [fastify.authenticate] },
    async (_request, reply) => {
      const files = readdirSync(UPLOADS_DIR)
        .filter((f) => !f.startsWith(".") && !f.endsWith(".meta.json"))
        .map((filename) => {
          const stat = statSync(join(UPLOADS_DIR, filename));
          const meta = readMeta(filename);
          return {
            filename,
            originalName: meta?.originalName ?? filename,
            mimeType:     meta?.mimeType
                          ?? (filename.endsWith(".webp") ? "image/webp"
                             : filename.endsWith(".svg")  ? "image/svg+xml"
                             : "application/octet-stream"),
            size:         stat.size,
            uploadedAt:   stat.mtime.toISOString(),
            url:          `/uploads/${filename}`,
          };
        })
        .sort((a, b) =>
          new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
        );

      return reply.send({ data: files });
    }
  );

  fastify.delete(
    "/admin/media/:name",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const { name } = request.params as { name: string };

      if (name.includes("/") || name.includes("\\") || name.includes("..")) {
        return reply.status(400).send({ error: "Invalid filename" });
      }

      const dest = join(UPLOADS_DIR, name);
      if (!existsSync(dest)) {
        return reply.status(404).send({ error: "File not found" });
      }

      unlinkSync(dest);

      // Remove sidecar if present
      const sc = sidecarPath(name);
      if (existsSync(sc)) unlinkSync(sc);

      return reply.status(204).send();
    }
  );
};
