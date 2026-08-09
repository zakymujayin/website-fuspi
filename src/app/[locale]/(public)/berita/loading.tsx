import { getTranslations } from "next-intl/server";

import { Container } from "@/components/ui/container";
import { PostListSkeleton } from "@/components/public/post/post-list-skeleton";

export default async function NewsListLoading() {
  const t = await getTranslations("Post");

  return (
    <Container className="py-12 md:py-20">
      <PostListSkeleton loadingLabel={t("loading")} />
    </Container>
  );
}
