import {
  PartnershipCsvExportQuerySchema,
  PartnershipCsvResultSchema,
} from "@/contracts/public-content";
import {protectCsvFormulaCell} from "@/lib/security/sanitize";

import {
  actorOrNull,
  configuredLink,
  documentView,
  resolve,
  type Locale,
  type PublicContentDatabase,
} from "@/features/public-content/shared";

function jakartaDate(value: Date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Jakarta", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(value);
  const get = (type: "year" | "month" | "day") => parts.find((part) => part.type === type)?.value ?? "00";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

function dateCell(value: Date | null) {
  return value ? jakartaDate(value) : "";
}

export async function exportPartnershipCsv(
  prisma: PublicContentDatabase,
  rawActor: unknown,
  rawQuery: unknown,
  now = new Date(),
  uploadBase = "/uploads",
) {
  if (!actorOrNull(rawActor, now)) return {ok: false as const, code: "SESSION_INVALID" as const};
  const parsed = PartnershipCsvExportQuerySchema.safeParse(rawQuery);
  if (!parsed.success) return {ok: false as const, code: "REQUEST_INVALID" as const};
  const query = parsed.data; const locale = query.locale as Locale;
  const localeFilter = {status: "PUBLISHED" as const, locale: {in: locale === "id" ? ["id" as const] : [locale, "id" as const]}};
  try {
    const rows = await prisma.partnership.findMany({where: {
      ...(query.level ? {level: query.level} : {}), ...(query.activeOnly ? {isActive: true} : {}),
      translations: {some: localeFilter},
    }, take: 100_001, orderBy: [{order: "asc"}, {id: "asc"}], include: {
      translations: {where: localeFilter}, document: {include: {translations: {where: localeFilter}}},
    }});
    if (rows.length > 100_000) return {ok: false as const, code: "UNAVAILABLE" as const};
    const output = [];
    for (const row of rows) {
      const text = resolve(row.translations, locale);
      if (!text) return {ok: false as const, code: "UNAVAILABLE" as const};
      const website = row.websiteUrl === null ? null : configuredLink(row.websiteUrl);
      const legacy = row.documentUrl === null ? null : configuredLink(row.documentUrl);
      if (website === undefined || legacy === undefined || (website && website.kind !== "EXTERNAL") || (legacy && legacy.kind !== "EXTERNAL")) {
        return {ok: false as const, code: "UNAVAILABLE" as const};
      }
      const document = documentView(row.document, locale, uploadBase);
      const values = {
        partnerName: row.partnerName, level: row.level, country: row.country ?? "", category: text.category ?? "",
        startDate: dateCell(row.startDate), endDate: dateCell(row.endDate), websiteUrl: website?.href ?? "",
        evidenceUrl: document?.url ?? legacy?.href ?? "",
      };
      output.push(Object.fromEntries(Object.entries(values).map(([key, value]) => [key, protectCsvFormulaCell(value)])));
    }
    const result = PartnershipCsvResultSchema.safeParse({
      ok: true, filename: `fuspi-partnerships-${jakartaDate(now)}.csv`, rows: output,
    });
    return result.success ? result.data : {ok: false as const, code: "UNAVAILABLE" as const};
  } catch {
    return {ok: false as const, code: "UNAVAILABLE" as const};
  }
}
