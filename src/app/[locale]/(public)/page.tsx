import type {Metadata} from "next";
import {getTranslations, setRequestLocale} from "next-intl/server";
import NextImage from "next/image";
import {
  ArrowRight, BookOpen, Calendar, FileText, GraduationCap, Handshake, MapPin, Quote, Users,
} from "lucide-react";

import {Container} from "@/components/ui/container";
import {SectionHeading} from "@/components/public/section-heading";
import {PostCardHorizontal} from "@/components/public/post/post-card-horizontal";
import type {ResolvedCoverImage} from "@/components/public/post/cover-image";
import {institution} from "@/config/institution";
import {Link} from "@/i18n/navigation";
import type {AppLocale} from "@/i18n/routing";
import {createPrismaClient} from "@/lib/db/client";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://fuspi.uinbanten.ac.id";

export async function generateMetadata({params}: {params: Promise<{locale: string}>}): Promise<Metadata> {
  const {locale} = await params;
  const t = await getTranslations({locale, namespace: "Home"});
  return {
    title: {absolute: `${institution.name} — ${institution.university}`},
    description: t("heroSubtitle"),
    openGraph: {type: "website", siteName: institution.name, url: SITE_URL, description: t("heroSubtitle")},
    alternates: {languages: {id: `${SITE_URL}/id`, en: `${SITE_URL}/en`, ar: `${SITE_URL}/ar`}},
  };
}

/* ── Types ─────────────────────────────────────────── */

const POST_CARD_SELECT = {
  id: true, slug: true, publishedAt: true,
  author: {select: {name: true}},
  category: {select: {slug: true, translations: {where: {status: "PUBLISHED" as const}}}},
  coverMedia: {select: {id: true, storageKey: true, storageClass: true, mimeType: true, size: true, alt: true, isDecorative: true, width: true, height: true}},
  translations: {where: {status: "PUBLISHED" as const}, select: {locale: true, title: true, excerpt: true}},
} as const;

type PostCardRow = {
  id: string; slug: string; publishedAt: Date | null; author: {name: string} | null;
  category: {slug: string; translations: ReadonlyArray<{locale: string; title: string}>} | null;
  coverMedia: {id: string; storageKey: string; storageClass: string; mimeType: string; size: number; alt: string | null; isDecorative: boolean; width: number | null; height: number | null} | null;
  translations: ReadonlyArray<{locale: string; title: string; excerpt: string | null}>;
};

const SERVICE_SELECT = {
  id: true, slug: true, category: true, icon: true, url: true,
  translations: {where: {status: "PUBLISHED" as const}, select: {locale: true, name: true, description: true}},
} as const;
type ServiceRow = {id: string; slug: string; category: string; icon: string | null; url: string | null; translations: ReadonlyArray<{locale: string; name: string; description: string | null}>};

const PARTNER_SELECT = {
  id: true, partnerName: true,
  translations: {where: {status: "PUBLISHED" as const}, select: {locale: true, category: true}},
  logoMedia: {select: {id: true, storageKey: true, mimeType: true, alt: true, width: true, height: true}},
} as const;
type PartnerRow = {id: string; partnerName: string; translations: ReadonlyArray<{locale: string; category: string | null}>; logoMedia: {id: string; storageKey: string; mimeType: string; alt: string | null; width: number | null; height: number | null} | null};

const SITE_SETTING_SELECT = {
  deanName: true, deanPhoto: {select: {id: true, storageKey: true, mimeType: true, alt: true, width: true, height: true}},
  translations: {where: {status: "PUBLISHED" as const}, select: {locale: true, deanPosition: true, deanMessage: true}},
} as const;
type SiteSettingRow = {deanName: string | null; deanPhoto: {id: string; storageKey: string; mimeType: string; alt: string | null; width: number | null; height: number | null} | null; translations: ReadonlyArray<{locale: string; deanPosition: string | null; deanMessage: string | null}>};

