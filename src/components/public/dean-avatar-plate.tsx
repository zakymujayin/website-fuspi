/**
 * Formal monogram plate used until a real dean portrait is supplied. Avoids
 * pairing a stranger's stock photo with a specific named official.
 */
export function DeanAvatarPlate({initials, name}: {initials: string; name: string}) {
  const patternId = "dean-plate-pattern";

  return (
    <div
      role="img"
      aria-label={name}
      className="relative aspect-[4/5] w-full overflow-hidden rounded-md border border-brass-400/40 bg-gradient-to-br from-navy-950 via-navy-900 to-royal-800 shadow-sm"
    >
      <svg
        aria-hidden
        className="absolute inset-0 size-full opacity-[0.16]"
        viewBox="0 0 200 200"
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          <pattern id={patternId} width="34" height="34" patternUnits="userSpaceOnUse">
            <g fill="none" stroke="#ffffff" strokeWidth="0.8">
              <rect x="6.5" y="6.5" width="21" height="21" />
              <rect x="6.5" y="6.5" width="21" height="21" transform="rotate(45 17 17)" />
            </g>
          </pattern>
        </defs>
        <rect width="200" height="200" fill={`url(#${patternId})`} />
      </svg>

      <div className="pointer-events-none absolute inset-3 rounded-md border border-brass-400/30" />

      <div className="relative flex h-full items-center justify-center">
        <span className="text-4xl font-bold tracking-tight text-white/90 md:text-5xl">
          {initials}
        </span>
      </div>
    </div>
  );
}
