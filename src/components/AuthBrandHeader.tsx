import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface AuthBrandHeaderProps {
  icon: ReactNode;
  title: string;
  description: string;
  tone?: "default" | "success";
}

/**
 * Shared brand strip for auth cards so all flows reinforce product identity.
 */
export function AuthBrandHeader({ icon, title, description, tone = "default" }: AuthBrandHeaderProps) {
  const toneClasses =
    tone === "success"
      ? "bg-success/10 border-success/40"
      : "bg-primary/10 border-primary/30";

  return (
    <header className="flex flex-col">
      <div className={cn("flex items-center gap-3 rounded-t-lg border-b px-6 py-4", toneClasses)}>
        <div className="flex h-10 w-10 items-center justify-center rounded-md bg-background/70 shadow-sm" aria-hidden="true">
          {icon}
        </div>
        <div className="flex flex-col">
          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">ITSM Insight Nexus</span>
          <span className="text-sm text-muted-foreground">Secure Service Operations Portal</span>
        </div>
      </div>
      <div className="px-6 pb-4 pt-6 text-center">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">{title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{description}</p>
      </div>
    </header>
  );
}
