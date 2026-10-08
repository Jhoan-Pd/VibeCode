import * as React from "react";
import { AlertTriangle, CheckCircle2, Info } from "lucide-react";
import { cn } from "@/lib/utils";

export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("animate-pulse rounded-md bg-muted", className)} {...props} />;
}

type AlertVariant = "info" | "error" | "success";

const estilos: Record<AlertVariant, string> = {
  info: "border-primary/30 bg-primary/10 text-foreground",
  error: "border-destructive/40 bg-destructive/10 text-foreground",
  success: "border-emerald-500/40 bg-emerald-500/10 text-foreground",
};

export function Alert({
  variant = "info",
  title,
  children,
  className,
}: {
  variant?: AlertVariant;
  title?: string;
  children?: React.ReactNode;
  className?: string;
}) {
  const Icono = variant === "error" ? AlertTriangle : variant === "success" ? CheckCircle2 : Info;
  return (
    <div role={variant === "error" ? "alert" : "status"} className={cn("flex gap-3 rounded-lg border p-4 text-sm", estilos[variant], className)}>
      <Icono className={cn("mt-0.5 size-4 shrink-0", variant === "error" && "text-destructive", variant === "success" && "text-emerald-500", variant === "info" && "text-primary")} />
      <div className="space-y-1">
        {title && <p className="font-medium">{title}</p>}
        {children && <div className="text-muted-foreground">{children}</div>}
      </div>
    </div>
  );
}

/** Pestañas simples y accesibles (sin dependencia extra). */
export function Tabs<T extends string>({
  value,
  onChange,
  items,
  className,
}: {
  value: T;
  onChange: (v: T) => void;
  items: { id: T; label: React.ReactNode }[];
  className?: string;
}) {
  return (
    <div
      role="tablist"
      className={cn("inline-flex h-10 max-w-full items-center overflow-x-auto rounded-lg bg-muted p-1 text-muted-foreground", className)}
    >
      {items.map((it) => (
        <button
          key={it.id}
          role="tab"
          type="button"
          aria-selected={value === it.id}
          onClick={() => onChange(it.id)}
          className={cn(
            "inline-flex items-center gap-1.5 whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition-all",
            value === it.id ? "bg-background text-foreground shadow-sm" : "hover:text-foreground",
          )}
        >
          {it.label}
        </button>
      ))}
    </div>
  );
}

export function Spinner({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn("inline-block size-4 animate-spin rounded-full border-2 border-current border-t-transparent", className)}
    />
  );
}
