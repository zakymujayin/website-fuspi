import {FileTextIcon, Building2Icon, HandshakeIcon, GraduationCapIcon, TrophyIcon, UsersIcon, FileDownIcon, ImageIcon, CalendarIcon, MessageCircleQuestionIcon, QuoteIcon, GalleryHorizontalIcon, BarChart3Icon, LayoutPanelTopIcon, SlidersHorizontalIcon} from "lucide-react";
import {getTranslations} from "next-intl/server";

import {Link} from "@/i18n/navigation";

const ADMIN_ROUTES = [
  {href: "/admin/beranda/slider", icon: GalleryHorizontalIcon, labelKey: "homeSlider"},
  {href: "/admin/beranda/statistik", icon: BarChart3Icon, labelKey: "homeStatistic"},
  {href: "/admin/beranda/bagian", icon: LayoutPanelTopIcon, labelKey: "homeSection"},
  {href: "/admin/beranda/pengaturan", icon: SlidersHorizontalIcon, labelKey: "homeSettings"},
  {href: "/admin/pages", icon: FileTextIcon, labelKey: "pages"},
  {href: "/admin/layanan", icon: Building2Icon, labelKey: "services"},
  {href: "/admin/kerjasama", icon: HandshakeIcon, labelKey: "partnerships"},
  {href: "/admin/beasiswa", icon: GraduationCapIcon, labelKey: "scholarships"},
  {href: "/admin/prestasi", icon: TrophyIcon, labelKey: "achievements"},
  {href: "/admin/kegiatan", icon: UsersIcon, labelKey: "activities"},
  {href: "/admin/dokumen", icon: FileDownIcon, labelKey: "documents"},
  {href: "/admin/album", icon: ImageIcon, labelKey: "albums"},
  {href: "/admin/agenda", icon: CalendarIcon, labelKey: "events"},
  {href: "/admin/faq", icon: MessageCircleQuestionIcon, labelKey: "faq"},
  {href: "/admin/testimoni", icon: QuoteIcon, labelKey: "testimonials"},
] as const;

type AdminNavProps = {
  locale: string;
};

export async function AdminNav({locale}: AdminNavProps) {
  const t = await getTranslations({locale, namespace: "AdminNavigation"});
  return (
    <nav aria-label={t("label")} className="mb-8">
      <ul className="flex flex-wrap items-center gap-2">
        {ADMIN_ROUTES.map(({href, icon: Icon, labelKey}) => (
          <li key={href}>
            <Link
              href={href}
              className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-300 px-3 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100"
            >
              <Icon data-icon aria-hidden className="size-4" strokeWidth={1.5} />
              {t(labelKey)}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
