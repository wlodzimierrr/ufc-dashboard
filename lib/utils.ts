/**
 * Utility functions for the dashboard
 */

/**
 * Format a number as a percentage string
 */
export function formatPercentage(value: number, decimals = 1): string {
  if (!value && value !== 0) return 'N/A';
  return `${(value * 100).toFixed(decimals)}%`;
}

/**
 * Format a probability as a percentage string
 */
export function formatProbability(value: number, decimals = 1): string {
  if (!value && value !== 0) return 'N/A';
  return `${(value * 100).toFixed(decimals)}%`;
}

/**
 * Format a date to a readable string
 */
export function formatDate(dateString: string | Date): string {
  try {
    const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return 'N/A';
  }
}

/**
 * Format a datetime to a readable string
 */
export function formatDateTime(dateString: string | Date): string {
  try {
    const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return 'N/A';
  }
}

/**
 * Format a number with commas
 */
export function formatNumber(value: number): string {
  return value.toLocaleString('en-US');
}

/**
 * Determine confidence tier color
 */
export function getConfidenceColor(tier: string): string {
  switch (tier?.toLowerCase()) {
    case 'high':
      return 'bg-green-900 text-green-200';
    case 'medium':
      return 'bg-blue-900 text-blue-200';
    case 'low':
      return 'bg-yellow-900 text-yellow-200';
    case 'uncertain':
      return 'bg-red-900 text-red-200';
    default:
      return 'bg-slate-700 text-slate-200';
  }
}

/**
 * Determine if a prediction is correct (color)
 */
export function getCorrectnessColor(isCorrect: boolean | null): string {
  if (isCorrect === true) return 'text-green-400 bg-green-900/20';
  if (isCorrect === false) return 'text-red-400 bg-red-900/20';
  return 'text-slate-400 bg-slate-700/20';
}

/**
 * Determine if a prediction is correct (label)
 */
export function getCorrectnessLabel(isCorrect: boolean | null): string {
  if (isCorrect === true) return '✓ Correct';
  if (isCorrect === false) return '✗ Incorrect';
  return 'Pending';
}