const EVENT_SELECT = {
  id: true, slug: true, startAt: true,
  translations: {where: {status: "PUBLISHED" as const}, select: {locale: true, title: true, location: true}},
} as const;
type EventRow = {id: string; slug: string; startAt: Date; translations: ReadonlyArray<{locale: string; title: string; location: string | null}>};

/* ── Helpers ──────────────────────────────────────── */

const QUICK_ACTIONS = [
  {key: "services", href: "/layanan", icon: BookOpen},
  {key: "complaints", href: "/pengaduan", icon: FileText},
  {key: "pmb", href: "https://pmb.uinbanten.ac.id", icon: GraduationCap},
  {key: "agenda", href: "/agenda", icon: Calendar},
  {key: "e-learning", href: "https://elearning.uinbanten.ac.id", icon: BookOpen},
  {key: "siakad", href: "https://siakad.uinbanten.ac.id", icon: Users},
] as const;

function resolveLocale<T extends {locale: string}>(items: ReadonlyArray<T>, requested: AppLocale): T | undefined {
  return items.find((t) => t.locale === requested) ?? items.find((t) => t.locale === "id");
}
function formatDisplayDate(date: Date): string {
  const d = new Date(date);
  return `${String(d.getDate()).padStart(2, "0")} ${["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"][d.getMonth()]} ${d.getFullYear()}`;
}
function isoDate(y: number, m: number, d: number): string {return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;}
const PLACEHOLDER_COVER: ResolvedCoverImage = {kind: "placeholder"};
function coverView(media: PostCardRow["coverMedia"]): ResolvedCoverImage {
  if (!media || media.storageClass !== "PUBLIC") return PLACEHOLDER_COVER;
  return {kind: "image", src: `/uploads/${media.storageKey}`, width: media.width ?? 1200, height: media.height ?? 630, alt: media.alt ?? "", isDecorative: media.isDecorative};
}

/* ── Page ─────────────────────────────────────────── */

