import {ImageWithFallback} from "@/components/public/image-with-fallback";
import {institution} from "@/config/institution";
import type {PublicSiteSetting} from "@/features/home-nav/public-query";
import {Link} from "@/i18n/navigation";
import styles from "./home-design.module.css";

export function IdentityBadges({
  logo,
  accreditationLogo,
  bluLogo,
}: {
  logo?: PublicSiteSetting["logo"] | null;
  accreditationLogo?: PublicSiteSetting["accreditationLogo"] | null;
  bluLogo?: PublicSiteSetting["bluLogo"] | null;
}) {
  return (
    <Link href="/" aria-label={institution.name} className="flex shrink-0 items-center gap-3" dir="ltr">
      {logo ? (
        <span className="relative block size-14 shrink-0">
          <ImageWithFallback src={logo.url} alt={logo.isDecorative ? "" : logo.alt} className="object-contain" sizes="56px" loading="eager" />
        </span>
      ) : (
        <span className="relative block size-12 shrink-0 md:size-14">
          <ImageWithFallback src="/images/brand/uin-logo-navy.png" alt={institution.university} className="object-contain" sizes="56px" loading="eager" />
        </span>
      )}
      <span className={`${styles.brandName} max-w-36 sm:max-w-48 lg:hidden min-[1400px]:block`}>
        <span className="block text-sm font-semibold leading-tight text-navy-950">{institution.name}</span>
      </span>
      <span className="hidden items-center gap-2 border-s border-slate-200 ps-3 2xl:flex">
        {accreditationLogo ? (
          <span className="relative block size-[58px] shrink-0">
            <ImageWithFallback src={accreditationLogo.url} alt={accreditationLogo.isDecorative ? "" : accreditationLogo.alt} className="object-contain" sizes="58px" loading="eager" />
          </span>
        ) : null}
        {bluLogo ? (
          <span className="relative block size-[50px] shrink-0">
            <ImageWithFallback src={bluLogo.url} alt={bluLogo.isDecorative ? "" : bluLogo.alt} className="object-contain" sizes="50px" loading="eager" />
          </span>
        ) : null}
      </span>
    </Link>
  );
}
