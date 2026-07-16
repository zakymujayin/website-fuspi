type PostListSkeletonProps = {
  loadingLabel: string;
};

/** List-page loading skeleton (docs/17-H): shape-matching blocks, hidden from assistive tech. */
export function PostListSkeleton({ loadingLabel }: PostListSkeletonProps) {
  return (
    <div>
      <p role="status" className="sr-only">
        {loadingLabel}
      </p>
      <div aria-hidden className="flex flex-col">
        {Array.from({ length: 5 }, (_, index) => (
          <div key={index} className="flex flex-col gap-5 border-b border-slate-200 py-6 first:pt-0 sm:flex-row">
            <div className="aspect-video w-full shrink-0 animate-pulse rounded-lg bg-slate-200 sm:w-60" />
            <div className="flex flex-1 flex-col gap-3">
              <div className="h-3 w-20 animate-pulse rounded bg-slate-200" />
              <div className="h-5 w-3/4 animate-pulse rounded bg-slate-200" />
              <div className="h-3 w-40 animate-pulse rounded bg-slate-200" />
              <div className="h-3 w-full animate-pulse rounded bg-slate-200" />
              <div className="h-3 w-2/3 animate-pulse rounded bg-slate-200" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
