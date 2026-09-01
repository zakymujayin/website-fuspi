import {
  LecturerPortalMediaUploadResponseSchema,
  type LecturerPortalMediaUploadResponse,
} from "@/contracts/lecturer-portal";
import {isSameOriginRequest} from "@/lib/auth/runtime/csrf";
import {getRequestSession} from "@/lib/auth/runtime/request-session";
import {getPrismaClient} from "@/lib/db/client";
import {
  executeLecturerPortalMediaUpload,
  lecturerPortalMediaUploadHttpStatus,
  type LecturerPortalMediaUploadFile,
} from "@/features/lecturer-portal/media-upload";
import {parseStorageRoots} from "@/lib/storage";

const MAX_IMAGE_BYTES = 5_242_880;
const MAX_PDF_BYTES = 20_971_520;
const MAX_MULTIPART_BODY_BYTES = MAX_PDF_BYTES + 1_048_576;
const FALLBACK_BROWSER_TYPES = new Set(["", "application/octet-stream"]);
const MIME_BY_EXTENSION = new Map([
  [".jpg", "image/jpeg"],
  [".jpeg", "image/jpeg"],
  [".png", "image/png"],
  [".webp", "image/webp"],
  [".pdf", "application/pdf"],
]);

function json(value: unknown, status = 200) {
  return Response.json(value, {status, headers: {"Cache-Control": "no-store"}});
}

function failure(code: Extract<LecturerPortalMediaUploadResponse, {ok: false}>["code"]) {
  return LecturerPortalMediaUploadResponseSchema.parse({ok: false, code});
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

function normalizeUploadMimeType(file: File): string {
  const mimeType = file.type.trim().toLowerCase();
  if (FALLBACK_BROWSER_TYPES.has(mimeType)) {
    const name = file.name.trim().toLowerCase();
    for (const [extension, normalizedMimeType] of MIME_BY_EXTENSION) {
      if (name.endsWith(extension)) return normalizedMimeType;
    }
  }
  return mimeType;
}

function parseMultipart(formData: FormData) {
  const entries = [...formData.entries()];
  if (entries.some(([key]) => key !== "kind" && key !== "file")) return null;
  const kindValues = formData.getAll("kind");
  const fileValues = formData.getAll("file");
  if (
    kindValues.length !== 1
    || typeof kindValues[0] !== "string"
    || fileValues.length !== 1
    || typeof fileValues[0] === "string"
  ) return null;
  return {kind: kindValues[0], file: fileValues[0] as File};
}

export async function POST(request: Request) {
  if (!isSameOriginRequest(request.headers)) {
    const result = failure("CSRF_INVALID");
    return json(result, lecturerPortalMediaUploadHttpStatus(result));
  }
  const session = await getRequestSession();
  if (!session.ok) {
    const result = failure("SESSION_INVALID");
    return json(result, lecturerPortalMediaUploadHttpStatus(result));
  }
  const bounded = await readBoundedMultipart(request);
  if (!bounded.ok) {
    const result = failure("REQUEST_INVALID");
    return json(result, lecturerPortalMediaUploadHttpStatus(result));
  }
  const parsed = parseMultipart(bounded.formData);
  if (!parsed) {
    const result = failure("REQUEST_INVALID");
    return json(result, lecturerPortalMediaUploadHttpStatus(result));
  }
  const maxFileBytes = parsed.kind === "CV" ? MAX_PDF_BYTES : MAX_IMAGE_BYTES;
  if (parsed.file.size < 1 || parsed.file.size > maxFileBytes) {
    const result = failure("REQUEST_INVALID");
    return json(result, lecturerPortalMediaUploadHttpStatus(result));
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
    return json(result, lecturerPortalMediaUploadHttpStatus(result));
  }
  const file: LecturerPortalMediaUploadFile = {
    name: parsed.file.name,
    mimeType: normalizeUploadMimeType(parsed.file),
    bytes: new Uint8Array(await parsed.file.arrayBuffer()),
  };
  const result = await executeLecturerPortalMediaUpload(
    getPrismaClient(),
    session.session,
    parsed.kind,
    file,
    roots,
    process.env.UPLOAD_PUBLIC_URL ?? "/uploads",
  );
  return json(result, lecturerPortalMediaUploadHttpStatus(result));
}
