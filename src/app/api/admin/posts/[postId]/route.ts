import {getRequestSession} from "@/lib/auth/runtime/request-session";
import {adminPostHttpStatus, getAdminPostEditor} from "@/lib/content/post-admin-transport";
import {getPrismaClient} from "@/lib/db/client";

function json(value: unknown, status = 200) {
  return Response.json(value, {status, headers: {"Cache-Control": "no-store"}});
}

export async function GET(
  request: Request,
  context: {params: Promise<{postId: string}>},
) {
  const {postId} = await context.params;
  const type = new URL(request.url).searchParams.get("type") === "KOLOM" ? "KOLOM" : "BERITA";
  const session = await getRequestSession();
  const result = await getAdminPostEditor(
    getPrismaClient(),
    session.ok ? session.session : null,
    postId,
    process.env.UPLOAD_PUBLIC_URL ?? "/uploads",
    type,
  );
  return json(result.ok ? result.data : result, adminPostHttpStatus(result));
}
