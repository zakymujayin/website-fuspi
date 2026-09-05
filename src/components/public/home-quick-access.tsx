import {getTranslations} from "next-intl/server";

import {quickLinks, type ExternalLink, type NavLink} from "@/components/public/nav-items";
import {Container} from "@/components/ui/container";
import {Link} from "@/i18n/navigation";
import {cn} from "@/lib/utils";
import styles from "./home-design.module.css";
import {BookingMark, ContactMark, InformationMark, InquiryMark, ListeningMark, ServiceMark} from "./institutional-icons";

const icons = {services: ServiceMark, complaints: ListeningMark, booking: BookingMark, ppid: InformationMark, faq: InquiryMark, contact: ContactMark};

function isExternal(item: NavLink | ExternalLink): item is ExternalLink {
  return "url" in item;
}

export async function HomeQuickAccess() {
  const t = await getTranslations("Home");
  const tNav = await getTranslations("Nav");
  const items = quickLinks;

  return (
    <section aria-labelledby="quick-access-title" className={`${styles.section} ${styles.quickAccess} !py-4 md:!py-5`}>
      <Container>
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:gap-6">
          <h2 id="quick-access-title" className="shrink-0 !text-base font-bold !tracking-normal text-slate-900">
            {t("quickLinksLabel")}
          </h2>
        <nav aria-label={t("quickLinksLabel")} className="grid flex-1 grid-cols-2 md:grid-cols-6">
          {items.map((item) => {
            const Icon = icons[item.key as keyof typeof icons];
            const className = cn(
              styles.utility,
              "group",
            );
            const content = (
              <>
                <Icon className="size-9 shrink-0" />
                <span className="text-sm font-semibold">{tNav(item.key)}</span>
              </>
            );
            return isExternal(item) ? (
              <a key={item.key} href={item.url} target="_blank" rel="noopener noreferrer" aria-label={`${tNav(item.key)} — ${tNav("externalLinkHint")}`} className={className}>{content}</a>
            ) : (
              <Link key={item.key} href={item.href} aria-label={tNav(item.key)} className={className}>{content}</Link>
            );
          })}
        </nav>
        </div>
      </Container>
    </section>
  );
}
