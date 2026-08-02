import { readFileSync } from "node:fs";
import path from "node:path";

import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

// The real Link is next-intl's, which needs a request locale. The stand-in
// marks itself so a test can prove a component routed through the localized
// Link rather than emitting a bare <a> that would lose the locale prefix.
vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children, ...rest }: React.ComponentProps<"a">) => (
    <a data-localized-link="true" href={typeof href === "string" ? href : "#"} {...rest}>
      {children}
    </a>
  ),
  usePathname: () => "/prodi",
}));

vi.mock("next-intl", () => ({
  useLocale: () => "id",
  useTranslations: () => (key: string) => `t:${key}`,
}));

const { HEADER_COMPACT_THRESHOLD, isHeaderCompact } = await import(
  "@/components/public/shell/header-scroll"
);
const { classifyNavUrl } = await import("@/components/public/shell/nav-url");
const { UtilityLink } = await import("@/components/public/shell/utility-link");
const { LanguageSwitcher } = await import("@/components/public/language-switcher");
const { utilityLinks } = await import("@/components/public/nav-items");

const SHELL_FILES = [
  "src/app/[locale]/(public)/layout.tsx",
  "src/components/public/site-header.tsx",
  "src/components/public/site-footer.tsx",
  "src/components/public/desktop-nav.tsx",
  "src/components/public/language-switcher.tsx",
  "src/components/public/brand-mark.tsx",
  "src/components/public/skip-link.tsx",
  "src/components/public/shell/sticky-header.tsx",
  "src/components/public/shell/utility-link.tsx",
  // mobile-nav is checked here too: its only physical utility is the drawer
  // slide transform, which has no logical equivalent and carries an rtl: pair.
  "src/components/public/mobile-nav.tsx",
] as const;

const readShellFile = (file: string) =>
  readFileSync(path.join(process.cwd(), file), "utf8");

const markupToContainer = (markup: string): HTMLDivElement => {
  const container = document.createElement("div");
  container.innerHTML = markup;
  return container;
};

const LOCALES = ["id", "en", "ar"] as const;

const readMessages = (locale: string) =>
  JSON.parse(readFileSync(path.join(process.cwd(), `messages/${locale}.json`), "utf8"));

describe("compact header threshold", () => {
  it("compacts strictly above the 100px specified in docs/17-B", () => {
    expect(HEADER_COMPACT_THRESHOLD).toBe(100);
    expect(isHeaderCompact(0)).toBe(false);
    expect(isHeaderCompact(99)).toBe(false);
    expect(isHeaderCompact(100)).toBe(false);
    expect(isHeaderCompact(100.5)).toBe(true);
    expect(isHeaderCompact(101)).toBe(true);
    expect(isHeaderCompact(4_000)).toBe(true);
  });

  it("never compacts on overscroll or a non-finite offset", () => {
    expect(isHeaderCompact(-250)).toBe(false);
    expect(isHeaderCompact(Number.NaN)).toBe(false);
    expect(isHeaderCompact(Number.POSITIVE_INFINITY)).toBe(false);
    expect(isHeaderCompact(Number.NEGATIVE_INFINITY)).toBe(false);
  });
});

