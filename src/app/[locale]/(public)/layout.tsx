import { Amiri, IBM_Plex_Sans_Arabic, Newsreader } from "next/font/google";
import { setRequestLocale } from "next-intl/server";

import { SiteFooter } from "@/components/public/site-footer";
import { SiteHeader } from "@/components/public/site-header";
import { SkipLink } from "@/components/public/skip-link";
import { OrganizationJsonLd } from "@/components/public/json-ld";

const editorial = Newsreader({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  variable: "--font-newsreader",
});

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

const FONT_VARIABLES = `${editorial.variable} ${arabicUi.variable} ${arabicQuote.variable}`;

export default async function PublicLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <div className={`${FONT_VARIABLES} public-shell flex min-h-screen flex-col`}>
      <SkipLink />
      <OrganizationJsonLd />
      <SiteHeader />
      <main id="main" tabIndex={-1} className="w-full max-w-full flex-1 overflow-x-hidden scroll-mt-[136px] outline-none">
        {children}
      </main>
      <SiteFooter />
    </div>
  );
}
