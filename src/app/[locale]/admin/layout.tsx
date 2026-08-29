import { Amiri, IBM_Plex_Sans_Arabic, Inter, Plus_Jakarta_Sans } from "next/font/google";
import { redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { signOut } from "@/auth";
import { AdminLayoutShell } from "@/components/admin/admin-layout-shell";
import { SkipLink } from "@/components/public/skip-link";
import { canAccessAdminShell } from "@/lib/auth/permission-matrix";
import { parseAppLocale, resolvePostLoginDestination } from "@/lib/auth/runtime/redirect";
import {
  decideProtectedRoute,
  getRequestSession,
} from "@/lib/auth/runtime/request-session";
import { getPrismaClient } from "@/lib/db/client";

const display = Plus_Jakarta_Sans({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-plus-jakarta-sans",
});
const body = Inter({ subsets: ["latin"], display: "swap", variable: "--font-inter" });
const arabicUi = IBM_Plex_Sans_Arabic({
  subsets: ["arabic"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  variable: "--font-ibm-plex-sans-arabic",
});
const arabicQuote = Amiri({
  subsets: ["arabic"],
  weight: ["400", "700"],
  display: "swap",
  variable: "--font-amiri",
});
const FONT_VARIABLES = `${display.variable} ${body.variable} ${arabicUi.variable} ${arabicQuote.variable}`;

export default async function AdminLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const appLocale = parseAppLocale(locale);

  const session = await getRequestSession();
  const decision = decideProtectedRoute(
    session,
    appLocale,
    `/${appLocale}/admin`,
  );
  if (!decision.allow) redirect(decision.redirectTo);
  if (session.ok && !canAccessAdminShell(session.session.role)) {
    redirect(resolvePostLoginDestination(session.session.role, null, appLocale));
  }

  const t = await getTranslations({ locale, namespace: "AdminSidebar" });

  const sidebarTranslations = {
    sidebarLabel: t("sidebarLabel"),
    groups: {
      dashboard: t("groups.dashboard"),
      homepage: t("groups.homepage"),
      content: t("groups.content"),
      publications: t("groups.publications"),
      others: t("groups.others"),
    },
    items: {
      dashboard: t("items.dashboard"),
      pages: t("items.pages"),
      posts: t("items.posts"),
      announcements: t("items.announcements"),
      columns: t("items.columns"),
      kolom: t("items.kolom"),
      media: t("items.media"),
      taxonomies: t("items.taxonomies"),
      services: t("items.services"),
      partnerships: t("items.partnerships"),
      scholarships: t("items.scholarships"),
      achievements: t("items.achievements"),
      activities: t("items.activities"),
      documents: t("items.documents"),
      albums: t("items.albums"),
      events: t("items.events"),
      faq: t("items.faq"),
      testimonials: t("items.testimonials"),
      homeSlider: t("items.homeSlider"),
      homeStatistic: t("items.homeStatistic"),
      homeSection: t("items.homeSection"),
      homeSettings: t("items.homeSettings"),
      facilities: t("items.facilities"),
      beranda: t("items.beranda"),
      slider: t("items.slider"),
      statistik: t("items.statistik"),
      bagian: t("items.bagian"),
      pengaturan: t("items.pengaturan"),
      layanan: t("items.layanan"),
      kerjasama: t("items.kerjasama"),
      beasiswa: t("items.beasiswa"),
      prestasi: t("items.prestasi"),
      kegiatan: t("items.kegiatan"),
      dokumen: t("items.dokumen"),
      album: t("items.album"),
      agenda: t("items.agenda"),
      testimoni: t("items.testimoni"),
      fasilitas: t("items.fasilitas"),
      lecturerImport: t("items.lecturerImport"),
      new: t("items.new"),
      baru: t("items.baru"),
      edit: t("items.edit"),
    },
  };

  const headerTranslations = {
    items: sidebarTranslations.items,
    userMenuLabel: t("userMenuLabel"),
    changePassword: t("changePassword"),
    signOut: t("signOut"),
  };

  let userDisplayName = "Administrator";
  let userInitial = "A";

  if (session.ok) {
    const prisma = getPrismaClient();
    const user = await prisma.user.findUnique({
      where: { id: session.session.userId },
      select: { name: true, email: true },
    });
    if (user) {
      userDisplayName = user.name || user.email || "Administrator";
      userInitial = (user.name || user.email || "A").charAt(0).toUpperCase();
    }
  }

  async function handleSignOut() {
    "use server";
    await signOut();
  }

  return (
    <div className={`${FONT_VARIABLES} public-shell`}>
      <SkipLink />
      <AdminLayoutShell
        translations={sidebarTranslations}
        userDisplayName={userDisplayName}
        userInitial={userInitial}
        headerTranslations={headerTranslations}
        onSignOut={handleSignOut}
      >
        {children}
      </AdminLayoutShell>
    </div>
  );
}
