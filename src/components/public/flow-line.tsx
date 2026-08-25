import { cn } from "@/lib/utils";

type FlowLineProps = {
  className?: string;
  flip?: boolean;
};

export function FlowLine({ className, flip = false }: FlowLineProps) {
  return (
    <svg
      aria-hidden
      focusable="false"
      viewBox="0 0 1440 180"
      preserveAspectRatio="none"
      className={cn(
        "pointer-events-none absolute inset-x-0 top-0 h-36 w-full opacity-80",
        flip ? "-scale-y-100" : undefined,
        className,
      )}
    >
      <path
        d="M0 112C174 54 315 52 482 100c151 43 298 53 445 13 165-44 304-85 513-36v57H0z"
        fill="currentColor"
      />
      <path
        d="M0 74c176-35 314-25 462 29 150 55 319 63 492 15 181-50 323-59 486-22"
        fill="none"
        stroke="currentColor"
        strokeOpacity="0.42"
        strokeWidth="2"
      />
    </svg>
  );
}