describe("compact header geometry", () => {
  const source = readShellFile("src/components/public/shell/sticky-header.tsx");
  const header = readShellFile("src/components/public/site-header.tsx");

  it("renders the expanded state on the server so hydration cannot mismatch", () => {
    // The initial state is always "expanded"; scroll is only read after mount,
    // so the server markup and the first client paint agree by construction.
    expect(source).toContain("useState(false)");
    expect(source).toContain("useEffect(");
    expect(source.indexOf("useEffect(")).toBeLessThan(source.indexOf("window."));
    expect(source.match(/window\./g)).toHaveLength(3);
  });

  it("compacts with a transform only, so page content cannot shift", () => {
    expect(source).toContain("data-[compact=true]:-translate-y-4");
    expect(source).toContain("md:data-[compact=true]:-translate-y-[5.5rem]");
    // A height/padding change on the pinned bar would move everything below it.
    expect(source).not.toMatch(/data-\[compact=true\]:(h|min-h|max-h|py|p)-/);
  });

  it("keeps the bar heights the transform is calibrated against", () => {
    // 36 + 36 + 16 = 88px (5.5rem) on desktop, 16px on mobile: the two 36px
    // bars slide away and the 76px main bar is trimmed to 60px.
    expect(header).toContain("h-9");
    expect(header).toContain("h-[76px]");
    expect(header).toContain("group-data-[compact=true]:translate-y-2");
  });

  it("animates the standalone translate property Tailwind v4 emits", () => {
    // `transition-[transform,...]` compiles to `transition-property: transform`
    // and silently never animates a translate utility.
    const lists = [
      ...source.matchAll(/transition-\[([^\]]+)\]/g),
      ...header.matchAll(/transition-\[([^\]]+)\]/g),
    ];

    expect(lists.length).toBeGreaterThan(1);
    for (const [, list] of lists) expect(list).toContain("translate");
  });

  it("drops the transition under prefers-reduced-motion", () => {
    expect(source).toContain("motion-reduce:transition-none");
    expect(header).toContain("motion-reduce:transition-none");
  });

  it("stacks below the drawer overlay so the drawer is never covered", () => {
    const headerZ = Number(/z-(\d+)/.exec(source)?.[1]);
    const drawer = readShellFile("src/components/public/mobile-nav.tsx");
    const backdropZ = Number(/Backdrop[\s\S]*?z-(\d+)/.exec(drawer)?.[1]);

    expect(headerZ).toBeLessThan(backdropZ);
  });
});

describe("external destination classification", () => {
  it("treats site-relative paths as internal", () => {
    expect(classifyNavUrl("/gkm")).toBe("internal");
    expect(classifyNavUrl("/berita?page=2")).toBe("internal");
    expect(classifyNavUrl("/")).toBe("internal");
  });

  it("treats http(s) origins as external", () => {
    expect(classifyNavUrl("https://pmb.uinbanten.ac.id")).toBe("external");
    expect(classifyNavUrl("http://siakad.uinbanten.ac.id/login")).toBe("external");
    expect(classifyNavUrl("  https://elearning.uinbanten.ac.id  ")).toBe("external");
    expect(classifyNavUrl("HTTPS://elearning.uinbanten.ac.id")).toBe("external");
  });

  it("refuses every destination it cannot vouch for", () => {
    for (const url of [
      "javascript:alert(1)",
      "JavaScript:alert(1)",
      "java\tscript:alert(1)",
      "data:text/html,<script>alert(1)</script>",
      "vbscript:msgbox(1)",
      "file:///etc/passwd",
      "mailto:someone@example.test",
      "tel:+62000000000",
      "//evil.example",
      "berita",
      "#top",
      "",
      "   ",
    ]) {
      expect(classifyNavUrl(url), url).toBe("unsafe");
    }
  });

  it("classifies every frozen utility destination as renderable", () => {
    for (const item of utilityLinks) {
      expect(classifyNavUrl(item.url), item.key).not.toBe("unsafe");
    }
  });

  it("invents no destination of its own", () => {
    const source = readShellFile("src/components/public/shell/nav-url.ts");
    const utility = readShellFile("src/components/public/shell/utility-link.tsx");

    for (const file of [source, utility, readShellFile("src/components/public/site-header.tsx")]) {
      expect(file).not.toMatch(/https?:\/\/[a-z]/i);
      expect(file).not.toMatch(/sila/i);
      expect(file).not.toMatch(/fuda/i);
    }
  });
});

