import { Loader2 } from "lucide-react";

/**
 * PageLoader component
 * Used as a Suspense fallback while lazy-loaded pages are being fetched
 */
export const PageLoader = () => {
  return (
    <div className="flex items-center justify-center min-h-screen w-full">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Loading page...</p>
      </div>
    </div>
  );
};
