import {getTranslations} from "next-intl/server";

import {quickLinks, type ExternalLink, type NavLink} from "@/components/public/nav-items";
import {Container} from "@/components/ui/container";
import {Link} from "@/i18n/navigation";
import styles from "./home-design.module.css";
import {BookingMark, ContactMark, InformationMark, InquiryMark, ListeningMark, ServiceMark} from "./institutional-icons";

const icons = {services: ServiceMark, complaints: ListeningMark, booking: BookingMark, ppid: InformationMark, faq: InquiryMark, contact: ContactMark};

function isExternal(item: NavLink | ExternalLink): item is ExternalLink {
  return "url" in item;
}

/**
 * Compact utility band. Each entry sits on a light royal surface and fills with
 * Royal Blue on hover/focus — branded and interactive without turning the band
 * into a row of marketing cards.
 */
export async function HomeQuickAccess() {
  const t = await getTranslations("Home");
  const tNav = await getTranslations("Nav");
  const items = quickLinks;

  return (
    <section aria-labelledby="quick-access-title" className={`${styles.section} ${styles.band} ${styles.quickAccess}`}>
      <Container>
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:gap-8">
          <h2 id="quick-access-title" className="shrink-0 !text-sm font-bold uppercase !tracking-[0.14em] text-royal-800">
            {t("quickLinksLabel")}
          </h2>
          <nav aria-label={t("quickLinksLabel")} className={`${styles.utilityGrid} flex-1`}>
            {items.map((item) => {
              const Icon = icons[item.key as keyof typeof icons];
              const content = (
                <>
                  <span aria-hidden className={styles.utilityIcon}><Icon className="size-6" /></span>
                  <span className="text-sm font-semibold leading-tight">{tNav(item.key)}</span>
                </>
              );
              return isExternal(item) ? (
                <a key={item.key} href={item.url} target="_blank" rel="noopener noreferrer" aria-label={`${tNav(item.key)} — ${tNav("externalLinkHint")}`} className={styles.utility}>{content}</a>
              ) : (
                <Link key={item.key} href={item.href} aria-label={tNav(item.key)} className={styles.utility}>{content}</Link>
              );
            })}
          </nav>
        </div>
      </Container>
    </section>
  );
}
