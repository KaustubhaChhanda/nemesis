import { cn } from '@/lib/utils';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  className?: string;
  action?: React.ReactNode;
}

export function EmptyState({ icon, title, description, className, action }: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center py-20 px-8 text-center',
        className
      )}
    >
      {icon && (
        <div className="w-14 h-14 rounded-full bg-zinc-50 border border-zinc-100 flex items-center justify-center mb-5 text-zinc-300">
          {icon}
        </div>
      )}
      <p className="text-sm font-semibold text-zinc-900">{title}</p>
      {description && (
        <p className="text-xs text-zinc-400 mt-1.5 max-w-xs leading-relaxed">{description}</p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
