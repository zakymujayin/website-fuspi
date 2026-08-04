import {
  adminPageHttpStatus,
  getAdminPageEditor,
} from "@/features/content/pages/admin-transport";
import {getRequestSession} from "@/lib/auth/runtime/request-session";
import {getPrismaClient} from "@/lib/db/client";

function json(value: unknown, status = 200) {
  return Response.json(value, {status, headers: {"Cache-Control": "no-store"}});
}

export async function GET(
  _request: Request,
  context: {params: Promise<{pageId: string}>},
) {
  const {pageId} = await context.params;
  const session = await getRequestSession();
  const result = await getAdminPageEditor(
    getPrismaClient(),
    session.ok ? session.session : null,
    pageId,
    process.env.UPLOAD_PUBLIC_URL ?? "",
  );
  return json(result.ok ? result.data : result, adminPageHttpStatus(result));
}
