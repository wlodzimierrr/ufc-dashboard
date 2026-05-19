interface ConfidenceBadgeProps {
  tier: 'High' | 'Medium' | 'Low' | 'Uncertain';
}

export function ConfidenceBadge({ tier }: ConfidenceBadgeProps) {
  const baseClasses =
    'inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium';
  
  const colorMap: Record<string, string> = {
    'High': 'bg-red-950 text-red-200',
    'Medium': 'bg-red-900/60 text-red-300',
    'Low': 'bg-yellow-900/60 text-yellow-300',
    'Uncertain': 'bg-gray-700 text-gray-200',
  };
  
  const colorClasses = colorMap[tier] || 'bg-gray-700 text-gray-200';

  return <span className={`${baseClasses} ${colorClasses}`}>{tier}</span>;
}