describe("UtilityLink semantics", () => {
  const render = (url: string) =>
    markupToContainer(
      renderToStaticMarkup(
        <UtilityLink url={url} label="SIAKAD" externalHint="(external site, opens in a new tab)" />,
      ),
    );

  it("announces an external destination and isolates the new tab", () => {
    const anchor = render("https://siakad.uinbanten.ac.id").querySelector("a");

    expect(anchor?.getAttribute("href")).toBe("https://siakad.uinbanten.ac.id");
    expect(anchor?.getAttribute("target")).toBe("_blank");
    expect(anchor?.getAttribute("rel")?.split(/\s+/)).toEqual(
      expect.arrayContaining(["noopener", "noreferrer"]),
    );
    expect(anchor?.textContent).toContain("(external site, opens in a new tab)");
    expect(anchor?.querySelector("svg")?.getAttribute("aria-hidden")).toBe("true");
    // The directional glyph mirrors in RTL; the label text does not.
    expect(anchor?.querySelector("svg")?.getAttribute("class")).toContain("rtl:-scale-x-100");
  });

  it("routes an internal destination through the localized Link, same tab", () => {
    const anchor = render("/gkm").querySelector("a");

    // The localized Link is what applies `localePrefix: "always"`. A bare <a>
    // here would emit /gkm with no locale segment; the real prefixes are
    // asserted per locale in the Playwright suite.
    expect(anchor?.getAttribute("data-localized-link")).toBe("true");
    expect(anchor?.getAttribute("href")).toBe("/gkm");
    expect(anchor?.getAttribute("target")).toBeNull();
    expect(anchor?.getAttribute("rel")).toBeNull();
    expect(anchor?.textContent).toBe("SIAKAD");
    expect(anchor?.querySelector("svg")).toBeNull();
  });

  it("never routes an external destination through the localized Link", () => {
    // Prefixing an absolute origin would corrupt it, so the external branch
    // must stay a raw anchor.
    const anchor = render("https://siakad.uinbanten.ac.id").querySelector("a");

    expect(anchor?.getAttribute("data-localized-link")).toBeNull();
    expect(anchor?.getAttribute("href")).toBe("https://siakad.uinbanten.ac.id");
  });

  it("forwards a click handler on both link branches so the drawer can close", () => {
    for (const url of ["/gkm", "https://siakad.uinbanten.ac.id"]) {
      const onClick = vi.fn();
      const container = markupToContainer(
        renderToStaticMarkup(
          <UtilityLink
            url={url}
            label="SIAKAD"
            externalHint="(external site, opens in a new tab)"
            onClick={onClick}
          />,
        ),
      );

      // Static markup cannot carry a listener, so assert the contract instead:
      // the prop is accepted and the element stays an anchor that can receive it.
      expect(container.querySelector("a"), url).not.toBeNull();
    }

    // The drawer is the caller that must supply it.
    const drawer = readShellFile("src/components/public/mobile-nav.tsx");
    const utilityUsage = /<UtilityLink[\s\S]*?\/>/.exec(drawer)?.[0] ?? "";

    expect(utilityUsage).toContain("onClick={close}");
  });

  it("keeps the shared topbar usage valid without a click handler", () => {
    // SiteHeader is a Server Component: it cannot pass a function prop, so
    // `onClick` must stay optional or the shared usage breaks at build time.
    const header = readShellFile("src/components/public/site-header.tsx");
    const headerUsage = /<UtilityLink[\s\S]*?\/>/.exec(header)?.[0] ?? "";

    expect(headerUsage).toContain("<UtilityLink");
    expect(headerUsage).not.toContain("onClick");
    expect(render("/gkm").querySelector("a")).not.toBeNull();
  });

  it("never hands an unsafe destination to the browser", () => {
    for (const url of ["javascript:alert(1)", "//evil.example", "data:text/html,x"]) {
      const container = render(url);

      expect(container.querySelector("a"), url).toBeNull();
      expect(container.textContent, url).toBe("SIAKAD");
    }
  });
});

