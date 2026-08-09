import type { Metadata } from "next";
import { KeyRoundIcon, ShieldCheckIcon } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Link } from "@/i18n/navigation";
import { decideProtectedRoute, getRequestSession } from "@/lib/auth/runtime/request-session";
import { parseAppLocale } from "@/lib/auth/runtime/redirect";

type AdminPageProps = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: AdminPageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "AdminLanding" });
  return { title: t("metaTitle"), robots: { index: false, follow: false } };
}

export default async function AdminPage({ params }: AdminPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  const appLocale = parseAppLocale(locale);
  const decision = decideProtectedRoute(
    await getRequestSession(),
    appLocale,
    `/${appLocale}/admin`,
  );
  if (!decision.allow) redirect(decision.redirectTo);

  const t = await getTranslations("AdminLanding");

  return (
    <section aria-labelledby="admin-landing-title" className="flex min-h-[70vh] items-center">
      <Card className="mx-auto w-full max-w-2xl shadow-md">
        <CardHeader className="gap-4">
          <div className="grid size-11 place-items-center rounded-lg bg-primary/10 text-primary">
            <ShieldCheckIcon aria-hidden className="size-6" />
          </div>
          <CardTitle>
            <h1 id="admin-landing-title" className="font-display text-2xl">
              {t("title")}
            </h1>
          </CardTitle>
          <CardDescription className="max-w-prose leading-relaxed">
            {t("description")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm leading-relaxed text-muted-foreground">{t("securityNote")}</p>
        </CardContent>
        <CardFooter className="justify-end">
          <Button
            variant="outline"
            render={<Link href="/change-password" />}
            nativeButton={false}
          >
            <KeyRoundIcon data-icon="inline-start" />
            {t("changePassword")}
          </Button>
        </CardFooter>
      </Card>
    </section>
  );
}
