"use client";

import {ExternalLink} from "lucide-react";

import {Container} from "@/components/ui/container";
import {Link, usePathname} from "@/i18n/navigation";
import {cn} from "@/lib/utils";

type PortalNavLabels = {
  profile: string;
  education: string;
  publications: string;
  publicProfile: string;
};

export function PortalNav({publicHref, labels}: {publicHref: string; labels: PortalNavLabels}) {
  const pathname = usePathname();
  const items = [
    {href: "/portal-dosen", label: labels.profile},
    {href: "/portal-dosen/pendidikan", label: labels.education},
    {href: "/portal-dosen/publikasi", label: labels.publications},
  ];

  return (
    <nav aria-label={labels.profile} className="border-b border-slate-200 bg-white">
      <Container className="flex flex-wrap items-center justify-between gap-4">
        <ul className="flex flex-wrap gap-1">
          {items.map((item) => {
            const active = pathname === item.href;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "-mb-px block border-b-2 px-4 py-3 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-royal-600",
                    active
                      ? "border-royal-500 text-royal-700"
                      : "border-transparent text-slate-600 hover:text-slate-900",
                  )}
                >
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
        <Link
          href={publicHref}
          className="inline-flex items-center gap-1.5 py-3 text-sm text-slate-500 underline-offset-2 hover:text-royal-600 hover:underline"
        >
          {labels.publicProfile}
          <ExternalLink aria-hidden className="size-3.5" strokeWidth={1.5} />
        </Link>
      </Container>
    </nav>
  );
}
