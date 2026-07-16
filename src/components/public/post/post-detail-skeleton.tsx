type PostDetailSkeletonProps = {
  loadingLabel: string;
};

/** Detail-page loading skeleton (docs/17-H): shape-matching blocks, hidden from assistive tech. */
export function PostDetailSkeleton({ loadingLabel }: PostDetailSkeletonProps) {
  return (
    <div>
      <p role="status" className="sr-only">
        {loadingLabel}
      </p>
      <div aria-hidden className="grid gap-8 lg:grid-cols-12">
        <div className="flex flex-col gap-4 lg:col-span-8">
          <div className="h-3 w-48 animate-pulse rounded bg-slate-200" />
          <div className="h-9 w-full animate-pulse rounded bg-slate-200" />
          <div className="h-4 w-64 animate-pulse rounded bg-slate-200" />
          <div className="aspect-video w-full animate-pulse rounded-xl bg-slate-200" />
          <div className="flex flex-col gap-3">
            {Array.from({ length: 6 }, (_, index) => (
              <div key={index} className="h-4 w-full animate-pulse rounded bg-slate-200" />
            ))}
          </div>
        </div>
        <div className="lg:col-span-4">
          <div className="h-72 w-full animate-pulse rounded-xl bg-slate-200" />
        </div>
      </div>
    </div>
  );
}
