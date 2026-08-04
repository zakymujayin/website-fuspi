function Skeleton({ className }: { className?: string }) {
  return <div className={["animate-pulse rounded-md bg-slate-200", className].filter(Boolean).join(" ")} />;
}

export function AdminPageListSkeleton() {
  return (
    <div className="flex flex-col gap-4" aria-busy="true" aria-label="Memuat daftar halaman…">
      {Array.from({ length: 5 }).map((_, index) => (
        <div
          key={index}
          className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white px-4 py-4 sm:px-5"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <Skeleton className="h-5 w-2/3 max-w-md" />
            <Skeleton className="h-6 w-24" />
          </div>
          <div className="flex flex-wrap gap-4">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-4 w-36" />
            <Skeleton className="h-4 w-40" />
          </div>
        </div>
      ))}
    </div>
  );
}
