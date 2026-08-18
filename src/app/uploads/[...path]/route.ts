import {lstat, readFile, realpath} from "node:fs/promises";
import path from "node:path";

import {StorageKeySchema} from "@/contracts/storage";
import {resolveStoragePath} from "@/lib/storage/paths";

export const dynamic = "force-dynamic";

type RouteParams = {
  params: Promise<{path: string[]}>;
};

const MIME_TYPES = {
  webp: "image/webp",
  pdf: "application/pdf",
} as const;

function notFound() {
  return new Response(null, {
    status: 404,
    headers: {"Cache-Control": "no-store"},
  });
}

async function safePublicFile(storageKey: string) {
  const root = process.env.UPLOAD_DIR;
  if (!root || !path.isAbsolute(root) || root.includes("\0")) return null;
  const rootPath = path.resolve(root);
  const destination = resolveStoragePath(rootPath, storageKey);
  const parent = path.dirname(destination);

  const [rootStats, parentStats, fileStats] = await Promise.all([
    lstat(/*turbopackIgnore: true*/ rootPath),
    lstat(/*turbopackIgnore: true*/ parent),
    lstat(/*turbopackIgnore: true*/ destination),
  ]);
  if (
    !rootStats.isDirectory()
    || rootStats.isSymbolicLink()
    || !parentStats.isDirectory()
    || parentStats.isSymbolicLink()
    || !fileStats.isFile()
    || fileStats.isSymbolicLink()
  ) {
    return null;
  }
  const [realRoot, realParent] = await Promise.all([
    realpath(/*turbopackIgnore: true*/ rootPath),
    realpath(/*turbopackIgnore: true*/ parent),
  ]);
  if (realRoot !== rootPath || realParent !== parent) return null;
  return {
    destination,
    size: fileStats.size,
    modifiedAt: fileStats.mtime.toUTCString(),
  };
}

function contentType(storageKey: string) {
  const extension = storageKey.endsWith(".pdf") ? "pdf" : "webp";
  return MIME_TYPES[extension];
}

async function serve(
  {params}: RouteParams,
  includeBody: boolean,
) {
  const {path: segments} = await params;
  const storageKey = segments.join("/");
  if (!StorageKeySchema.safeParse(storageKey).success) return notFound();

  try {
    const file = await safePublicFile(storageKey);
    if (!file) return notFound();
    const headers = {
      "Cache-Control": "public, max-age=31536000, immutable",
      "Content-Length": String(file.size),
      "Content-Type": contentType(storageKey),
      "Last-Modified": file.modifiedAt,
      "X-Content-Type-Options": "nosniff",
    };
    if (!includeBody) return new Response(null, {status: 200, headers});
    const bytes = await readFile(/*turbopackIgnore: true*/ file.destination);
    return new Response(bytes, {
      status: 200,
      headers,
    });
  } catch {
    return notFound();
  }
}

export async function GET(_request: Request, context: RouteParams) {
  return serve(context, true);
}

export async function HEAD(_request: Request, context: RouteParams) {
  return serve(context, false);
}