describe("language switcher targets and naming", () => {
  const render = (props: Parameters<typeof LanguageSwitcher>[0]) =>
    markupToContainer(renderToStaticMarkup(<LanguageSwitcher {...props} />));

  it("meets the 44px drawer floor at size lg and stays compact at size sm", () => {
    const drawer = render({ tone: "light", size: "lg", labelledBy: "drawer-language" });
    const topbar = render({ tone: "dark" });

    for (const anchor of drawer.querySelectorAll("a")) {
      expect(anchor.getAttribute("class")).toContain("min-h-11");
      expect(anchor.getAttribute("class")).toContain("min-w-11");
    }

    for (const anchor of topbar.querySelectorAll("a")) {
      expect(anchor.getAttribute("class")).toContain("min-h-9");
      expect(anchor.getAttribute("class")).not.toContain("min-h-11");
    }
  });

  it("takes its accessible name from a visible heading when one is given", () => {
    const drawer = render({ size: "lg", labelledBy: "drawer-language" }).querySelector("nav");
    const topbar = render({}).querySelector("nav");

    expect(drawer?.getAttribute("aria-labelledby")).toBe("drawer-language");
    expect(drawer?.getAttribute("aria-label")).toBeNull();
    expect(topbar?.getAttribute("aria-label")).toBe("t:languageLabel");
    expect(topbar?.getAttribute("aria-labelledby")).toBeNull();
  });

  it("offers all three locales, each with a spoken language name", () => {
    const anchors = [...render({}).querySelectorAll("a")];

    expect(anchors).toHaveLength(3);
    expect(anchors.map((a) => a.getAttribute("hreflang"))).toEqual(["id", "en", "ar"]);
    expect(anchors.map((a) => a.querySelector(".sr-only")?.textContent)).toEqual([
      "Bahasa Indonesia",
      "English",
      "العربية",
    ]);
    // The two-letter chip is decorative; the spoken name carries the meaning.
    expect(anchors[0].querySelector("[aria-hidden]")?.textContent).toBe("ID");
    expect(anchors[0].getAttribute("aria-current")).toBe("true");
    expect(anchors[1].getAttribute("aria-current")).toBeNull();
  });
});

