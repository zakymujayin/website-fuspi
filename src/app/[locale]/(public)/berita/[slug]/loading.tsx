import { getTranslations } from "next-intl/server";

import { Container } from "@/components/ui/container";
import { PostDetailSkeleton } from "@/components/public/post/post-detail-skeleton";

export default async function NewsDetailLoading() {
  const t = await getTranslations("Post");

  return (
    <Container className="py-12 md:py-20">
      <PostDetailSkeleton loadingLabel={t("loading")} />
    </Container>
  );
}
