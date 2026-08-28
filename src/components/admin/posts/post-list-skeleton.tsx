type AdminPostListSkeletonProps = {
  loadingLabel: string;
};

/** Post list loading skeleton: shape-matching table rows, hidden from assistive tech. */
export function AdminPostListSkeleton({ loadingLabel }: AdminPostListSkeletonProps) {
  return (
    <div>
      <p role="status" className="sr-only">
        {loadingLabel}
      </p>
      <div aria-hidden className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full border-collapse text-sm">
          <tbody className="divide-y divide-slate-100">
            {Array.from({ length: 6 }, (_, index) => (
              <tr key={index}>
                <td className="px-4 py-3">
                  <div className="h-4 w-64 max-w-full animate-pulse rounded bg-slate-200 motion-reduce:animate-none" />
                </td>
                <td className="px-4 py-3">
                  <div className="h-3 w-20 animate-pulse rounded bg-slate-200 motion-reduce:animate-none" />
                </td>
                <td className="hidden px-4 py-3 lg:table-cell">
                  <div className="h-3 w-28 animate-pulse rounded bg-slate-200 motion-reduce:animate-none" />
                </td>
                <td className="px-4 py-3">
                  <div className="h-6 w-16 animate-pulse rounded-full bg-slate-200 motion-reduce:animate-none" />
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end">
                    <div className="h-3 w-24 animate-pulse rounded bg-slate-200 motion-reduce:animate-none" />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
