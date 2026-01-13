import { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: ReactNode;
  trend?: {
    value: number;
    direction: 'up' | 'down' | 'neutral';
    label?: string;
  };
  variant?: 'default' | 'positive' | 'negative' | 'warning' | 'neutral';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function MetricCard({
  title,
  value,
  subtitle,
  icon,
  trend,
  variant = 'default',
  size = 'md',
  className,
}: MetricCardProps) {
  const TrendIcon =
    trend?.direction === 'up' ? TrendingUp : trend?.direction === 'down' ? TrendingDown : Minus;

  return (
    <div
      className={cn(
        'metric-card group relative overflow-hidden transition-all duration-300 hover:scale-[1.02] hover:shadow-elevated',
        className
      )}
    >
      {/* Background glow effect */}
      <div
        className={cn(
          'absolute -right-4 -top-4 h-24 w-24 rounded-full opacity-20 blur-2xl transition-all duration-500 group-hover:opacity-40',
          variant === 'positive' && 'bg-metric-positive',
          variant === 'negative' && 'bg-metric-negative',
          variant === 'warning' && 'bg-metric-warning',
          variant === 'neutral' && 'bg-metric-neutral',
          variant === 'default' && 'bg-primary'
        )}
      />

      <div className="relative flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {title}
          </p>
          <p
            className={cn(
              'font-mono font-bold tracking-tight',
              size === 'sm' && 'text-2xl',
              size === 'md' && 'text-3xl',
              size === 'lg' && 'text-4xl',
              variant === 'positive' && 'text-metric-positive',
              variant === 'negative' && 'text-metric-negative',
              variant === 'warning' && 'text-metric-warning',
              variant === 'neutral' && 'text-metric-neutral'
            )}
          >
            {value}
          </p>
          {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
        </div>

        {icon && (
          <div
            className={cn(
              'flex h-10 w-10 items-center justify-center rounded-lg',
              variant === 'positive' && 'bg-metric-positive/20 text-metric-positive',
              variant === 'negative' && 'bg-metric-negative/20 text-metric-negative',
              variant === 'warning' && 'bg-metric-warning/20 text-metric-warning',
              variant === 'neutral' && 'bg-metric-neutral/20 text-metric-neutral',
              variant === 'default' && 'bg-primary/20 text-primary'
            )}
          >
            {icon}
          </div>
        )}
      </div>

      {trend && (
        <div className="mt-3 flex items-center gap-1.5">
          <div
            className={cn(
              'flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-medium',
              trend.direction === 'up' && 'bg-metric-positive/20 text-metric-positive',
              trend.direction === 'down' && 'bg-metric-negative/20 text-metric-negative',
              trend.direction === 'neutral' && 'bg-muted text-muted-foreground'
            )}
          >
            <TrendIcon className="h-3 w-3" />
            <span>{Math.abs(trend.value)}%</span>
          </div>
          {trend.label && <span className="text-xs text-muted-foreground">{trend.label}</span>}
        </div>
      )}
    </div>
  );
}
