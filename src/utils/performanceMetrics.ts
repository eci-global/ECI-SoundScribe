import { MetricStatus, TrendDirection } from '@/components/analytics/HeroMetricCard';

/**
 * Determine metric status based on score
 */
export function getMetricStatus(score: number): MetricStatus {
  if (score >= 85) return 'excellent';
  if (score >= 70) return 'good';
  if (score >= 50) return 'warning';
  return 'alert';
}

/**
 * Determine trend direction (mock for now - could be calculated from historical data)
 */
export function getTrendDirection(current: number, previous?: number): TrendDirection {
  if (!previous) return 'neutral';
  if (current > previous) return 'up';
  if (current < previous) return 'down';
  return 'neutral';
}

/**
 * Format trend percentage
 */
export function formatTrend(current: number, previous?: number): string | undefined {
  if (!previous) return undefined;

  const diff = current - previous;
  const percentChange = Math.abs((diff / previous) * 100);

  if (percentChange < 1) return undefined; // Don't show negligible changes

  const sign = diff > 0 ? '+' : '';
  return `${sign}${percentChange.toFixed(1)}%`;
}

/**
 * Get subtitle text based on status
 */
export function getStatusSubtitle(status: MetricStatus): string {
  switch (status) {
    case 'excellent': return 'Exceeds expectations';
    case 'good': return 'Meets target';
    case 'warning': return 'Needs attention';
    case 'alert': return 'Requires action';
    default: return 'Standard';
  }
}

/**
 * Calculate resolution efficiency (simplified)
 */
export function calculateResolutionTime(duration: number, wordsPerMinute: number): string {
  const minutes = Math.round(duration / 60);
  return `${minutes}m`;
}

/**
 * Get escalation risk level color and status
 */
export function getEscalationStatus(risk: 'low' | 'medium' | 'high'): {
  status: MetricStatus;
  subtitle: string;
} {
  switch (risk) {
    case 'low':
      return { status: 'excellent', subtitle: 'Well managed' };
    case 'medium':
      return { status: 'warning', subtitle: 'Monitor closely' };
    case 'high':
      return { status: 'alert', subtitle: 'Immediate attention' };
  }
}

/**
 * Calculate section score from behavior ratings
 */
export function calculateSectionScore(behaviors: Record<string, { rating: 'YES' | 'NO' | 'UNCERTAIN' }>): number {
  const behaviorList = Object.values(behaviors);
  if (behaviorList.length === 0) return 0;

  const yesCount = behaviorList.filter(b => b.rating === 'YES').length;
  return Math.round((yesCount / behaviorList.length) * 100);
}
