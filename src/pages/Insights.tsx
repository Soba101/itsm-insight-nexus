import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { TopicsPanel } from "@/components/TopicsPanel";
import { DuplicatesPanel } from "@/components/DuplicatesPanel";
import { Filters } from "@/lib/types";
import { api } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";

export default function Insights() {
  const [filters] = useState<Filters>({});

  const { data: topics, isLoading: topicsLoading } = useQuery({
    queryKey: ["topics", filters],
    queryFn: () => api.getTopics(filters),
  });

  const { data: duplicates, isLoading: duplicatesLoading } = useQuery({
    queryKey: ["duplicates", filters],
    queryFn: () => api.getDuplicates(filters),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Insights</h1>
        <p className="text-muted-foreground">NLP-powered analysis and duplicate detection</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div>
          {topicsLoading ? (
            <Skeleton className="h-96" />
          ) : topics ? (
            <TopicsPanel topics={topics} />
          ) : null}
        </div>
        <div>
          {duplicatesLoading ? (
            <Skeleton className="h-96" />
          ) : duplicates ? (
            <DuplicatesPanel clusters={duplicates} />
          ) : null}
        </div>
      </div>
    </div>
  );
}
