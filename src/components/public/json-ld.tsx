import {institution} from "@/config/institution";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://fuspi.uinbanten.ac.id";

export function OrganizationJsonLd() {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify({
          "@context": "https://schema.org",
          "@graph": [
            {
              "@type": "CollegeOrUniversity",
              name: institution.name,
              parentOrganization: { "@type": "CollegeOrUniversity", name: institution.university },
              url: SITE_URL,
            },
            { "@type": "WebSite", name: institution.name, url: SITE_URL, inLanguage: ["id", "en", "ar"] },
          ],
        }),
      }}
    />
  );
}

export function BreadcrumbJsonLd({items}: {items: Array<{name: string; url: string}>}) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: items.map((item, i) => ({
            "@type": "ListItem",
            position: i + 1,
            name: item.name,
            item: item.url,
          })),
        }),
      }}
    />
  );
}
