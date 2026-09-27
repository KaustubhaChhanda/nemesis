import { cn } from '@/lib/utils';

type ConfidenceLevel = 'strong' | 'probable' | 'weak' | 'candidate';

function getLevel(score: number): ConfidenceLevel {
  if (score >= 0.85) return 'strong';
  if (score >= 0.70) return 'probable';
  if (score >= 0.50) return 'weak';
  return 'candidate';
}

const levelConfig: Record<ConfidenceLevel, { label: string; dotCls: string }> = {
  strong:    { label: 'Strong',    dotCls: 'bg-emerald-500' },
  probable:  { label: 'Probable',  dotCls: 'bg-blue-500' },
  weak:      { label: 'Probable',  dotCls: 'bg-blue-400' },
  candidate: { label: 'Candidate', dotCls: 'bg-amber-500' },
};

interface ConfidenceBadgeProps {
  score: number;
  showPercent?: boolean;
  className?: string;
}

export function ConfidenceBadge({ score, showPercent = true, className }: ConfidenceBadgeProps) {
  const level = getLevel(score);
  const { label, dotCls } = levelConfig[level];

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md border border-zinc-200 bg-white text-zinc-800 text-[10px] font-bold uppercase tracking-wider whitespace-nowrap shadow-2xs',
        className
      )}
    >
      <span className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', dotCls)} />
      <span>{label}</span>
      {showPercent && (
        <span className="text-zinc-950 font-bold">({Math.round(score * 100)}%)</span>
      )}
    </span>
  );
}
