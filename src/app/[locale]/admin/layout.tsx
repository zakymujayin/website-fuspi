import { Amiri, IBM_Plex_Sans_Arabic, Inter, Plus_Jakarta_Sans } from "next/font/google";
import { setRequestLocale } from "next-intl/server";

import { SkipLink } from "@/components/public/skip-link";
import { AdminNav } from "@/components/admin/admin-nav";

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

  return (
    <div className={`${FONT_VARIABLES} public-shell min-h-screen bg-background`}>
      <SkipLink />
      <main id="main" tabIndex={-1} className="mx-auto w-full max-w-5xl px-4 py-12 outline-none sm:px-6">
        <AdminNav locale={locale} />
        {children}
      </main>
    </div>
  );
}
