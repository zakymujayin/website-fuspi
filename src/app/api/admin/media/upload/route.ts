import {revalidatePath} from "next/cache";

import {
  ADMIN_MEDIA_IMAGE_UPLOAD_LIMIT,
  AdminMediaUploadMetadataSchema,
  AdminMediaUploadResponseSchema,
} from "@/contracts/media-admin";
import {isSameOriginRequest} from "@/lib/auth/runtime/csrf";
import {getRequestSession} from "@/lib/auth/runtime/request-session";
import {
  adminMediaHttpStatus,
  executeAdminMediaUpload,
  type AdminMediaUploadFile,
} from "@/lib/content/media-admin-transport";
import {getPrismaClient} from "@/lib/db/client";
import {parseStorageRoots} from "@/lib/storage";

const MAX_IMAGE_BYTES = 5_242_880;
const MAX_PDF_BYTES = 20_971_520;
const MAX_MULTIPART_OVERHEAD = 1_048_576;
const MAX_MULTIPART_BODY_BYTES =
  ADMIN_MEDIA_IMAGE_UPLOAD_LIMIT * MAX_IMAGE_BYTES + MAX_MULTIPART_OVERHEAD;
const MAX_METADATA_BYTES = 65_536;
const FALLBACK_WEBP_BROWSER_TYPES = new Set(["", "application/octet-stream"]);

function json(value: unknown, status = 200) {
  return Response.json(value, {status, headers: {"Cache-Control": "no-store"}});
}

function failure(code: "SESSION_INVALID" | "CSRF_INVALID" | "REQUEST_INVALID" | "UNAVAILABLE") {
  return AdminMediaUploadResponseSchema.parse({ok: false, code});
}

async function readBoundedMultipart(request: Request) {
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().startsWith("multipart/form-data;") || !request.body) {
    return {ok: false as const};
  }
  const declared = Number(request.headers.get("content-length") ?? "0");
  if (!Number.isFinite(declared) || declared < 0 || declared > MAX_MULTIPART_BODY_BYTES) {
    return {ok: false as const};
  }
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const {done, value} = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_MULTIPART_BODY_BYTES) {
        await reader.cancel();
        return {ok: false as const};
      }
      chunks.push(value);
    }
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.byteLength;
    }
    const bounded = new Request(request.url, {
      method: "POST",
      headers: {"content-type": contentType},
      body: bytes,
    });
    return {ok: true as const, formData: await bounded.formData()};
  } catch {
    return {ok: false as const};
  }
}

function parseMultipart(formData: FormData) {
  const entries = [...formData.entries()];
  if (entries.some(([key]) => key !== "metadata" && key !== "files")) return null;
  const metadataValues = formData.getAll("metadata");
  const fileValues = formData.getAll("files");
  if (
    metadataValues.length !== 1
    || typeof metadataValues[0] !== "string"
    || Buffer.byteLength(metadataValues[0], "utf8") > MAX_METADATA_BYTES
    || fileValues.length < 1
    || fileValues.length > ADMIN_MEDIA_IMAGE_UPLOAD_LIMIT
    || fileValues.some((value) => typeof value === "string")
  ) return null;
  try {
    const metadata = AdminMediaUploadMetadataSchema.safeParse(JSON.parse(metadataValues[0]));
    return metadata.success ? {metadata: metadata.data, files: fileValues as File[]} : null;
  } catch {
    return null;
  }
}

function normalizeUploadMimeType(file: File): string {
  const mimeType = file.type.trim().toLowerCase();
  if (FALLBACK_WEBP_BROWSER_TYPES.has(mimeType) && file.name.trim().toLowerCase().endsWith(".webp")) {
    return "image/webp";
  }
  return mimeType;
}

export async function POST(request: Request) {
  if (!isSameOriginRequest(request.headers)) {
    const result = failure("CSRF_INVALID");
    return json(result, adminMediaHttpStatus(result));
  }
  const session = await getRequestSession();
  if (!session.ok) {
    const result = failure("SESSION_INVALID");
    return json(result, adminMediaHttpStatus(result));
  }
  const bounded = await readBoundedMultipart(request);
  if (!bounded.ok) {
    const result = failure("REQUEST_INVALID");
    return json(result, adminMediaHttpStatus(result));
  }
  const parsed = parseMultipart(bounded.formData);
  if (!parsed) {
    const result = failure("REQUEST_INVALID");
    return json(result, adminMediaHttpStatus(result));
  }
  const files: AdminMediaUploadFile[] = [];
  const maxFileBytes = parsed.metadata.policy === "CMS_IMAGE" ? MAX_IMAGE_BYTES : MAX_PDF_BYTES;
  for (const file of parsed.files) {
    if (file.size < 1 || file.size > maxFileBytes) {
      const result = failure("REQUEST_INVALID");
      return json(result, adminMediaHttpStatus(result));
    }
    files.push({
      name: file.name,
      mimeType: normalizeUploadMimeType(file),
      bytes: new Uint8Array(await file.arrayBuffer()),
    });
  }
  let roots;
  try {
    roots = parseStorageRoots({
      PUBLIC: process.env.UPLOAD_DIR ?? "",
      PRIVATE: process.env.UPLOAD_PRIVATE_DIR ?? "",
      PPKS_PRIVATE: process.env.PPKS_PRIVATE_DIR ?? "",
    });
  } catch {
    const result = failure("UNAVAILABLE");
    return json(result, adminMediaHttpStatus(result));
  }
  const result = await executeAdminMediaUpload(
    getPrismaClient(),
    session.session,
    parsed.metadata,
    files,
    roots,
  );
  if (result.ok) {
    for (const locale of ["id", "en", "ar"] as const) {
      revalidatePath(`/${locale}/admin/media`);
    }
  }
  return json(result, adminMediaHttpStatus(result));
}
