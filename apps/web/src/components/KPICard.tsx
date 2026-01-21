import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';

interface KPICardProps {
  title: string;
  value: number | string;
  description?: string;
  icon?: LucideIcon;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  color?: 'purple' | 'blue' | 'green' | 'yellow' | 'red';
}

const colorClasses = {
  purple: 'bg-accent-purple/10 text-accent-purple',
  blue: 'bg-accent-blue/10 text-accent-blue',
  green: 'bg-accent-green/10 text-accent-green',
  yellow: 'bg-accent-yellow/10 text-accent-yellow',
  red: 'bg-accent-red/10 text-accent-red',
};

export function KPICard({
  title,
  value,
  description,
  icon: Icon,
  trend,
  trendValue,
  color = 'purple',
}: KPICardProps) {
  return (
    <div className="card group transition-all hover:border-border-focus hover:shadow-glow-sm">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-sm text-text-secondary">{title}</p>
          <p className="text-3xl font-bold text-text-primary">{value}</p>
          {description && (
            <p className="text-xs text-text-tertiary">{description}</p>
          )}
        </div>
        {Icon && (
          <div className={cn('rounded-lg p-2', colorClasses[color])}>
            <Icon className="h-5 w-5" />
          </div>
        )}
      </div>
      {trend && trendValue && (
        <div className="mt-3 flex items-center gap-1 text-xs">
          <span
            className={cn(
              trend === 'up' && 'text-accent-green',
              trend === 'down' && 'text-accent-red',
              trend === 'neutral' && 'text-text-secondary'
            )}
          >
            {trend === 'up' && '↑'}
            {trend === 'down' && '↓'}
            {trend === 'neutral' && '→'}
            {trendValue}
          </span>
          <span className="text-text-tertiary">vs. ontem</span>
        </div>
      )}
    </div>
  );
}
