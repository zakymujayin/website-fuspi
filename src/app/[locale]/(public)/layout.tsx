import { Amiri, IBM_Plex_Sans_Arabic, Inter, Plus_Jakarta_Sans } from "next/font/google";
import { setRequestLocale } from "next-intl/server";

import { SiteFooter } from "@/components/public/site-footer";
import { SiteHeader } from "@/components/public/site-header";
import { SkipLink } from "@/components/public/skip-link";

const display = Plus_Jakarta_Sans({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-plus-jakarta-sans",
});

const body = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
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

const FONT_VARIABLES = `${display.variable} ${body.variable} ${arabicUi.variable} ${arabicQuote.variable}`;

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
      <SiteHeader />
      {/* The header is sticky, so the skip link and any in-page anchor must clear
          its full 148px expanded height instead of landing underneath it. */}
      <main id="main" tabIndex={-1} className="flex-1 scroll-mt-[148px] outline-none">
        {children}
      </main>
      <SiteFooter />
    </div>
  );
}
