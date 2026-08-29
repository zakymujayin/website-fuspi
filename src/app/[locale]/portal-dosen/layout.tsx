import {Amiri, IBM_Plex_Sans_Arabic, Inter, Plus_Jakarta_Sans} from "next/font/google";
import {redirect} from "next/navigation";
import {getTranslations, setRequestLocale} from "next-intl/server";

import {signOut} from "@/auth";
import {PortalNav} from "@/components/portal/portal-nav";
import {SkipLink} from "@/components/public/skip-link";
import {Container} from "@/components/ui/container";
import {loadLecturerPortalProfile} from "@/features/lecturer-portal/domain";
import {parseAppLocale} from "@/lib/auth/runtime/redirect";
import {decideProtectedRoute, getRequestSession} from "@/lib/auth/runtime/request-session";
import {getPrismaClient} from "@/lib/db/client";

const display = Plus_Jakarta_Sans({subsets: ["latin"], display: "swap", variable: "--font-plus-jakarta-sans"});
const body = Inter({subsets: ["latin"], display: "swap", variable: "--font-inter"});
const arabicUi = IBM_Plex_Sans_Arabic({
  subsets: ["arabic"], weight: ["400", "500", "600", "700"], display: "swap",
  variable: "--font-ibm-plex-sans-arabic",
});
const arabicQuote = Amiri({subsets: ["arabic"], weight: ["400", "700"], display: "swap", variable: "--font-amiri"});
const FONT_VARIABLES = `${display.variable} ${body.variable} ${arabicUi.variable} ${arabicQuote.variable}`;

/**
 * The lecturer portal reuses the shared login page. What separates it from the
 * CMS is this guard plus the permission matrix, never a second sign-in screen.
 */
export default async function PortalDosenLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{locale: string}>;
}) {
  const {locale} = await params;
  setRequestLocale(locale);
  const appLocale = parseAppLocale(locale);

  const session = await getRequestSession();
  const decision = decideProtectedRoute(
    session,
    appLocale,
    `/${appLocale}/portal-dosen`,
    {roles: ["DOSEN"]},
  );
  if (!decision.allow) redirect(decision.redirectTo);

  /* A signed-in account that is not a lecturer has no business here. The load
     itself enforces the role and the account-to-record link, so a stray ADMIN
     or an unlinked DOSEN both fall through to the public site. */
  const profile = await loadLecturerPortalProfile(
    getPrismaClient(),
    session.ok ? session.session : null,
  );
  if (!profile.ok) redirect(`/${appLocale}`);

  const t = await getTranslations("LecturerPortal");

  async function handleSignOut() {
    "use server";
    await signOut();
  }

  return (
    <div className={`${FONT_VARIABLES} public-shell flex min-h-screen flex-col bg-slate-50`}>
      <SkipLink />
      <header className="border-b border-slate-200 bg-white">
        <Container className="flex flex-wrap items-center justify-between gap-4 py-4">
          <div>
            <p className="text-xs font-medium tracking-wide text-slate-400 uppercase">{t("shellLabel")}</p>
            <p dir="auto" className="font-display text-base font-semibold text-slate-900">{profile.data.name}</p>
          </div>
          <form action={handleSignOut}>
            <button
              type="submit"
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-royal-600"
            >
              {t("signOut")}
            </button>
          </form>
        </Container>
      </header>

      <PortalNav
        publicHref={`/dosen/${profile.data.slug}`}
        labels={{
          profile: t("navProfile"),
          education: t("navEducation"),
          publications: t("navPublications"),
          publicProfile: t("navPublicProfile"),
        }}
      />

      <main
        id="main"
        tabIndex={-1}
        className="flex-1 focus-visible:outline-none"
      >
        <Container className="py-10">{children}</Container>
      </main>
    </div>
  );
}
