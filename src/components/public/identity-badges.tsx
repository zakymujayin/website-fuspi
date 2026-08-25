import { institution } from "@/config/institution";
import type {PublicSiteSetting} from "@/features/home-nav/public-query";
import { Link } from "@/i18n/navigation";
import {ImageWithFallback} from "@/components/public/image-with-fallback";

type IdentityBadgesProps = {
  logo?: PublicSiteSetting["logo"] | null;
};

/**
 * Three placeholder marks for the header identity cluster: the university
 * crest (largest), an accreditation-style medallion, and a BLU-style badge.
 * None of these are the real official seals — there is no legitimate source
 * to reproduce them from in this environment. These are original concept
 * art in FUSPI's own palette, sized and grouped the way the real assets
 * should read once supplied, so the layout can be judged today. Swap the
 * three `<svg>` blocks below for real artwork/`<Image>` when the official
 * files land; nothing else in the header needs to change.
 *
 * All three marks sit fully inside the fixed 96px header row, vertically
 * centered together as one lockup. An earlier version let the crest bleed
 * past the header's bottom edge (the reference site's move), but that only
 * reads as intentional on an elongated shield/ribbon silhouette — on a
 * round seal it just looks clipped. Contained and proportional is the
 * correct call here.
 */
export function IdentityBadges({logo = null}: IdentityBadgesProps) {
  return (
    <Link href="/" className="flex shrink-0 items-center gap-3" dir="ltr">
      {logo ? (
        <span className="relative block size-[76px] shrink-0">
          <ImageWithFallback
            src={logo.url}
            alt={logo.isDecorative ? "" : logo.alt}
            className="object-contain"
            sizes="76px"
            priority
          />
        </span>
      ) : (
        <svg viewBox="0 0 160 160" width="76" height="76" aria-hidden className="shrink-0">
        <defs>
          <linearGradient id="idbg-uni" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#3352c9" />
            <stop offset="100%" stopColor="#0e1533" />
          </linearGradient>
          <path id="idbg-uni-arc" d="M 28 80 A 52 52 0 0 1 132 80" />
        </defs>
        <circle cx="80" cy="80" r="76" fill="none" stroke="#b6842e" strokeWidth="3" />
        <circle cx="80" cy="80" r="70" fill="url(#idbg-uni)" />
        <circle cx="80" cy="80" r="70" fill="none" stroke="#ffffff" strokeOpacity=".25" strokeWidth="1" />
        <g fill="none" stroke="#ffffff" strokeOpacity=".18" strokeWidth="1.5">
          <rect x="52" y="52" width="56" height="56" />
          <rect x="52" y="52" width="56" height="56" transform="rotate(45 80 80)" />
        </g>
        <text fontSize="10.5" fontWeight="700" letterSpacing="2.5" fill="#f3d9a4">
          <textPath href="#idbg-uni-arc" startOffset="50%" textAnchor="middle">
            UIN SMH BANTEN
          </textPath>
        </text>
        <text x="80" y="90" textAnchor="middle" fontSize="28" fontWeight="800" fill="#ffffff" fontFamily="ui-serif, Georgia, serif">
          FU
        </text>
        </svg>
      )}

      {!logo ? (
        <span className="flex items-center gap-2">
        <svg viewBox="0 0 160 160" width="50" height="50" aria-hidden>
          <defs>
            <linearGradient id="idbg-acc" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#e7c77c" />
              <stop offset="100%" stopColor="#a5772a" />
            </linearGradient>
          </defs>
          <circle cx="80" cy="80" r="74" fill="url(#idbg-acc)" stroke="#8a611f" strokeWidth="3" />
          <text x="80" y="70" textAnchor="middle" fontSize="14" fontWeight="800" fill="#5c4013">
            AKREDITASI
          </text>
          <text x="80" y="98" textAnchor="middle" fontSize="26" fontWeight="800" fill="#5c4013">
            UNGGUL
          </text>
        </svg>
        <svg viewBox="0 0 160 160" width="50" height="50" aria-hidden>
          <defs>
            <linearGradient id="idbg-blu" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#17a599" />
              <stop offset="100%" stopColor="#0b5c56" />
            </linearGradient>
          </defs>
          <circle cx="80" cy="80" r="74" fill="url(#idbg-blu)" stroke="#0b5c56" strokeWidth="3" />
          <text x="80" y="94" textAnchor="middle" fontSize="34" fontWeight="800" fill="#ffffff">
            BLU
          </text>
        </svg>
        </span>
      ) : null}

      <span className="sr-only">{institution.name}</span>
    </Link>
  );
}
