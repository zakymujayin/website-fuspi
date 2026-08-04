import type {Metadata} from "next";
import {generatePublicContentListMetadata, PublicContentListPage} from "@/components/public/public-content-list-page";

export async function generateMetadata({params}: {params: Promise<{locale: string}>}): Promise<Metadata> {
  const {locale} = await params;
  return generatePublicContentListMetadata("ALBUM", locale);
}

export default function AlbumListPage(props: {params: Promise<{locale: string}>; searchParams: Promise<{page?: string | string[]}>}) {
  return PublicContentListPage({config: {resource: "ALBUM", hasDetail: true}, ...props});
}
