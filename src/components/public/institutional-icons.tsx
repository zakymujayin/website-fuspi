import type {SVGProps} from "react";

/** A shared manuscript/architectural stroke family, not decorative emblems. */
function Mark({children, ...props}: SVGProps<SVGSVGElement>) {
  return <svg viewBox="0 0 40 40" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false" {...props}>{children}</svg>;
}

export function ManuscriptMark(props: SVGProps<SVGSVGElement>) {
  return <Mark {...props}><path d="M10 5h20v30H10zM14 10h12v5H14zM14 20h12M14 24h12M14 28h8M7 9v28h19" /><path d="m18 12 2-1 2 1-2 1z" /></Mark>;
}
export function TransmissionMark(props: SVGProps<SVGSVGElement>) {
  return <Mark {...props}><path d="M7 7h17v12H7zM11 11h9M11 15h6M24 13h8v17H20M13 19v5" /><circle cx="13" cy="28" r="4" /><circle cx="28" cy="30" r="4" /><path d="M17 28h7M13 32v4" /></Mark>;
}
export function ReasoningMark(props: SVGProps<SVGSVGElement>) {
  return <Mark {...props}><path d="m20 5 14 15-14 15L6 20 20 5ZM6 20h28M20 5v30M13 13h14v14H13z" /><circle cx="20" cy="20" r="3" /></Mark>;
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
