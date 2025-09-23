// Simplified framework benchmarking service - mock implementation
import type { 
  SalesFrameworkType, 
  FrameworkAnalysis,
  IndustryBenchmark,
  BenchmarkComparison,
  CoachingRecommendation
} from '@/types/salesFrameworks';

// Mock data to avoid database dependency
const MOCK_BENCHMARKS: IndustryBenchmark[] = [
  {
    industry: 'Technology',
    frameworkType: 'BANT',
    componentName: 'budget',
    averageScore: 7.2,
    percentile25: 6.0,
    percentile50: 7.5,
    percentile75: 8.5,
    percentile90: 9.2,
    sampleSize: 1500
  }
];

export async function getIndustryBenchmarks(): Promise<IndustryBenchmark[]> {
  return MOCK_BENCHMARKS;
}

export async function compareToBenchmark(
  userScore: number,
  industry: string,
  frameworkType: SalesFrameworkType,
  componentName: string
): Promise<BenchmarkComparison> {
  return {
    userScore,
    industryAverage: 7.0,
    percentile: 65,
    ranking: 'above_average',
    improvement_potential: 1.5
  };
}

export async function generateCoachingRecommendations(): Promise<CoachingRecommendation[]> {
  return [{
    priority: 'medium',
    category: 'discovery',
    title: 'Improve discovery questions',
    description: 'Focus on asking better qualifying questions',
    action_items: ['Practice discovery techniques'],
    estimated_impact: 2.0,
    difficulty_level: 'medium',
    time_to_implement: '2-3 weeks'
  }];
}