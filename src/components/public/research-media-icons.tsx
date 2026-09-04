import type {JSX} from "react";

import {CmsHttpsExternalUrlSchema} from "@/contracts/cms";

type IconProps = {className?: string};

export type ResearchMediaSource = {
  googleScholarUrl: string | null;
  scopusUrl: string | null;
  sintaUrl: string | null;
  orcid: string | null;
  linkedinUrl: string | null;
  instagramUrl: string | null;
};

export type ResearchMediaLink = {
  key: string;
  href: string;
  label: string;
  Icon: (props: IconProps) => JSX.Element;
};

function ScholarIcon({className}: IconProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={className} fill="currentColor">
      <path d="M12 2 1 8.5l11 6.5 9-5.32V17h2V8.5L12 2Z" />
      <path d="M5 13.18v4.09L12 21l7-3.73v-4.09L12 17l-7-3.82Z" />
    </svg>
  );
}

function ScopusIcon({className}: IconProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={className} fill="currentColor">
      <path d="M17.2 6.4a6.6 6.6 0 0 0-3.9-1.3c-2.2 0-3.7 1.2-3.7 2.9 0 1.5 1.1 2.3 3.3 3.1l1 .4c2.9 1 4.4 2.4 4.4 4.8 0 2.9-2.4 4.8-5.9 4.8a8.7 8.7 0 0 1-4.7-1.3l.7-1.9a7 7 0 0 0 4 1.2c2.1 0 3.5-1 3.5-2.6 0-1.4-1-2.2-3.2-3l-1-.4C8.7 12 7.2 10.7 7.2 8.2c0-2.8 2.3-4.7 5.9-4.7a8.4 8.4 0 0 1 4.6 1.3l-.5 1.6Z" />
    </svg>
  );
}

function SintaIcon({className}: IconProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={className} fill="currentColor">
      <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm0 2.6a7.4 7.4 0 0 1 6.6 4.1H12l-2.4 4.2-1.7-2.9H4.9A7.4 7.4 0 0 1 12 4.6Zm-7.3 6.7h2.5l3 5.2 2.4-4.2h6.7a7.4 7.4 0 0 1-14.6-1Z" />
    </svg>
  );
}

function OrcidIcon({className}: IconProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={className} fill="currentColor">
      <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20ZM8.5 6.6a1.1 1.1 0 1 1 0 2.2 1.1 1.1 0 0 1 0-2.2Zm-.9 3.3h1.8v7.5H7.6V9.9Zm3.6 0h3.2c2.4 0 3.9 1.6 3.9 3.7s-1.5 3.8-3.9 3.8h-3.2V9.9Zm1.8 1.6v4.3h1.3c1.5 0 2.2-1 2.2-2.2s-.7-2.1-2.2-2.1h-1.3Z" />
    </svg>
  );
}

function LinkedinIcon({className}: IconProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={className} fill="currentColor">
      <path d="M4.98 3.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5ZM3 9h4v12H3V9Zm6.5 0h3.8v1.7h.05a4.2 4.2 0 0 1 3.75-2c4 0 4.75 2.6 4.75 6V21h-4v-5.6c0-1.34-.03-3.07-1.9-3.07-1.9 0-2.2 1.46-2.2 2.97V21h-4V9Z" />
    </svg>
  );
}

function InstagramIcon({className}: IconProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={className} fill="currentColor">
      <path d="M12 2.2c3.2 0 3.6 0 4.9.07 1.2.05 1.8.25 2.2.42.56.22.96.48 1.38.9.42.42.68.82.9 1.38.17.4.37 1 .42 2.2.07 1.3.07 1.7.07 4.9s0 3.6-.07 4.9c-.05 1.2-.25 1.8-.42 2.2-.22.56-.48.96-.9 1.38-.42.42-.82.68-1.38.9-.4.17-1 .37-2.2.42-1.3.07-1.7.07-4.9.07s-3.6 0-4.9-.07c-1.2-.05-1.8-.25-2.2-.42-.56-.22-.96-.48-1.38-.9-.42-.42-.68-.82-.9-1.38-.17-.4-.37-1-.42-2.2C2.2 15.6 2.2 15.2 2.2 12s0-3.6.07-4.9c.05-1.2.25-1.8.42-2.2.22-.56.48-.96.9-1.38.42-.42.82-.68 1.38-.9.4-.17 1-.37 2.2-.42C8.4 2.2 8.8 2.2 12 2.2Zm0 3.05a6.75 6.75 0 1 0 0 13.5 6.75 6.75 0 0 0 0-13.5Zm0 11.13a4.38 4.38 0 1 1 0-8.76 4.38 4.38 0 0 1 0 8.76Zm6.99-11.4a1.58 1.58 0 1 1-3.15 0 1.58 1.58 0 0 1 3.15 0Z" />
    </svg>
  );
}

const ORCID_PATTERN = /^\d{4}-\d{4}-\d{4}-\d{3}[\dX]$/u;

function safeHttpsUrl(value: string | null) {
  if (value === null) return null;
  const parsed = CmsHttpsExternalUrlSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

export function researchMediaLinks(source: ResearchMediaSource): ReadonlyArray<ResearchMediaLink> {
  const orcidHref = source.orcid && ORCID_PATTERN.test(source.orcid)
    ? `https://orcid.org/${source.orcid}`
    : null;

  return [
    {key: "scholar", href: safeHttpsUrl(source.googleScholarUrl), label: "Google Scholar", Icon: ScholarIcon},
    {key: "scopus", href: safeHttpsUrl(source.scopusUrl), label: "Scopus", Icon: ScopusIcon},
    {key: "sinta", href: safeHttpsUrl(source.sintaUrl), label: "SINTA", Icon: SintaIcon},
    {key: "orcid", href: orcidHref, label: "ORCID", Icon: OrcidIcon},
    {key: "linkedin", href: safeHttpsUrl(source.linkedinUrl), label: "LinkedIn", Icon: LinkedinIcon},
    {key: "instagram", href: safeHttpsUrl(source.instagramUrl), label: "Instagram", Icon: InstagramIcon},
  ].filter((link): link is ResearchMediaLink => link.href !== null);
}
