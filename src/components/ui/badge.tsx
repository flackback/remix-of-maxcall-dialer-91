import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground hover:bg-primary/80",
        secondary: "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive: "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80",
        outline: "text-foreground",
        ready: "border-transparent bg-status-ready/20 text-status-ready",
        busy: "border-transparent bg-status-busy/20 text-status-busy",
        wrapup: "border-transparent bg-status-wrapup/20 text-status-wrapup",
        pause: "border-transparent bg-status-pause/20 text-status-pause",
        offline: "border-transparent bg-status-offline/20 text-status-offline",
        positive: "border-transparent bg-metric-positive/20 text-metric-positive",
        negative: "border-transparent bg-metric-negative/20 text-metric-negative",
        warning: "border-transparent bg-metric-warning/20 text-metric-warning",
        neutral: "border-transparent bg-metric-neutral/20 text-metric-neutral",
        ai: "border-primary/30 bg-primary/10 text-primary",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
