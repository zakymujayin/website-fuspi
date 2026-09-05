import type {SVGProps} from "react";

/** A shared manuscript/architectural stroke family, not decorative emblems. */
function Mark({children, ...props}: SVGProps<SVGSVGElement>) {
  return <svg viewBox="0 0 40 40" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false" {...props}>{children}</svg>;
}

/**
 * Study-program marks (IAT / IH / AFI).
 *
 * One construction rule across the three: a 40x40 frame, 1.5 stroke, no fills,
 * and forms drawn from the same geometry as the FUSPI lattice ornament. They
 * describe the discipline (folio, chain of transmission, geometric reasoning),
 * never a devotional illustration.
 */

/** IAT — a ruled manuscript folio with an illuminated margin rosette. */
export function ManuscriptMark(props: SVGProps<SVGSVGElement>) {
  return (
    <Mark {...props}>
      <path d="M8 6h24v28H8z" />
      <path d="M14 6v28" />
      <path d="M19 13h8M19 19h8M19 25h5" />
      <path d="M11 14.5 13 16.5 11 18.5 9 16.5z" />
    </Mark>
  );
}

/**
 * IH — a chain of narrators, each carrying a line of the recorded text.
 * Drawn as three large elements on one axis so it stays legible at 36px, where
 * a converging network of small nodes collapses into a blot.
 */
export function TransmissionMark(props: SVGProps<SVGSVGElement>) {
  return (
    <Mark {...props}>
      <circle cx="12" cy="9" r="3.5" />
      <circle cx="12" cy="20" r="3.5" />
      <circle cx="12" cy="31" r="3.5" />
      <path d="M12 12.5v4M12 23.5v4" />
      <path d="M20 9h12M20 20h12M20 31h8" />
    </Mark>
  );
}

/** AFI — the eight-point lattice of the FUSPI ornament, reasoning outward from a centre. */
export function ReasoningMark(props: SVGProps<SVGSVGElement>) {
  return (
    <Mark {...props}>
      <path d="M20 5 35 20 20 35 5 20Z" />
      <path d="M9.5 9.5h21v21h-21z" />
      <circle cx="20" cy="20" r="4" />
    </Mark>
  );
}

export function ServiceMark(props: SVGProps<SVGSVGElement>) {
  return <Mark {...props}><path d="M6 35h28M9 35V18h22v17M7 18l13-8 13 8M14 23v7M20 23v7M26 23v7M20 5v5" /></Mark>;
}
export function ListeningMark(props: SVGProps<SVGSVGElement>) {
  return <Mark {...props}><path d="M6 8h28v20H20l-9 7v-7H6zM12 14h16M12 19h11M12 23h6" /></Mark>;
}
export function BookingMark(props: SVGProps<SVGSVGElement>) {
  return <Mark {...props}><path d="M7 10h26v24H7zM7 17h26M13 6v8M27 6v8M12 22h5v6h-5zM22 22h6M22 27h6" /></Mark>;
}
export function InformationMark(props: SVGProps<SVGSVGElement>) {
  return <Mark {...props}><path d="M8 5h18l7 7v23H8zM26 5v8h7M14 18h13M14 23h13M14 28h8M5 10v27h23" /></Mark>;
}
export function InquiryMark(props: SVGProps<SVGSVGElement>) {
  return <Mark {...props}><path d="M6 7h23v22H17l-7 6v-6H6zM29 12h5v18h-5M15 14a4 4 0 0 1 8 0c0 3-4 3-4 6M19 24h.01" /></Mark>;
}
export function ContactMark(props: SVGProps<SVGSVGElement>) {
  return <Mark {...props}><path d="M5 12h30v22H5zM5 12l15 12 15-12M5 34l11-13M35 34 24 21M13 8h14M17 4h6" /></Mark>;
}
