import type {Metadata} from "next";
import {redirect} from "next/navigation";
import {getTranslations, setRequestLocale} from "next-intl/server";

export async function generateMetadata({params}: {params: Promise<{locale: string}>}): Promise<Metadata> {
  const {locale} = await params;
  const t = await getTranslations({locale, namespace: "Nav"});
  return {title: t("profile")};
}

export default async function ProfilePage({params}: {params: Promise<{locale: string}>}) {
  const {locale} = await params;
  setRequestLocale(locale);
  redirect(`/${locale}/profil/sejarah`);
}