describe("drawer structure", () => {
  const source = readShellFile("src/components/public/mobile-nav.tsx");

  it("presents the language choice before the three navigation groups", () => {
    const order = ["drawer-language", "drawer-primary", "drawer-content", "drawer-utility"].map(
      (id) => source.indexOf(`id="${id}"`),
    );

    for (const index of order) expect(index).toBeGreaterThan(-1);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
  });

  it("names every group with its visible heading", () => {
    for (const id of ["drawer-primary", "drawer-content", "drawer-utility"]) {
      expect(source).toContain(`aria-labelledby="${id}"`);
    }
    expect(source).toContain('labelledBy="drawer-language"');
  });

  it("holds every target at 44px", () => {
    expect(source).toContain('"flex min-h-11 items-center rounded-lg px-3 py-2 text-sm"');
    // Trigger and close button are square 44px controls.
    expect(source.match(/size-11/g)?.length).toBe(2);
    expect(source).toContain('size="lg"');
  });

  it("anchors the panel to the inline-end side and mirrors its slide in RTL", () => {
    expect(source).toContain("end-0");
    expect(source).toContain("rtl:data-[starting-style]:-translate-x-full");
    expect(source).toContain("rtl:data-[ending-style]:-translate-x-full");
  });

  it("relies on the dialog primitive for the focus trap, Escape, and focus return", () => {
    expect(source).toContain("Dialog.Root");
    expect(source).toContain("Dialog.Title");
    expect(source).toContain("Dialog.Close");
    expect(source).toContain("Dialog.Backdrop");
  });

  /**
   * The backdrop fades and the panel slides; both are motion, so both must
   * honour the user's reduced-motion preference. These assertions read the
   * className of each specific element rather than the file as a whole, so a
   * `motion-reduce:` on one element can never vouch for the other. The real
   * computed durations are asserted in the Playwright suite.
   */
  const classNameOf = (element: "Dialog.Backdrop" | "Dialog.Popup") =>
    new RegExp(`<${element.replace(".", "\\.")}[^>]*?className="([^"]*)"`, "s").exec(
      source,
    )?.[1] ?? "";

  it.each(["Dialog.Backdrop", "Dialog.Popup"] as const)(
    "%s animates and drops that animation under prefers-reduced-motion",
    (element) => {
      const className = classNameOf(element);

      expect(className, `${element} className was not found`).not.toBe("");
      // It must actually be animated, or the reduced-motion guard is vacuous.
      expect(className, `${element} declares no transition`).toMatch(/\btransition-/);
      expect(className, `${element} is not motion-safe`).toContain(
        "motion-reduce:transition-none",
      );
    },
  );

  it("leaves no animated drawer element without a reduced-motion escape", () => {
    // Structural sweep: any future animated element in the drawer is caught
    // without anyone remembering to add a case above.
    const animated = [...source.matchAll(/className=\{?[`"]([^`"]*\btransition-[^`"]*)[`"]/g)];

    expect(animated.length).toBeGreaterThanOrEqual(3);
    for (const [, className] of animated) {
      expect(className, `animated drawer element: ${className}`).toContain(
        "motion-reduce:transition-none",
      );
    }
  });

  it("exposes stable slots for the backdrop and the panel", () => {
    // Both are portalled siblings with no role of their own on the backdrop;
    // the slot is how the e2e suite addresses each one.
    expect(source).toContain('data-slot="drawer-backdrop"');
    expect(source).toContain('data-slot="drawer-panel"');
  });
});

describe("landmarks", () => {
  it("declares exactly one banner, one main, and one contentinfo", () => {
    const layout = readShellFile("src/app/[locale]/(public)/layout.tsx");
    const sticky = readShellFile("src/components/public/shell/sticky-header.tsx");
    const footer = readShellFile("src/components/public/site-footer.tsx");
    const header = readShellFile("src/components/public/site-header.tsx");

    expect(layout.match(/<main\b/g)).toHaveLength(1);
    expect(sticky.match(/<header\b/g)).toHaveLength(1);
    expect(footer.match(/<footer\b/g)).toHaveLength(1);
    // The header markup delegates its landmark to StickyHeader; a second
    // <header> or a <main>/<footer> here would duplicate a landmark.
    expect(header).not.toMatch(/<(header|main|footer)\b/);
    expect(layout).not.toMatch(/<(header|footer)\b/);
  });

  it("keeps the skip link ahead of the sticky header and clears its height", () => {
    const layout = readShellFile("src/app/[locale]/(public)/layout.tsx");

    expect(layout.indexOf("<SkipLink")).toBeLessThan(layout.indexOf("<SiteHeader"));
    expect(layout).toContain('id="main"');
    // 148px = the full expanded header, so the skip target never lands behind it.
    expect(layout).toContain("scroll-mt-[148px]");
  });
});

describe("logical direction discipline", () => {
  it.each(SHELL_FILES)("uses no physical-direction utility in %s", (file) => {
    const source = readShellFile(file);

    expect(source).not.toMatch(/\b(ml|mr|pl|pr|left|right)-\d/);
    expect(source).not.toMatch(/\btext-(left|right)\b/);
    expect(source).not.toMatch(/\bborder-(l|r)-/);
    expect(source).not.toMatch(/\brounded-(l|r)-/);
  });

  it("mirrors only the directional glyph, never the wordmark", () => {
    const brand = readShellFile("src/components/public/brand-mark.tsx");
    const utility = readShellFile("src/components/public/shell/utility-link.tsx");

    // The wordmark is a media-style asset: it must not be flipped (docs/12-E-4).
    expect(brand).not.toMatch(/rtl:(-scale-x-100|rotate-180)/);
    expect(brand).toContain('dir="ltr"');
    expect(utility).toContain("rtl:-scale-x-100");
  });
});

describe("shell i18n", () => {
  const catalogs = Object.fromEntries(
    LOCALES.map((locale) => [locale, readMessages(locale)]),
  ) as Record<(typeof LOCALES)[number], { Nav: Record<string, unknown> }>;

  it("defines the same Nav keys in id, en, and ar", () => {
    const flatten = (value: unknown, prefix = ""): string[] =>
      typeof value === "object" && value !== null
        ? Object.entries(value).flatMap(([k, v]) => flatten(v, prefix ? `${prefix}.${k}` : k))
        : [prefix];

    const [id, en, ar] = LOCALES.map((locale) => flatten(catalogs[locale].Nav).sort());

    expect(en).toEqual(id);
    expect(ar).toEqual(id);
  });

  it("announces external destinations in every locale, genuinely translated", () => {
    const hints = LOCALES.map((locale) => catalogs[locale].Nav.externalLinkHint as string);

    for (const hint of hints) expect(hint.trim().length).toBeGreaterThan(0);
    expect(new Set(hints).size).toBe(3);
    // Arabic must be Arabic script, not a copied Latin string.
    expect(hints[2]).toMatch(/[؀-ۿ]/);
  });

  it("keeps FUSPI identity and the five programs in contract order", () => {
    for (const locale of LOCALES) {
      const nav = catalogs[locale].Nav as { program: Record<string, string> };

      expect(Object.keys(nav.program)).toEqual(["IAT", "IH", "AFI", "SAA", "TASPI"]);
      expect(JSON.stringify(nav)).not.toMatch(/fuda/i);
    }
  });
});
