import {getTranslations} from "next-intl/server";

import {FacilityGallery, type FacilityGalleryItem} from "@/components/public/facility-gallery";
import {toFocalPoint} from "@/components/public/focal-point";
import {Container} from "@/components/ui/container";
import type {PublicHomeFacility} from "@/features/facility/domain";
import styles from "./home-design.module.css";
import {HomeSectionHeading} from "./home-section-heading";
import {HomeSectionLink} from "./home-section-link";

export async function FacilitiesSection({items}: {items: readonly PublicHomeFacility[]}) {
  const t = await getTranslations("Home");
  const visible = items.slice(0, 5);
  if (visible.length === 0) return null;

  const gallery: FacilityGalleryItem[] = visible.map((facility) => ({
    id: facility.id,
    caption: facility.caption,
    url: facility.image?.url ?? null,
    alt: facility.image?.isDecorative ? "" : (facility.image?.alt ?? facility.caption),
    focalPoint: toFocalPoint(facility.image),
  }));

  return (
    <section className={`${styles.section} bg-white`} aria-labelledby="facilities-title">
      <Container>
        <HomeSectionHeading
          id="facilities-title"
          eyebrow={t("facilitiesEyebrow")}
          title={t("facilitiesTitle")}
          action={<HomeSectionLink href="/profil/fasilitas">{t("viewAll")}</HomeSectionLink>}
        />
        <FacilityGallery items={gallery} bento={visible.length === 5} href="/profil/fasilitas" />
      </Container>
    </section>
  );
}
