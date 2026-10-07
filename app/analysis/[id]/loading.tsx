import { Skeleton } from "@/components/ui/misc";

export default function Loading() {
  return (
    <div className="container space-y-6 py-8" aria-busy="true">
      <Skeleton className="h-9 w-72" />
      <Skeleton className="h-40" />
      <div className="grid gap-4 lg:grid-cols-2">
        <Skeleton className="h-[50vh]" />
        <Skeleton className="h-[50vh]" />
      </div>
    </div>
  );
}
