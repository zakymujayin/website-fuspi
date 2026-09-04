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
  iconClassName?: string;
};

function ScholarIcon({className}: IconProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={className} fill="currentColor">
      <path d="M5.242 13.769 0 9.5 12 0l12 9.5-5.242 4.269C17.548 11.249 14.978 9.5 12 9.5c-2.977 0-5.548 1.748-6.758 4.269zM12 10a7 7 0 1 0 0 14 7 7 0 0 0 0-14z" />
    </svg>
  );
}

function ScopusIcon({className}: IconProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={className} fill="currentColor">
      <path d="M24 19.059 23.86 17.282c-1.426.772-2.945 1.076-4.465 1.076-3.319 0-5.96-2.782-5.96-6.475 0-3.903 2.595-6.31 5.633-6.31 1.917 0 3.39.303 4.792 1.075L24 4.895c-1.286-.608-2.337-.889-4.698-.889-4.534 0-7.97 3.53-7.97 8.017 0 5.12 4.09 7.924 7.9 7.924 1.916 0 3.506-.257 4.768-.888Zm-14.954-3.46c0-2.22-1.964-3.225-3.857-4.347C3.716 10.364 2.15 9.756 2.15 8.12c0-1.215.889-2.548 2.642-2.548 1.519 0 2.57.234 3.903 1.029l.117-1.847c-1.239-.514-2.127-.748-4.137-.748C1.8 4.006.047 5.876.047 8.26c0 2.384 2.103 3.413 4.02 4.581 1.426.865 2.922 1.45 2.922 2.992 0 1.496-1.333 2.571-2.922 2.571-1.566 0-2.594-.35-3.786-1.075L0 19.176c1.215.56 2.454.818 4.16.818 2.385 0 4.885-1.473 4.885-4.395Z" />
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
      <path d="M12 0C5.372 0 0 5.372 0 12s5.372 12 12 12 12-5.372 12-12S18.628 0 12 0ZM7.369 4.378c.525 0 .947.431.947.947s-.422.947-.947.947a.95.95 0 0 1-.947-.947c0-.525.422-.947.947-.947Zm-.722 3.038h1.444v10.041H6.647V7.416Zm3.562 0h3.9c3.712 0 5.344 2.653 5.344 5.025 0 2.578-2.016 5.025-5.325 5.025h-3.919V7.416Zm1.444 1.303v7.444h2.297c3.272 0 4.022-2.484 4.022-3.722 0-2.016-1.284-3.722-4.097-3.722h-2.222Z" />
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
    {key: "scholar", href: safeHttpsUrl(source.googleScholarUrl), label: "Google Scholar", Icon: ScholarIcon, iconClassName: "text-[#4285f4]"},
    {key: "scopus", href: safeHttpsUrl(source.scopusUrl), label: "Scopus", Icon: ScopusIcon, iconClassName: "text-[#e97132]"},
    {key: "sinta", href: safeHttpsUrl(source.sintaUrl), label: "SINTA", Icon: SintaIcon},
    {key: "orcid", href: orcidHref, label: "ORCID", Icon: OrcidIcon, iconClassName: "text-[#a6ce39]"},
    {key: "linkedin", href: safeHttpsUrl(source.linkedinUrl), label: "LinkedIn", Icon: LinkedinIcon, iconClassName: "text-[#0a66c2]"},
    {key: "instagram", href: safeHttpsUrl(source.instagramUrl), label: "Instagram", Icon: InstagramIcon, iconClassName: "text-[#e4405f]"},
  ].filter((link): link is ResearchMediaLink => link.href !== null);
}
