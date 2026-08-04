import {redirect} from "next/navigation";

export default async function AnnouncementDetailPage({params}: {params: Promise<{locale: string; slug: string}>}) {
  const {slug} = await params;
  redirect(`/berita/${slug}`);
}
