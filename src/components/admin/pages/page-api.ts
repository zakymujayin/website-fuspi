import type {
  AdminPageEditorView,
  AdminPageListQuery,
  AdminPageListResult,
} from "@/contracts/page-admin";

export type AdminPageListApiResult =
  | { ok: true; data: AdminPageListResult }
  | { ok: false; code: "UNAVAILABLE" };

export async function fetchAdminPageList(query: AdminPageListQuery): Promise<AdminPageListApiResult> {
  const params = new URLSearchParams();
  params.set("page", String(query.page));
  params.set("pageSize", String(query.pageSize));
  params.set("status", query.status);
  if (query.search) params.set("search", query.search);
  params.set("sort", query.sort);

  try {
    const response = await fetch(`/api/admin/pages?${params.toString()}`, {
      credentials: "same-origin",
      headers: { accept: "application/json" },
      // Server-side fetch should not cache the dynamic list.
      cache: "no-store",
    });
    const data: unknown = await response.json().catch(() => null);
    if (!response.ok || typeof data !== "object" || data === null || !("items" in data)) {
      return { ok: false, code: "UNAVAILABLE" };
    }
    return { ok: true, data: data as AdminPageListResult };
  } catch {
    return { ok: false, code: "UNAVAILABLE" };
  }
}

export type AdminPageEditorApiResult =
  | { ok: true; data: AdminPageEditorView }
  | { ok: false; code: "UNAVAILABLE" };

export async function fetchAdminPageEditor(pageId: string): Promise<AdminPageEditorApiResult> {
  try {
    const response = await fetch(`/api/admin/pages/${encodeURIComponent(pageId)}`, {
      credentials: "same-origin",
      headers: { accept: "application/json" },
      cache: "no-store",
    });
    const data: unknown = await response.json().catch(() => null);
    if (!response.ok || typeof data !== "object" || data === null || !("id" in data)) {
      return { ok: false, code: "UNAVAILABLE" };
    }
    return { ok: true, data: data as AdminPageEditorView };
  } catch {
    return { ok: false, code: "UNAVAILABLE" };
  }
}
