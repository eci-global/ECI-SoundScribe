import {
  Activity,
  ArrowUpRight,
  BarChart3,
  CheckCircle2,
  Flame,
  Heart,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingUp,
} from 'lucide-react';

export const COACHING_GRADIENTS = {
  hero: 'bg-gradient-to-r from-red-700 via-red-600 to-red-700',
  supportHero: 'bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900',
  workspace: 'bg-gradient-to-br from-gray-50 via-white to-gray-100',
};

export const BADGE_TONES = {
  persona: 'bg-red-100 text-red-800 border border-red-200',
  personaSupport: 'bg-gray-200 text-gray-800 border border-gray-300',
  momentum: 'bg-red-50 text-red-600 border border-red-200',
  impact: 'bg-emerald-100 text-emerald-800 border border-emerald-200',
  caution: 'bg-rose-100 text-rose-800 border border-rose-200',
};

export const PRACTICE_PRIORITY_TONES: Record<'high' | 'medium' | 'low', string> = {
  high: 'border-red-300 bg-red-50 text-red-700',
  medium: 'border-amber-200 bg-amber-50 text-amber-700',
  low: 'border-emerald-200 bg-emerald-50 text-emerald-700',
};

export const CHIP_STYLES = {
  base: 'inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2 text-sm text-gray-700 shadow-sm',
  positive: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  caution: 'border-red-200 bg-red-50 text-red-700',
};

export const PANEL_TONES = {
  card: 'rounded-xl border border-gray-200 bg-white shadow-sm',
  surface: 'rounded-xl border border-gray-100 bg-white shadow-sm',
  accent: 'rounded-xl border border-red-100 bg-red-50 shadow-sm',
};

export const ICON_MAP = {
  heroSpark: Sparkles,
  heroTrend: TrendingUp,
  heroReliability: ShieldCheck,
  heroHeart: Heart,
  heroFlame: Flame,
  heroTarget: Target,
  heroActivity: Activity,
  heroMomentum: ArrowUpRight,
  heroWins: CheckCircle2,
  heroInsights: BarChart3,
};

export const SECTION_HEADLINE = 'text-sm font-semibold text-gray-900';
export const SECTION_SUBTEXT = 'text-xs text-gray-500';
export const SECTION_CONTAINER = 'rounded-xl border border-gray-200 bg-white shadow-sm';

