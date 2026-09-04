"use client";

import {
  ArrowUpRight,
  BookOpenCheck,
  CalendarDays,
  Copyright,
  ExternalLink,
  GraduationCap,
  HeartHandshake,
  MapPin,
} from "lucide-react";
import {useMemo, useState} from "react";

import {Link} from "@/i18n/navigation";

export type LecturerResearchRecord = {
  id: string;
  title: string;
  year: number;
  url: string | null;
};

export type LecturerCommunityRecord = {
  id: string;
  title: string;
  year: number;
  location: string | null;
  url: string | null;
};

export type LecturerHkiRecord = {
  id: string;
  title: string;
  type: string;
  year: number | null;
  registrationNumber: string | null;
  url: string | null;
};

export type LecturerTeachingRecord = {
  id: string;
  code: string;
  course: string;
  program: string;
  credits: number;
  academicYear?: string;
  academicYearStart: number;
  academicYearEnd: number;
  term: "odd" | "even";
  semester: number;
};

export type LecturerAcademicRecordsLabels = {
  research: string;
  researchDescription: string;
  community: string;
  communityDescription: string;
  hki: string;
  hkiDescription: string;
  teaching: string;
  teachingDescription: string;
  noRecords: string;
  viewArchive: string;
  viewDocument: string;
  location: string;
  academicYear: string;
  termOdd: string;
  termEven: string;
  allPeriods: string;
  period: string;
  noTeaching: string;
  teachingPending: string;
  code: string;
  course: string;
  program: string;
  credits: string;
};

type Props = {
  research: readonly LecturerResearchRecord[];
  community: readonly LecturerCommunityRecord[];
  hki: readonly LecturerHkiRecord[];
  teaching: readonly LecturerTeachingRecord[];
  labels: LecturerAcademicRecordsLabels;
};

function EmptyState({children}: {children: string}) {
  return (
    <p className="border-s-2 border-slate-200 ps-4 text-sm leading-relaxed text-slate-500">
      {children}
    </p>
  );
}

function RecordLink({href, children, label}: {href: string; children: string; label: string}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-royal-600 underline-offset-4 transition-colors hover:text-royal-800 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-royal-600"
    >
      {children}
      <ExternalLink aria-hidden className="size-3.5" strokeWidth={1.7} />
    </a>
  );
}

export function teachingPeriods(
  teaching: readonly LecturerTeachingRecord[],
  labels: {termOdd: string; termEven: string},
): ReadonlyArray<{key: string; label: string}> {
  const seen = new Map<string, {key: string; label: string; start: number; term: string}>();
  for (const item of teaching) {
    const key = `${item.academicYearStart}-${item.term}`;
    if (seen.has(key)) continue;
    const termLabel = item.term === "odd" ? labels.termOdd : labels.termEven;
    seen.set(key, {
      key,
      label: `${termLabel} ${item.academicYearStart}/${item.academicYearEnd}`,
      start: item.academicYearStart,
      term: item.term,
    });
  }
  return [...seen.values()]
    // Genap (even) of a given academic year falls later on the calendar than its Ganjil (odd).
    .sort((a, b) => b.start - a.start || (a.term === "even" ? -1 : 1))
    .map(({key, label}) => ({key, label}));
}

