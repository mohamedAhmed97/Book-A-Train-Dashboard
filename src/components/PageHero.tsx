import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type Tone = "primary" | "emerald" | "amber" | "violet";

const TONE: Record<Tone, string> = {
  primary: "from-primary via-primary to-[hsl(var(--accent))]",
  emerald: "from-emerald-600 via-emerald-500 to-teal-500",
  amber: "from-amber-500 via-orange-500 to-rose-500",
  violet: "from-violet-600 via-fuchsia-500 to-pink-500",
};

export function PageHero({
  icon: Icon,
  eyebrow,
  title,
  subtitle,
  action,
  tone = "primary",
  className,
}: {
  icon?: LucideIcon;
  eyebrow?: string;
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  tone?: Tone;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative mb-7 overflow-hidden rounded-2xl border border-white/15 p-6 md:p-7 text-primary-foreground shadow-lg",
        "bg-gradient-to-br",
        TONE[tone],
        className,
      )}
    >
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute -top-16 -end-16 h-44 w-44 rounded-full bg-white/15 blur-2xl" />
        <div className="absolute -bottom-16 start-1/4 h-40 w-40 rounded-full bg-white/10 blur-3xl" />
      </div>

      <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-5">
        <div className="flex items-center gap-4 min-w-0">
          {Icon && (
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/15 backdrop-blur ring-1 ring-white/25 shadow-sm">
              <Icon className="h-6 w-6" />
            </div>
          )}
          <div className="min-w-0">
            {eyebrow && (
              <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-primary-foreground/80 mb-1.5">
                {eyebrow}
              </p>
            )}
            <h1 className="text-2xl md:text-3xl font-semibold tracking-tight leading-tight truncate">{title}</h1>
            {subtitle && <p className="mt-1 text-sm text-primary-foreground/85">{subtitle}</p>}
          </div>
        </div>
        {action && <div className="flex flex-wrap gap-2 shrink-0">{action}</div>}
      </div>
    </div>
  );
}
