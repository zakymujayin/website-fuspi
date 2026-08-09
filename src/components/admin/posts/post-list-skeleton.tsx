type AdminPostListSkeletonProps = {
  loadingLabel: string;
};

/** Post list loading skeleton: shape-matching rows, hidden from assistive tech. */
export function AdminPostListSkeleton({ loadingLabel }: AdminPostListSkeletonProps) {
  return (
    <div>
      <p role="status" className="sr-only">
        {loadingLabel}
      </p>
      <div aria-hidden className="flex flex-col gap-2">
        {Array.from({ length: 6 }, (_, index) => (
          <div key={index} className="rounded-xl border border-slate-200 bg-white px-4 py-4 sm:px-5">
            <div className="flex items-start gap-3">
              <div className="h-5 flex-1 animate-pulse rounded bg-slate-200 motion-reduce:animate-none" />
              <div className="h-6 w-20 animate-pulse rounded-full bg-slate-200 motion-reduce:animate-none" />
            </div>
            <div className="mt-3 flex gap-4">
              <div className="h-3 w-16 animate-pulse rounded bg-slate-200 motion-reduce:animate-none" />
              <div className="h-3 w-24 animate-pulse rounded bg-slate-200 motion-reduce:animate-none" />
              <div className="h-3 w-32 animate-pulse rounded bg-slate-200 motion-reduce:animate-none" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