export function LecturerAcademicRecords({research, community, hki, teaching, labels}: Props) {
  const [selectedPeriod, setSelectedPeriod] = useState<string>("all");
  const periods = useMemo(() => teachingPeriods(teaching, labels), [teaching, labels]);
  const filteredTeaching = selectedPeriod === "all"
    ? teaching
    : teaching.filter((item) => `${item.academicYearStart}-${item.term}` === selectedPeriod);

  return (
    <div className="mt-14 border-t border-slate-200 pt-10">
      <div className="grid gap-12">
        <section id="lecturer-research" aria-labelledby="lecturer-research-title" className="scroll-mt-28 rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_12px_32px_-24px_rgba(15,23,42,0.25)] md:p-8">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-royal-50 text-royal-600">
              <BookOpenCheck aria-hidden className="size-4.5" strokeWidth={1.6} />
            </span>
            <div>
              <h2 id="lecturer-research-title" className="font-display text-xl font-semibold tracking-tight text-slate-950">{labels.research}</h2>
              <p className="mt-1 max-w-prose text-sm leading-relaxed text-slate-500">{labels.researchDescription}</p>
            </div>
          </div>
          {research.length > 0 ? (
            <ol className="mt-6 divide-y divide-slate-200 border-y border-slate-200">
              {research.map((item) => (
                <li key={item.id} className="py-4 first:pt-6 last:pb-6 md:first:pt-8 md:last:pb-8">
                  <div className="grid gap-2 sm:grid-cols-[4rem_1fr] sm:gap-5">
                    <span className="font-mono text-xs tabular-nums text-slate-400">{item.year}</span>
                    <div>
                      <h3 className="text-sm font-semibold leading-relaxed text-slate-800"><span dir="auto">{item.title}</span></h3>
                      {item.url ? <RecordLink href={item.url} label={labels.viewDocument}>{labels.viewDocument}</RecordLink> : null}
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          ) : <div className="mt-6"><EmptyState>{labels.noRecords}</EmptyState></div>}
          <Link href="/penelitian" className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-royal-600 transition-colors hover:text-royal-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-royal-600">
            {labels.viewArchive}<ArrowUpRight aria-hidden className="size-4" strokeWidth={1.7} />
          </Link>
        </section>

        <section id="lecturer-community" aria-labelledby="lecturer-community-title" className="scroll-mt-28 rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_12px_32px_-24px_rgba(15,23,42,0.25)] md:p-8">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-royal-50 text-royal-600">
              <HeartHandshake aria-hidden className="size-4.5" strokeWidth={1.6} />
            </span>
            <div>
              <h2 id="lecturer-community-title" className="font-display text-xl font-semibold tracking-tight text-slate-950">{labels.community}</h2>
              <p className="mt-1 max-w-prose text-sm leading-relaxed text-slate-500">{labels.communityDescription}</p>
            </div>
          </div>
          {community.length > 0 ? (
            <ol className="mt-6 divide-y divide-slate-200 border-y border-slate-200">
              {community.map((item) => (
                <li key={item.id} className="py-4 first:pt-6 last:pb-6 md:first:pt-8 md:last:pb-8">
                  <div className="grid gap-2 sm:grid-cols-[4rem_1fr] sm:gap-5">
                    <span className="font-mono text-xs tabular-nums text-slate-400">{item.year}</span>
                    <div>
                      <h3 className="text-sm font-semibold leading-relaxed text-slate-800"><span dir="auto">{item.title}</span></h3>
                      {item.location ? <p className="mt-1 inline-flex items-center gap-1.5 text-xs text-slate-500"><MapPin aria-hidden className="size-3.5" strokeWidth={1.6} /><span dir="auto">{item.location}</span></p> : null}
                      {item.url ? <RecordLink href={item.url} label={labels.viewDocument}>{labels.viewDocument}</RecordLink> : null}
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          ) : <div className="mt-6"><EmptyState>{labels.noRecords}</EmptyState></div>}
          <Link href="/pengabdian" className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-royal-600 transition-colors hover:text-royal-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-royal-600">
            {labels.viewArchive}<ArrowUpRight aria-hidden className="size-4" strokeWidth={1.7} />
          </Link>
        </section>

        <section id="lecturer-hki" aria-labelledby="lecturer-hki-title" className="scroll-mt-28 rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_12px_32px_-24px_rgba(15,23,42,0.25)] md:p-8">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-royal-50 text-royal-600">
              <Copyright aria-hidden className="size-4.5" strokeWidth={1.6} />
            </span>
            <div>
              <h2 id="lecturer-hki-title" className="font-display text-xl font-semibold tracking-tight text-slate-950">{labels.hki}</h2>
              <p className="mt-1 max-w-prose text-sm leading-relaxed text-slate-500">{labels.hkiDescription}</p>
            </div>
          </div>
          {hki.length > 0 ? (
            <ol className="mt-6 divide-y divide-slate-200 border-y border-slate-200">
              {hki.map((item) => (
                <li key={item.id} className="py-4 first:pt-6 last:pb-6 md:first:pt-8 md:last:pb-8">
                  <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <h3 className="text-sm font-semibold leading-relaxed text-slate-800"><span dir="auto">{item.title}</span></h3>
                    <span className="text-xs text-slate-400">{item.type}</span>
                    {item.year ? <span className="font-mono text-xs tabular-nums text-slate-400">{item.year}</span> : null}
                  </div>
                  {item.registrationNumber ? <p className="mt-1 text-xs text-slate-500">{item.registrationNumber}</p> : null}
                  {item.url ? <RecordLink href={item.url} label={labels.viewDocument}>{labels.viewDocument}</RecordLink> : null}
                </li>
              ))}
            </ol>
          ) : <div className="mt-6"><EmptyState>{labels.noRecords}</EmptyState></div>}
        </section>

        <section id="lecturer-teaching" aria-labelledby="lecturer-teaching-title" className="scroll-mt-28 rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_12px_32px_-24px_rgba(15,23,42,0.25)] md:p-8">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-royal-50 text-royal-600">
              <GraduationCap aria-hidden className="size-4.5" strokeWidth={1.6} />
            </span>
            <div>
              <h2 id="lecturer-teaching-title" className="font-display text-xl font-semibold tracking-tight text-slate-950">{labels.teaching}</h2>
              <p className="mt-1 max-w-prose text-sm leading-relaxed text-slate-500">{labels.teachingDescription}</p>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-3 border-y border-slate-200 py-3">
            <label htmlFor="lecturer-period" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700">
              <CalendarDays aria-hidden className="size-4 text-royal-600" strokeWidth={1.6} />
              {labels.period}
            </label>
            <select
              id="lecturer-period"
              value={selectedPeriod}
              onChange={(event) => setSelectedPeriod(event.target.value)}
              disabled={periods.length === 0}
              className="min-h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700 outline-none transition-colors focus:border-royal-500 focus:ring-2 focus:ring-royal-100 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400"
            >
              <option value="all">{labels.allPeriods}</option>
              {periods.map((period) => <option key={period.key} value={period.key}>{period.label}</option>)}
            </select>
          </div>

          {filteredTeaching.length > 0 ? (
            <div className="mt-6 overflow-x-auto border border-slate-200">
              <table className="w-full min-w-[42rem] border-collapse text-start text-sm">
                <thead className="bg-navy-800 text-xs font-semibold uppercase tracking-[0.1em] text-white">
                  <tr>
                    <th scope="col" className="px-4 py-3 text-start">{labels.code}</th>
                    <th scope="col" className="px-4 py-3 text-start">{labels.course}</th>
                    <th scope="col" className="px-4 py-3 text-start">{labels.program}</th>
                    <th scope="col" className="px-4 py-3 text-start">{labels.academicYear}</th>
                    <th scope="col" className="px-4 py-3 text-start">{labels.credits}</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTeaching.map((item) => (
                    <tr key={item.id} className="border-b border-slate-100 last:border-b-0 hover:bg-royal-50/50">
                      <td className="px-4 py-3 font-mono text-xs text-slate-500">{item.code}</td>
                      <td className="px-4 py-3 font-medium text-slate-800"><span dir="auto">{item.course}</span></td>
                      <td className="px-4 py-3 text-slate-600">{item.program}</td>
                      <td className="px-4 py-3 text-slate-600"><span className="font-mono text-xs">{item.academicYear}</span><span className="mt-1 block text-xs text-slate-400">{item.term === "odd" ? labels.termOdd : labels.termEven}</span></td>
                      <td className="px-4 py-3 tabular-nums text-slate-600">{item.credits}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="mt-6 grid gap-2 border-s-2 border-brass-500 bg-brass-400/10 px-4 py-4">
              <p className="text-sm font-semibold text-slate-800">{labels.noTeaching}</p>
              <p className="text-sm leading-relaxed text-slate-500">{labels.teachingPending}</p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
