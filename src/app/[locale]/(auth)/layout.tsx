import { Amiri, IBM_Plex_Sans_Arabic, Inter, Plus_Jakarta_Sans } from "next/font/google";
import { setRequestLocale } from "next-intl/server";
import { Suspense } from "react";

import { AuthDraftProvider } from "@/components/auth/auth-draft";
import { AuthLanguageSwitcher } from "@/components/auth/auth-language-switcher";
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

/**
 * The auth shell carries no public navigation, breadcrumb, or search: the only
 * chrome is the language switcher, which keeps the current path so switching
 * locale never discards what has been typed.
 */
export default async function AuthLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <div className={`${FONT_VARIABLES} public-shell flex min-h-screen flex-col bg-slate-50`}>
      {/* The provider spans switcher and form: it is what lets the two talk
          without the typed values ever leaving browser memory. */}
      <AuthDraftProvider>
        <SkipLink />
        <div className="flex justify-end p-4">
          {/* The switcher reads the query string to carry `next` across a locale
              change, so it must be allowed to bail out of prerendering here.
              The fallback holds its height to stop the card from jumping. */}
          <Suspense fallback={<div className="h-9" aria-hidden />}>
            <AuthLanguageSwitcher />
          </Suspense>
        </div>
        <main
          id="main"
          tabIndex={-1}
          className="flex flex-1 items-start justify-center px-4 pb-16 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset focus-visible:outline-none sm:items-center"
        >
          {children}
        </main>
      </AuthDraftProvider>
    </div>
  );
}
