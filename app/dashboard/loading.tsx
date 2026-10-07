import { Skeleton } from "@/components/ui/misc";

export default function Loading() {
  return (
    <div className="container space-y-6 py-8" aria-busy="true">
      <Skeleton className="h-8 w-48" />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-40" />
        ))}
      </div>
    </div>
  );
}
