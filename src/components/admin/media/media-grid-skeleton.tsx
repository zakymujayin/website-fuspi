type AdminMediaGridSkeletonProps = {
  loadingLabel: string;
};

/** Media Library loading skeleton (docs/17-H): shape-matching blocks, hidden from assistive tech. */
export function AdminMediaGridSkeleton({ loadingLabel }: AdminMediaGridSkeletonProps) {
  return (
    <div>
      <p role="status" className="sr-only">
        {loadingLabel}
      </p>
      <div aria-hidden className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 8 }, (_, index) => (
          <div key={index} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="aspect-square w-full animate-pulse bg-slate-200 motion-reduce:animate-none" />
            <div className="flex flex-col gap-2 p-4">
              <div className="h-4 w-16 animate-pulse rounded-full bg-slate-200 motion-reduce:animate-none" />
              <div className="h-4 w-3/4 animate-pulse rounded bg-slate-200 motion-reduce:animate-none" />
              <div className="h-3 w-1/2 animate-pulse rounded bg-slate-200 motion-reduce:animate-none" />
              <div className="h-3 w-2/3 animate-pulse rounded bg-slate-200 motion-reduce:animate-none" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
