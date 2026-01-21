import { cn } from '@/lib/utils';

type BadgeVariant = 'default' | 'purple' | 'blue' | 'green' | 'yellow' | 'red';

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
}

const variantClasses: Record<BadgeVariant, string> = {
  default: 'bg-surface text-text-secondary',
  purple: 'bg-accent-purple/20 text-accent-purple',
  blue: 'bg-accent-blue/20 text-accent-blue',
  green: 'bg-accent-green/20 text-accent-green',
  yellow: 'bg-accent-yellow/20 text-accent-yellow',
  red: 'bg-accent-red/20 text-accent-red',
};

export function Badge({ children, variant = 'default', className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
        variantClasses[variant],
        className
      )}
    >
      {children}
    </span>
  );
}
