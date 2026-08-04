import {PublicContentListGridSkeleton} from "@/components/public/public-content-card-skeleton";
import {Container} from "@/components/ui/container";
import {SectionHeadingSkeleton} from "@/components/public/section-heading-skeleton";

export default function Loading() {
  return (
    <Container className="py-12 md:py-20">
      <SectionHeadingSkeleton />
      <div className="mt-10">
        <PublicContentListGridSkeleton count={6} />
      </div>
    </Container>
  );
}
