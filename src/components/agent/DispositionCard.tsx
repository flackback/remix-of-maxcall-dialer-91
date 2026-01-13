import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface DispositionCardProps {
  title: string;
  icon: ReactNode;
  variant?: 'positive' | 'info' | 'warning' | 'negative' | 'neutral';
  size?: 'sm' | 'md';
  onClick?: () => void;
  selected?: boolean;
  disabled?: boolean;
  className?: string;
}

export function DispositionCard({
  title,
  icon,
  variant = 'neutral',
  size = 'md',
  onClick,
  selected,
  disabled,
  className,
}: DispositionCardProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'metric-card group relative overflow-hidden transition-all duration-300 hover:scale-[1.02] hover:shadow-elevated cursor-pointer text-left w-full',
        selected && 'ring-2 ring-primary ring-offset-2 ring-offset-background',
        disabled && 'opacity-50 cursor-not-allowed hover:scale-100',
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
          variant === 'info' && 'bg-primary',
          variant === 'neutral' && 'bg-muted-foreground'
        )}
      />

      <div className="relative flex items-center gap-3">
        {/* Icon */}
        <div
          className={cn(
            'flex items-center justify-center rounded-lg transition-colors',
            size === 'sm' ? 'h-8 w-8' : 'h-10 w-10',
            variant === 'positive' && 'bg-metric-positive/20 text-metric-positive',
            variant === 'negative' && 'bg-metric-negative/20 text-metric-negative',
            variant === 'warning' && 'bg-metric-warning/20 text-metric-warning',
            variant === 'info' && 'bg-primary/20 text-primary',
            variant === 'neutral' && 'bg-muted text-muted-foreground'
          )}
        >
          {icon}
        </div>

        {/* Title */}
        <span
          className={cn(
            'font-semibold tracking-tight',
            size === 'sm' ? 'text-sm' : 'text-base',
            variant === 'positive' && 'text-metric-positive',
            variant === 'negative' && 'text-metric-negative',
            variant === 'warning' && 'text-metric-warning',
            variant === 'info' && 'text-primary',
            variant === 'neutral' && 'text-foreground'
          )}
        >
          {title}
        </span>
      </div>
    </button>
  );
}