export default async function HomePage({params}: {params: Promise<{locale: AppLocale}>}) {
  const {locale} = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Home");
  const tNav = await getTranslations("Nav");
  const tProdi = await getTranslations("StudyPrograms");

  const prisma = createPrismaClient();
  let postRows: PostCardRow[] = [], services: ServiceRow[] = [], partners: PartnerRow[] = [], siteSetting: SiteSettingRow | null = null, announcements: PostCardRow[] = [], events: EventRow[] = [];
  let lecturerCount = 0, staffCount = 0;

  try {
    [postRows, services, partners, siteSetting, announcements, events, lecturerCount, staffCount] = await Promise.all([
      prisma.post.findMany({where: {status: "PUBLISHED", type: "BERITA"}, orderBy: {publishedAt: "desc"}, take: 5, select: POST_CARD_SELECT}) as Promise<PostCardRow[]>,
      prisma.service.findMany({where: {isActive: true}, take: 4, orderBy: {order: "asc"}, select: SERVICE_SELECT}) as Promise<ServiceRow[]>,
      prisma.partnership.findMany({where: {isActive: true}, take: 12, orderBy: {order: "asc"}, select: PARTNER_SELECT}) as Promise<PartnerRow[]>,
      prisma.siteSetting.findFirst({where: {id: "singleton"}, select: SITE_SETTING_SELECT}) as Promise<SiteSettingRow | null>,
      prisma.post.findMany({where: {status: "PUBLISHED", type: "PENGUMUMAN"}, orderBy: {publishedAt: "desc"}, take: 3, select: POST_CARD_SELECT}) as Promise<PostCardRow[]>,
      prisma.event.findMany({where: {isPublished: true, startAt: {gte: new Date()}}, orderBy: {startAt: "asc"}, take: 3, select: EVENT_SELECT}) as Promise<EventRow[]>,
      prisma.lecturer.count({where: {isActive: true}}) as Promise<number>,
      prisma.staff.count({where: {isActive: true}}) as Promise<number>,
    ]);
  } catch {}

  const featuredPost = postRows[0];
  const sidePosts = postRows.slice(1, 5);
  const deanTl = siteSetting ? resolveLocale(siteSetting.translations, locale) : null;
  const deanName = siteSetting?.deanName ?? t("deanFallbackName");
  const deanPosition = deanTl?.deanPosition ?? t("deanFallbackPosition");
  const deanMessage = deanTl?.deanMessage ?? t("deanFallbackMessage");
  const deanPhoto = siteSetting?.deanPhoto ?? null;

  return (
    <>
      {/* ── HERO ─────────────────────────────────── */}
      <section className="relative flex min-h-[min(620px,100dvh)] items-center bg-navy-900">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(65,105,225,.15),transparent_60%)]" />
        <Container className="relative z-10 py-16 md:py-24">
          <div className="flex max-w-3xl flex-col items-start gap-6">
            <h1 className="font-display text-4xl font-bold tracking-tight text-white md:text-5xl md:leading-tight">
              {t("heroTitle")}
            </h1>
            <p className="max-w-prose text-base text-slate-300 md:text-lg md:leading-relaxed">
              {t("heroSubtitle")}
            </p>
            <div className="flex flex-wrap gap-3">
              <Link href="/profil" className="inline-flex h-11 items-center rounded-lg bg-royal-500 px-5 text-sm font-medium text-white transition-all duration-200 hover:bg-royal-600 active:scale-[0.98]">{t("heroCtaPrimary")}</Link>
              <Link href="/prodi" className="inline-flex h-11 items-center rounded-lg border border-white/20 px-5 text-sm font-medium text-white transition-all duration-200 hover:border-white/40 hover:bg-white/5 active:scale-[0.98]">{t("heroCtaSecondary")}</Link>
            </div>
          </div>
        </Container>
      </section>

      {/* ── QUICK ACTIONS ────────────────────────── */}
      <section className="border-b border-slate-200 bg-white py-8">
        <Container>
          <nav aria-label={t("quickLinksLabel")} className="flex flex-wrap justify-center gap-3 md:gap-4">
            {QUICK_ACTIONS.map(({key, href, icon: Icon}) => (
              <Link key={key} href={href} target={href.startsWith("http") ? "_blank" : undefined}
                className="inline-flex h-11 items-center gap-2.5 rounded-lg border border-slate-200 px-4 text-sm font-medium text-slate-700 transition-all duration-200 hover:border-royal-200 hover:bg-royal-50 hover:text-royal-600 active:scale-[0.98]">
                <Icon data-icon aria-hidden className="size-4" strokeWidth={1.5} />
                {tNav(`quick.${key}`)}
              </Link>
            ))}
          </nav>
        </Container>
      </section>

      {/* ── DEAN WELCOME ────────────────────────── */}
      <section className="bg-slate-50 py-16 md:py-24">
        <Container>
          <div className="grid items-center gap-10 lg:grid-cols-5">
            {deanPhoto ? (
              <div className="lg:col-span-2">
                <div className="mx-auto max-w-xs overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                  <NextImage
                    src={`/uploads/${deanPhoto.storageKey}`}
                    alt={deanPhoto.alt ?? deanName}
                    width={deanPhoto.width ?? 400} height={deanPhoto.height ?? 500}
                    unoptimized
                    className="aspect-[3/4] w-full object-cover"
                  />
                </div>
              </div>
            ) : (
              <div className="lg:col-span-2">
                <div className="mx-auto grid size-40 place-items-center rounded-2xl border border-slate-200 bg-white shadow-sm md:size-48">
                  <span className="font-display text-4xl font-bold text-royal-200">{institution.shortName}</span>
                </div>
              </div>
            )}
            <div className="lg:col-span-3">
              <span className="text-[11px] font-medium tracking-wide text-royal-600 uppercase">{t("deanWelcome")}</span>
              <div className="mt-4">
                <blockquote className="relative border-s-0 ps-0">
                  <Quote data-icon aria-hidden className="absolute -start-1 -top-2 size-8 text-royal-100 rtl:rotate-180" strokeWidth={1} />
                  <div className="ps-8">
                    <p className="text-lg leading-relaxed text-slate-600 md:text-xl md:leading-relaxed">
                      {deanMessage}
                    </p>
                  </div>
                </blockquote>
                <div className="mt-6">
                  <p className="font-display text-lg font-semibold text-slate-900">{deanName}</p>
                  <p className="text-sm text-slate-500">{deanPosition}</p>
                </div>
              </div>
            </div>
          </div>
        </Container>
      </section>

      {/* ── STATS ────────────────────────────────── */}
      <section className="border-y border-slate-200 bg-white py-12 md:py-16">
        <Container>
          <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
            <div className="text-center">
              <p className="font-display text-3xl font-bold tracking-tight text-royal-600 md:text-4xl">
                {lecturerCount > 0 ? lecturerCount.toLocaleString("id-ID") : "—"}
              </p>
              <p className="mt-1 text-sm text-slate-500">{t("statsLecturers")}</p>
            </div>
            <div className="text-center">
              <p className="font-display text-3xl font-bold tracking-tight text-royal-600 md:text-4xl">
                {staffCount > 0 ? staffCount.toLocaleString("id-ID") : "—"}
              </p>
              <p className="mt-1 text-sm text-slate-500">{t("statsStaff")}</p>
            </div>
            <div className="text-center">
              <p className="font-display text-3xl font-bold tracking-tight text-royal-600 md:text-4xl">
                {institution.studyPrograms.length}
              </p>
              <p className="mt-1 text-sm text-slate-500">{t("statsPrograms")}</p>
            </div>
            <div className="text-center">
              <p className="font-display text-3xl font-bold tracking-tight text-royal-600 md:text-4xl">
                {partners.length > 0 ? partners.length.toString() : "—"}
              </p>
              <p className="mt-1 text-sm text-slate-500">{t("statsPartners")}</p>
            </div>
          </div>
        </Container>
      </section>

      {/* ── FUSPI INTRO ─────────────────────────── */}
      <section className="bg-white py-16 md:py-24">
        <Container>
          <div className="grid gap-10 lg:grid-cols-2 lg:gap-16">
            <div>
              <span className="text-[11px] font-medium tracking-wide text-royal-600 uppercase">{t("introLabel")}</span>
              <h2 className="section-rule mt-3 font-display text-2xl font-bold tracking-tight text-slate-900 md:text-[28px]">
                {t("introTitle")}
              </h2>
              <p className="mt-6 text-base leading-relaxed text-slate-600">{t("introDescription")}</p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link href="/profil" className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-royal-500 px-4 text-sm font-medium text-white transition-all duration-200 hover:bg-royal-600 active:scale-[0.98]">
                  {t("introCtaProfile")} <ArrowRight aria-hidden className="size-3.5" strokeWidth={1.5} />
                </Link>
                <Link href="/prodi" className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-slate-300 px-4 text-sm font-medium text-slate-700 transition-all duration-200 hover:bg-slate-100 active:scale-[0.98]">
                  {t("introCtaPrograms")}
                </Link>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {[
                {label: t("introCardVision"), desc: t("introCardVisionDesc"), href: "/profil", icon: BookOpen},
                {label: t("introCardPrograms"), desc: t("introCardProgramsDesc"), href: "/prodi", icon: GraduationCap},
                {label: t("introCardLecturers"), desc: t("introCardLecturersDesc"), href: "/dosen", icon: Users},
                {label: t("introCardContact"), desc: t("introCardContactDesc"), href: "/kontak", icon: Handshake},
              ].map((item) => (
                <Link key={item.label} href={item.href}
                  className="group flex flex-col gap-2 rounded-xl border border-slate-200 bg-slate-50 p-5 transition-all duration-200 hover:-translate-y-0.5 hover:border-royal-200 hover:shadow-sm">
                  <span className="flex size-8 items-center justify-center rounded-lg bg-royal-50 text-royal-600">
                    <item.icon data-icon aria-hidden className="size-3.5" strokeWidth={1.5} />
                  </span>
                  <h3 className="font-display text-[14px] font-semibold text-slate-900">{item.label}</h3>
                  <p className="text-xs leading-relaxed text-slate-500">{item.desc}</p>
                </Link>
              ))}
            </div>
          </div>
        </Container>
      </section>

      {/* ── STUDY PROGRAMS ────────────────────────── */}
      <section className="bg-slate-50 py-16 md:py-24">
        <Container>
          <SectionHeading as="h2" id="programs" title={tProdi("title")} description={tProdi("description")} />
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-5">
            {institution.studyPrograms.map((program, i) => (
              <Link key={program.code} href={`/prodi/${program.slug}`}
                className="group flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
                <span className="font-display text-3xl font-bold tracking-tight text-royal-100 transition-colors group-hover:text-royal-200">{String(i + 1).padStart(2, "0")}</span>
                <div>
                  <span className="text-[11px] font-medium tracking-wide text-royal-600 uppercase">{program.code}</span>
                  <h3 className="mt-1 font-display text-[15px] font-semibold leading-snug text-balance text-slate-900">{tNav(`program.${program.code}`)}</h3>
                </div>
                <span className="mt-auto inline-flex items-center gap-1.5 text-xs font-medium text-royal-600 transition-transform group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5">{tProdi("readMore")}<ArrowRight aria-hidden className="size-3" strokeWidth={1.5} /></span>
              </Link>
            ))}
          </div>
        </Container>
      </section>

      {/* ── ANNOUNCEMENTS + EVENTS ────────────────── */}
      {announcements.length > 0 || events.length > 0 ? (
        <section className="bg-white py-16 md:py-24">
          <Container>
            <div className="grid gap-12 lg:grid-cols-2">
              {announcements.length > 0 ? (
                <div>
                  <div className="flex flex-wrap items-end justify-between gap-4">
                    <SectionHeading as="h2" id="announcements" title={t("announcementsTitle")} />
                    <Link href="/pengumuman" className="inline-flex items-center gap-1.5 text-sm font-medium text-royal-600 transition-colors hover:text-royal-700">{t("viewAll")}<ArrowRight aria-hidden className="size-4 rtl:rotate-180" strokeWidth={1.5} /></Link>
                  </div>
                  <div className="mt-8 space-y-6">
                    {announcements.map((a) => (
                      <Link key={a.id} href={`/berita/${a.slug}`} className="group flex items-start gap-4 rounded-lg p-2 -mx-2 transition-colors hover:bg-slate-50">
                        <time dateTime={a.publishedAt ? isoDate(a.publishedAt.getFullYear(), a.publishedAt.getMonth() + 1, a.publishedAt.getDate()) : ""} className="shrink-0 rounded-lg border border-slate-200 bg-white px-3 py-2 text-center text-xs leading-tight">
                          <span className="block text-[10px] font-medium uppercase text-slate-400">{a.publishedAt ? ["Jan","Feb","Mar","Apr","Mei","Jun","Jul","Agu","Sep","Okt","Nov","Des"][a.publishedAt.getMonth()] : ""}</span>
                          <span className="block font-display text-lg font-bold text-slate-700">{a.publishedAt ? String(a.publishedAt.getDate()).padStart(2, "0") : ""}</span>
                        </time>
                        <div>
                          <h3 className="line-clamp-2 font-display text-[15px] font-semibold text-slate-900 transition-colors group-hover:text-royal-600">{resolveLocale(a.translations, locale)?.title ?? ""}</h3>
                          {resolveLocale(a.translations, locale)?.excerpt ? (
                            <p className="mt-1 line-clamp-1 text-sm text-slate-500">{resolveLocale(a.translations, locale)?.excerpt}</p>
                          ) : null}
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              ) : null}
              {events.length > 0 ? (
                <div>
                  <div className="flex flex-wrap items-end justify-between gap-4">
                    <SectionHeading as="h2" id="events" title={t("eventsTitle")} />
                    <Link href="/agenda" className="inline-flex items-center gap-1.5 text-sm font-medium text-royal-600 transition-colors hover:text-royal-700">{t("viewAll")}<ArrowRight aria-hidden className="size-4 rtl:rotate-180" strokeWidth={1.5} /></Link>
                  </div>
                  <div className="mt-8 space-y-6">
                    {events.map((e) => {
                      const tl = resolveLocale(e.translations, locale);
                      return (
                        <Link key={e.id} href={`/agenda/${e.slug}`} className="group flex items-start gap-4 rounded-lg p-2 -mx-2 transition-colors hover:bg-slate-50">
                          <time dateTime={isoDate(e.startAt.getFullYear(), e.startAt.getMonth() + 1, e.startAt.getDate())} className="shrink-0 rounded-lg border border-slate-200 bg-white px-3 py-2 text-center text-xs leading-tight">
                            <span className="block text-[10px] font-medium uppercase text-slate-400">{["Jan","Feb","Mar","Apr","Mei","Jun","Jul","Agu","Sep","Okt","Nov","Des"][e.startAt.getMonth()]}</span>
                            <span className="block font-display text-lg font-bold text-slate-700">{String(e.startAt.getDate()).padStart(2, "0")}</span>
                          </time>
                          <div>
                            <h3 className="line-clamp-2 font-display text-[15px] font-semibold text-slate-900 transition-colors group-hover:text-royal-600">{tl?.title ?? ""}</h3>
                            {tl?.location ? (
                              <p className="mt-1 inline-flex items-center gap-1 text-xs text-slate-400"><MapPin data-icon aria-hidden className="size-3" strokeWidth={1.5} />{tl.location}</p>
                            ) : null}
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ) : null}
            </div>
          </Container>
        </section>
      ) : null}

      {/* ── NEWS ──────────────────────────────────── */}
      <section className="bg-slate-50 py-16 md:py-24">
        <Container>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <SectionHeading as="h2" id="news" title={t("newsTitle")} />
            <Link href="/berita" className="inline-flex items-center gap-1.5 text-sm font-medium text-royal-600 transition-colors hover:text-royal-700">{t("viewAll")}<ArrowRight aria-hidden className="size-4 rtl:rotate-180" strokeWidth={1.5} /></Link>
          </div>
          {postRows.length > 0 ? (
            <div className="mt-10 grid gap-8 lg:grid-cols-2">
              {featuredPost ? (
                <PostCardHorizontal href={`/berita/${featuredPost.slug}`} title={resolveLocale(featuredPost.translations, locale)?.title ?? ""}
                  excerpt={resolveLocale(featuredPost.translations, locale)?.excerpt ?? null} resolvedLocale={locale} cover={coverView(featuredPost.coverMedia)}
                  authorName={featuredPost.author?.name ?? null}
                  dateLabel={featuredPost.publishedAt ? formatDisplayDate(featuredPost.publishedAt) : ""}
                  dateTimeIso={featuredPost.publishedAt ? isoDate(featuredPost.publishedAt.getFullYear(), featuredPost.publishedAt.getMonth() + 1, featuredPost.publishedAt.getDate()) : ""}
                  categoryLabel={resolveLocale(featuredPost.category?.translations ?? [], locale)?.title ?? null} readMoreLabel={t("readMore")} />
              ) : null}
              <div className="flex flex-col divide-y divide-slate-100">
                {sidePosts.map((p) => (
                  <PostCardHorizontal key={p.id} href={`/berita/${p.slug}`} title={resolveLocale(p.translations, locale)?.title ?? ""}
                    excerpt={resolveLocale(p.translations, locale)?.excerpt ?? null} resolvedLocale={locale} cover={coverView(p.coverMedia)}
                    authorName={p.author?.name ?? null}
                    dateLabel={p.publishedAt ? formatDisplayDate(p.publishedAt) : ""}
                    dateTimeIso={p.publishedAt ? isoDate(p.publishedAt.getFullYear(), p.publishedAt.getMonth() + 1, p.publishedAt.getDate()) : ""}
                    categoryLabel={resolveLocale(p.category?.translations ?? [], locale)?.title ?? null} readMoreLabel={t("readMore")} />
                ))}
              </div>
            </div>
          ) : (
            <div className="mt-10 rounded-xl border border-slate-200 bg-white p-8 text-center md:p-12">
              <p className="font-display text-lg font-semibold text-slate-900">{t("newsEmptyTitle")}</p>
              <p className="mt-2 text-sm text-slate-500">{t("newsEmptyDescription")}</p>
            </div>
          )}
        </Container>
      </section>

      {/* ── SERVICES ──────────────────────────────── */}
      {services.length > 0 ? (
        <section className="bg-white py-16 md:py-24">
          <Container>
            <SectionHeading as="h2" id="services-section" title={t("servicesTitle")} description={t("servicesDescription")} />
            <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {services.map((s) => {
                const tl = resolveLocale(s.translations, locale);
                return (
                  <article key={s.id} className="group flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
                    {s.icon ? (<span className="inline-flex size-10 items-center justify-center rounded-lg bg-royal-50 text-royal-600"><BookOpen data-icon aria-hidden className="size-5" strokeWidth={1.5} /></span>) : null}
                    <div>
                      <h3 className="font-display text-[15px] font-semibold leading-snug text-slate-900">{tl?.name ?? ""}</h3>
                      {tl?.description ? (<p className="mt-1.5 line-clamp-2 text-sm text-slate-500">{tl.description}</p>) : null}
                    </div>
                    <Link href={s.url ?? `/layanan/${s.slug}`} className="mt-auto inline-flex items-center gap-1.5 text-xs font-medium text-royal-600 transition-transform group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5">{t("readMore")}<ArrowRight aria-hidden className="size-3" strokeWidth={1.5} /></Link>
                  </article>
                );
              })}
            </div>
          </Container>
        </section>
      ) : null}

      {/* ── PARTNERSHIPS ──────────────────────────── */}
      {partners.length > 0 ? (
        <section className="bg-slate-50 py-16 md:py-24">
          <Container>
            <SectionHeading as="h2" id="partners" title={t("partnersTitle")} />
            <div className="mt-10 grid grid-cols-2 gap-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
              {partners.map((p) => (
                <div key={p.id} className="flex items-center justify-center rounded-xl border border-slate-100 bg-white p-4 transition-shadow duration-200 hover:shadow-sm">
                  {p.logoMedia ? (
                    <NextImage src={`/uploads/${p.logoMedia.storageKey}`} alt={p.logoMedia.alt ?? p.partnerName ?? ""} width={p.logoMedia.width ?? 200} height={p.logoMedia.height ?? 80} unoptimized
                      className="max-h-10 max-w-full object-contain opacity-70 grayscale transition-opacity duration-200 hover:opacity-100" />
                  ) : (<span className="text-xs font-medium text-slate-400">{p.partnerName}</span>)}
                </div>
              ))}
            </div>
          </Container>
        </section>
      ) : null}

      {/* ── CTA ───────────────────────────────────── */}
      <section className="bg-navy-900 py-16 md:py-24">
        <Container>
          <div className="flex max-w-2xl flex-col items-center gap-5 text-center md:items-start md:text-start">
            <h2 className="font-display text-2xl font-bold tracking-tight text-white md:text-3xl">{t("footerCtaTitle")}</h2>
            <p className="max-w-prose text-base text-slate-300">{t("footerCtaDescription")}</p>
            <Link href="/kontak" className="inline-flex h-11 items-center gap-2 rounded-lg bg-brass-500 px-5 text-sm font-medium text-white transition-all duration-200 hover:bg-brass-600 active:scale-[0.98]">
              <Handshake data-icon aria-hidden className="size-4" strokeWidth={1.5} />{t("footerCtaButton")}
            </Link>
          </div>
        </Container>
      </section>
    </>
  );
}
