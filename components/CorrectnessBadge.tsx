import { getCorrectnessLabel } from '@/lib/utils';

interface CorrectnessBadgeProps {
  isCorrect: boolean | null;
}

export function CorrectnessBadge({ isCorrect }: CorrectnessBadgeProps) {
  const label = getCorrectnessLabel(isCorrect);
  
  let colorClasses = 'text-gray-400 bg-gray-700/40';
  
  if (isCorrect === true) {
    colorClasses = 'text-green-400 bg-green-900/30';
  } else if (isCorrect === false) {
    colorClasses = 'text-red-400 bg-red-900/30';
  }

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium ${colorClasses}`}>
      {label}
    </span>
  );
}
