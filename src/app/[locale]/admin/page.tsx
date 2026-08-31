import type { Metadata } from "next";
import {
  ArrowRightIcon,
  FileTextIcon,
  ImagesIcon,
  KeyRoundIcon,
  NewspaperIcon,
  PanelsTopLeftIcon,
  SettingsIcon,
  ShieldCheckIcon,
  SparklesIcon,
} from "lucide-react";
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
import { BookingOnlyAdminRoleSchema } from "@/contracts/auth";
import { decideProtectedRoute, getRequestSession } from "@/lib/auth/runtime/request-session";
import { parseAppLocale } from "@/lib/auth/runtime/redirect";

type AdminPageProps = { params: Promise<{ locale: string }> };

const dashboardModules = [
  {
    href: "/admin/beranda/pengaturan",
    icon: PanelsTopLeftIcon,
    titleKey: "modules.home.title",
    descriptionKey: "modules.home.description",
  },
  {
    href: "/admin/posts",
    icon: NewspaperIcon,
    titleKey: "modules.news.title",
    descriptionKey: "modules.news.description",
  },
  {
    href: "/admin/kolom",
    icon: SparklesIcon,
    titleKey: "modules.spotlight.title",
    descriptionKey: "modules.spotlight.description",
  },
  {
    href: "/admin/media",
    icon: ImagesIcon,
    titleKey: "modules.media.title",
    descriptionKey: "modules.media.description",
  },
  {
    href: "/admin/pages",
    icon: FileTextIcon,
    titleKey: "modules.pages.title",
    descriptionKey: "modules.pages.description",
  },
  {
    href: "/admin/fasilitas",
    icon: SettingsIcon,
    titleKey: "modules.facilities.title",
    descriptionKey: "modules.facilities.description",
  },
] as const;

export async function generateMetadata({ params }: AdminPageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "AdminLanding" });
  return { title: t("metaTitle"), robots: { index: false, follow: false } };
}

export default async function AdminPage({ params }: AdminPageProps) {
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
  if (session.ok && BookingOnlyAdminRoleSchema.safeParse(session.session.role).success) {
    redirect(`/${appLocale}/admin/peminjaman`);
  }

  const t = await getTranslations("AdminLanding");

  return (
    <section aria-labelledby="admin-landing-title" className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 rounded-lg border bg-card p-6 shadow-sm md:flex-row md:items-start md:justify-between">
        <div className="flex max-w-3xl flex-col gap-3">
          <div className="grid size-11 place-items-center rounded-lg bg-primary/10 text-primary">
            <ShieldCheckIcon aria-hidden className="size-6" />
          </div>
          <div className="flex flex-col gap-2">
            <h1 id="admin-landing-title" className="font-display text-2xl leading-tight">
              {t("title")}
            </h1>
            <p className="leading-relaxed text-muted-foreground">{t("description")}</p>
          </div>
        </div>
        <Button
          variant="outline"
          render={<Link href="/change-password" />}
          nativeButton={false}
          className="w-full md:w-auto"
        >
          <KeyRoundIcon data-icon="inline-start" />
          {t("changePassword")}
        </Button>
      </div>

      <div className="flex flex-col gap-3">
        <div>
          <h2 className="text-lg font-semibold">{t("quickActionsTitle")}</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            {t("quickActionsDescription")}
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {dashboardModules.map((item) => {
            const Icon = item.icon;
            return (
              <Card key={item.href} className="shadow-sm">
                <CardHeader className="gap-3">
                  <div className="grid size-10 place-items-center rounded-lg bg-muted text-foreground">
                    <Icon aria-hidden className="size-5" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <CardTitle className="text-base">{t(item.titleKey)}</CardTitle>
                    <CardDescription className="leading-relaxed">
                      {t(item.descriptionKey)}
                    </CardDescription>
                  </div>
                </CardHeader>
                <CardFooter>
                  <Button
                    variant="outline"
                    size="sm"
                    render={<Link href={item.href} />}
                    nativeButton={false}
                  >
                    {t("openModule")}
                    <ArrowRightIcon data-icon="inline-end" />
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      </div>

      <Card className="shadow-sm">
        <CardContent className="py-4">
          <p className="text-sm leading-relaxed text-muted-foreground">{t("securityNote")}</p>
        </CardContent>
      </Card>
    </section>
  );
}
