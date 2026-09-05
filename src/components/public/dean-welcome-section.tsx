import {DeanAvatarPlate} from "@/components/public/dean-avatar-plate";
import {toFocalPoint} from "@/components/public/focal-point";
import {ImageWithFallback} from "@/components/public/image-with-fallback";
import {Container} from "@/components/ui/container";
import type {PublicDean} from "@/features/home-nav/public-query";
import styles from "./home-design.module.css";
import {HomeSectionHeading} from "./home-section-heading";
import {HomeSectionLink} from "./home-section-link";
import {Reveal} from "./reveal";

function initialsFrom(name: string) {
  const parts = name.replace(/^(Prof\.|Dr\.|H\.|Hj\.|M\.Ag\.|S\.Ag\.)\s*/gi, "").trim().split(/\s+/);
  return parts.slice(0, 2).map((part) => part[0]?.toUpperCase() ?? "").join("") || "?";
}

/**
 * Leadership portrait, not a profile card: the real CMS photograph is cropped
 * 4:5 with no frame, lifted off a restrained royal offset panel carrying the
 * FUSPI motif. The message is split from the dean's own words only — the
 * closing sentence leads as the key message, the earlier sentences support it.
 */
export function DeanWelcomeSection({dean, title, ctaLabel}: {dean: PublicDean; title: string; ctaLabel: string}) {
  const passages = dean.message.trim().split(/(?<=[.!?؟])\s+/u);
  const keyMessage = passages.length > 1 ? passages[passages.length - 1] : dean.message;
  const support = passages.length > 1 ? passages.slice(0, -1).join(" ") : null;

  return (
    <section className={`${styles.section} ${styles.dean}`}>
      <Container>
        <div className="grid items-center gap-10 lg:grid-cols-12 lg:gap-14">
          <Reveal variant="image" className="mx-auto w-full max-w-md lg:col-span-5">
            <div className={`${styles.deanPortrait} w-full`}>
              <div className={`${styles.deanFrame} ${styles.ratioPortrait} w-full bg-slate-200`}>
                {dean.photo ? (
                  <ImageWithFallback
                    src={dean.photo.url}
                    alt={dean.photo.isDecorative ? "" : (dean.photo.alt ?? dean.name)}
                    className="object-cover"
                    sizes="(min-width: 1024px) 40vw, 100vw"
                    focalPoint={toFocalPoint(dean.photo)}
                  />
                ) : (
                  <DeanAvatarPlate initials={initialsFrom(dean.name)} name={dean.name} />
                )}
              </div>
            </div>
          </Reveal>

          <div className="lg:col-span-7">
            <Reveal index={1} className="!block">
              <HomeSectionHeading title={title} accent compact />
              <blockquote>
                <p className={`${styles.deanQuote} font-serif-display`}>“{keyMessage}”</p>
              </blockquote>
              {support ? <p className={styles.deanSupport}>{support}</p> : null}
            </Reveal>
            <Reveal index={2} className="!block">
              <div className={styles.deanByline}>
                <p className="text-lg font-bold leading-snug text-slate-900 md:text-xl">{dean.name}</p>
                <p className="mt-1 text-sm leading-6 text-slate-600">{dean.position}</p>
                <HomeSectionLink href="/profil/pimpinan" className="mt-2">{ctaLabel}</HomeSectionLink>
              </div>
            </Reveal>
          </div>
        </div>
      </Container>
    </section>
  );
}
