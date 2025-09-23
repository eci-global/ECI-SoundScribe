import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDashboard } from '@/hooks/useDashboard';
import { useAuth } from '@/hooks/useAuth';
import { 
  LayoutDashboard, 
  TrendingUp, 
  Calendar,
  Upload,
  Brain,
  Star,
  Zap,
  Trophy,
  BookOpen,
  FileText,
  ChevronRight,
  Sparkles,
  Phone,
  AlertTriangle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import UploadModal from '@/components/dashboard/UploadModal';
import { SalesPerformanceCard } from '@/components/dashboard/SalesPerformanceCard';
import AICoachingInsights from '@/components/dashboard/AICoachingInsights';
import { PerformanceTrendsWidget } from '@/components/dashboard/PerformanceTrendsWidget';
import { RecentCallsWidget } from '@/components/dashboard/RecentCallsWidget';
import { SkillProgressTracker } from '@/components/dashboard/SkillProgressTracker';
import LiveDuration, { HybridDuration, StaticDuration } from '@/components/ui/LiveDuration';
import { useFileOperations } from '@/hooks/useFileOperations';
import { format } from 'date-fns';
import { useCoachingInsights } from '@/hooks/useCoachingInsights';
import { useFrameworkAnalytics } from '@/hooks/useFrameworkAnalytics';
import { useSupportMode } from '@/contexts/SupportContext';

export function PersonalizedDashboard() {
  const navigate = useNavigate();
  const { recordings, loading } = useDashboard();
  const { user } = useAuth();
  const supportMode = useSupportMode();
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [selectedTimeRange, setSelectedTimeRange] = useState<'7d' | '30d' | '90d'>('30d');
  
  const { handleUpload, uploadProgress, isUploading } = useFileOperations({
    onRecordingProcessed: () => {}
  });
  
  // Get real coaching insights from database
  const { 
    insights: coachingData, 
    loading: coachingLoading 
  } = useCoachingInsights();
  
  // Get framework analytics for more detailed insights
  const { 
    trends: analyticsData 
  } = useFrameworkAnalytics();

  // Calculate personalized metrics
  console.log('PersonalizedDashboard: Calculating metrics for', recordings.length, 'recordings');
  
  // Enhanced debug logging for duration troubleshooting
  console.group(`📊 PersonalizedDashboard Duration Debug - ${recordings.length} recordings`);
  recordings.slice(0, 5).forEach((r, idx) => {
    console.log(`📁 Recording ${idx + 1}/${recordings.length}:`, {
      id: r.id,
      title: r.title?.substring(0, 30) + '...',
      status: r.status,
      duration: r.duration,
      durationType: typeof r.duration,
      durationValue: JSON.stringify(r.duration),
      durationNumber: typeof r.duration === 'string' ? parseFloat(r.duration) : r.duration,
      createdAt: r.created_at,
      timeSinceCreated: `${Math.round((Date.now() - new Date(r.created_at).getTime()) / 1000 / 60)} min ago`
    });
  });
  if (recordings.length > 5) {
    console.log(`... and ${recordings.length - 5} more recordings`);
  }
  console.groupEnd();

  // Show debugging table in console for easier viewing
  console.table(recordings.map(r => ({
    title: r.title?.substring(0, 20) + '...',
    status: r.status,
    coaching_eval: !!r.coaching_evaluation,
    enable_coaching: r.enable_coaching,
    created: new Date(r.created_at).toLocaleDateString()
  })));

  // Cache invalidation check - if recordings show error status but database is empty, clear cache
  useEffect(() => {
    if (recordings.length > 0 && !loading) {
      const hasErrorRecordings = recordings.some(r => r.status === 'error');
      if (hasErrorRecordings) {
        console.warn('⚠️ Detected recordings with error status - this might be cached data');
        console.warn('💡 Consider clearing browser cache or refreshing the page');
      }
    }
  }, [recordings, loading]);

  // More flexible filtering - use coaching_evaluation OR framework_analyses
  const recordingsWithFramework = recordings.filter(r => {
    const hasCoachingEval = r.coaching_evaluation && r.coaching_evaluation.overallScore;
    const hasFrameworkAnalyses = (r as any).framework_analyses && (r as any).framework_analyses.length > 0;
    const hasPrimaryFramework = (r as any).primary_framework;
    
    return hasCoachingEval || hasFrameworkAnalyses || hasPrimaryFramework;
  });
  
  console.log('PersonalizedDashboard: Recordings with framework data:', recordingsWithFramework.length);
  
  const recentRecordings = recordings.slice(0, 10);
  const completedRecordings = recordings.filter(r => r.status === 'completed');
  
  // Improved score calculation - use coaching_evaluation as fallback
  const calculateFrameworkScore = (recordings: any[], frameworkType: string) => {
    const frameworkRecordings = recordings.filter(r => {
      // Check if it has framework analysis for this type
      const hasSpecificFramework = (r as any).framework_analyses?.find((a: any) => a.frameworkType === frameworkType);
      // Or if primary framework matches
      const isPrimaryFramework = (r as any).primary_framework === frameworkType;
      // Or if it has coaching evaluation and we're looking at any framework
      const hasGeneralScore = r.coaching_evaluation?.overallScore;
      
      return hasSpecificFramework || isPrimaryFramework || (frameworkType === 'General' && hasGeneralScore);
    });
    
    if (frameworkRecordings.length === 0) return 0;
    
    const totalScore = frameworkRecordings.reduce((acc, r) => {
      // Try to get specific framework score first
      const frameworkScore = (r as any).framework_analyses?.find((a: any) => a.frameworkType === frameworkType)?.overallScore;
      if (frameworkScore) return acc + frameworkScore;
      
      // Fallback to coaching evaluation score
      const coachingScore = r.coaching_evaluation?.overallScore;
      if (coachingScore) return acc + coachingScore;
      
      return acc;
    }, 0);
    
    return totalScore / frameworkRecordings.length;
  };

  const avgBANTScore = calculateFrameworkScore(recordingsWithFramework, 'BANT');
  const avgMEDDICScore = calculateFrameworkScore(recordingsWithFramework, 'MEDDIC');
  const avgSPICEDScore = calculateFrameworkScore(recordingsWithFramework, 'SPICED');
  
  console.log('PersonalizedDashboard: Framework scores', {
    BANT: avgBANTScore,
    MEDDIC: avgMEDDICScore,
    SPICED: avgSPICEDScore
  });

  // Calculate overall performance score - use general coaching score if no specific framework scores
  let overallScore = 0;
  if (avgBANTScore > 0 || avgMEDDICScore > 0 || avgSPICEDScore > 0) {
    // If we have any framework scores, average them (only non-zero)
    const scores = [avgBANTScore, avgMEDDICScore, avgSPICEDScore].filter(s => s > 0);
    overallScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
  } else {
    // Fallback to general coaching evaluation scores
    const recordingsWithScores = recordings.filter(r => {
      // Handle different coaching_evaluation structures
      if (!r.coaching_evaluation) return false;
      
      // Check for overallScore property
      if (typeof r.coaching_evaluation === 'object' && r.coaching_evaluation !== null) {
        return (r.coaching_evaluation as any).overallScore !== undefined;
      }
      
      return false;
    });
    
    if (recordingsWithScores.length > 0) {
      const totalScore = recordingsWithScores.reduce((acc, r) => {
        const score = (r.coaching_evaluation as any)?.overallScore || 0;
        return acc + score;
      }, 0);
      overallScore = Math.round(totalScore / recordingsWithScores.length);
    } else if (recordings.length > 0) {
      // Ultimate fallback: if no coaching scores exist, estimate based on completed recordings
      const completedCount = recordings.filter(r => r.status === 'completed').length;
      const transcribedCount = recordings.filter(r => r.transcript).length;
      
      // Simple heuristic: having completed transcribed recordings = basic engagement
      if (transcribedCount > 0) {
        overallScore = Math.round((transcribedCount / recordings.length) * 60); // Max 60 for basic completion
      }
    }
  }
  
  console.log('PersonalizedDashboard: Overall score calculation:', {
    frameworkScores: { BANT: avgBANTScore, MEDDIC: avgMEDDICScore, SPICED: avgSPICEDScore },
    finalScore: overallScore,
    recordingsCount: recordings.length,
    completedCount: recordings.filter(r => r.status === 'completed').length
  });

  // Calculate improvement trend based on actual performance over time
  const calculateImprovementTrend = () => {
    const recordingsWithScores = recordings.filter(r => r.coaching_evaluation?.overallScore);
    console.log('PersonalizedDashboard: Recordings with scores for trend:', recordingsWithScores.length);
    
    if (recordingsWithScores.length < 2) return 0;
    
    // Sort by creation date
    const sortedRecordings = recordingsWithScores.sort((a, b) => 
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
    
    // For smaller datasets, compare first half vs second half
    const midpoint = Math.floor(sortedRecordings.length / 2);
    
    if (midpoint === 0) return 0;
    
    const olderRecordings = sortedRecordings.slice(0, midpoint);
    const recentRecordings = sortedRecordings.slice(midpoint);
    
    const olderAvg = olderRecordings.reduce((acc, r) => acc + (r.coaching_evaluation?.overallScore || 0), 0) / olderRecordings.length;
    const recentAvg = recentRecordings.reduce((acc, r) => acc + (r.coaching_evaluation?.overallScore || 0), 0) / recentRecordings.length;
    
    console.log('PersonalizedDashboard: Trend calculation', {
      olderCount: olderRecordings.length,
      recentCount: recentRecordings.length,
      olderAvg,
      recentAvg
    });
    
    if (olderAvg === 0) return 0;
    
    return Math.round(((recentAvg - olderAvg) / olderAvg) * 100);
  };
  
  const improvementTrend = calculateImprovementTrend();
  
  // Calculate streak (consecutive days with recordings)
  const calculatePerformanceStreak = () => {
    if (recordings.length === 0) return 0;
    
    const uniqueDates = recordings
      .map(r => new Date(r.created_at).toDateString())
      .filter((date, index, arr) => arr.indexOf(date) === index) // Remove duplicates
      .sort((a, b) => new Date(b).getTime() - new Date(a).getTime()); // Sort desc
    
    console.log('PersonalizedDashboard: Unique recording dates:', uniqueDates);
    
    let streak = 0;
    const today = new Date().toDateString();
    
    // Check if there's a recording today
    if (uniqueDates.includes(today)) {
      streak = 1;
      
      // Count consecutive days backwards from today
      for (let i = 1; i < uniqueDates.length; i++) {
        const expectedDate = new Date();
        expectedDate.setDate(expectedDate.getDate() - i);
        const expectedDateString = expectedDate.toDateString();
        
        if (uniqueDates.includes(expectedDateString)) {
          streak++;
        } else {
          break;
        }
      }
    } else {
      // If no recording today, check if yesterday was the last recording day
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayString = yesterday.toDateString();
      
      if (uniqueDates.includes(yesterdayString)) {
        streak = 1;
        
        // Count consecutive days backwards from yesterday
        for (let i = 2; i < uniqueDates.length + 1; i++) {
          const expectedDate = new Date();
          expectedDate.setDate(expectedDate.getDate() - i);
          const expectedDateString = expectedDate.toDateString();
          
          if (uniqueDates.includes(expectedDateString)) {
            streak++;
          } else {
            break;
          }
        }
      }
    }
    
    console.log('PersonalizedDashboard: Performance streak:', streak);
    return streak;
  };
  
  const performanceStreak = calculatePerformanceStreak();

  // Get user's first name
  const firstName = user?.user_metadata?.full_name?.split(' ')[0] || 'there';
  
  // Time-based greeting
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  // Get real AI coaching tip from database insights
  const getDailyCoachingTip = () => {
    // Use real coaching insights if available
    if (Array.isArray(coachingData) && coachingData.length > 0) {
      const topRecommendation = coachingData[0];
      return {
        title: (topRecommendation as any).title || 'AI Coaching Tip',
        content: topRecommendation.description || 'Focus on improvement areas.',
        framework: 'General',
        priority: 'medium'
      };
    }
    
    // Fallback to computed insights if no database recommendations
    if (recordingsWithFramework.length === 0) {
      return {
        title: "Start Your Sales Coaching Journey",
        content: "Upload your first sales call to get personalized AI coaching insights and framework analysis.",
        framework: "General",
        priority: "high"
      };
    }
    
    // Use framework focus areas from coaching data - simplified
    if (Array.isArray(coachingData) && coachingData.length > 0) {
      const frameworks = coachingData.filter(insight => insight.type === 'improvement');
      if (frameworks.length > 0) {
        const firstImprovement = frameworks[0];
        
        return {
          title: (firstImprovement as any).title || 'Improve Performance',
          content: firstImprovement.description || 'Focus on areas identified for improvement.',
          framework: 'General',
          priority: 'high'
        };
      }
    }
    
    return {
      title: "Ready for Framework Analysis",
      content: "Your calls are being processed. Framework-specific coaching insights will appear once analysis is complete.",
      framework: "General",
      priority: "medium"
    };
  };
  
  const dailyCoachingTip = getDailyCoachingTip();

  if (loading || coachingLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Preparing your personalized insights...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className={cn(
        "min-h-screen",
        supportMode 
          ? "bg-gradient-to-br from-slate-50 to-green-50/30"
          : "bg-gradient-to-br from-slate-50 to-blue-50/30"
      )}>
        <div className="max-w-[1400px] mx-auto px-6 py-6">
          {/* Compact Header Bar */}
          <div className="bg-white/70 backdrop-blur-md rounded-2xl shadow-sm border border-white/20 p-4 mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-6">
                {/* Mode Indicator */}
                <div className="flex items-center space-x-2">
                  <div className={cn(
                    "w-2 h-2 rounded-full",
                    supportMode ? "bg-green-500" : "bg-blue-500"
                  )}></div>
                  <span className={cn(
                    "text-xs font-medium tracking-wide uppercase",
                    supportMode ? "text-green-600" : "text-blue-600"
                  )}>
                    {supportMode ? "Support Mode" : "Sales Mode"}
                  </span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className={cn(
                    "p-2 rounded-xl shadow-lg",
                    supportMode 
                      ? "bg-gradient-to-br from-green-500 to-green-600" 
                      : "bg-gradient-to-br from-blue-500 to-blue-600"
                  )}>
                    <LayoutDashboard className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h1 className="text-xl font-bold text-gray-900">
                      {getGreeting()}, {firstName}!
                    </h1>
                    <p className="text-sm text-gray-600">Your AI sales performance hub</p>
                  </div>
                </div>
                
                {/* Inline Metrics */}
                <div className="hidden md:flex items-center space-x-8">
                  <div className="text-center">
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-gradient-to-r from-green-400 to-green-600 rounded-full"></div>
                      <span className="text-2xl font-bold text-gray-900">{overallScore}</span>
                      <span className="text-sm text-gray-500">/100</span>
                    </div>
                    <p className="text-xs text-gray-600">Performance Score</p>
                  </div>
                  
                  <div className="text-center">
                    <div className="flex items-center space-x-2">
                      <Zap className="w-4 h-4 text-orange-500" />
                      <span className="text-2xl font-bold text-gray-900">{performanceStreak}</span>
                    </div>
                    <p className="text-xs text-gray-600">Day Streak</p>
                  </div>
                  
                  <div className="text-center">
                    <div className="flex items-center space-x-2">
                      <TrendingUp className={cn(
                        "w-4 h-4",
                        improvementTrend > 0 ? "text-green-500" : improvementTrend < 0 ? "text-red-500" : "text-gray-400"
                      )} />
                      <span className={cn(
                        "text-2xl font-bold",
                        improvementTrend > 0 ? "text-green-600" : improvementTrend < 0 ? "text-red-600" : "text-gray-500"
                      )}>
                        {improvementTrend > 0 ? '+' : ''}{improvementTrend}%
                      </span>
                    </div>
                    <p className="text-xs text-gray-600">Trend</p>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center space-x-3">
                <select 
                  value={selectedTimeRange} 
                  onChange={(e) => setSelectedTimeRange(e.target.value as '7d' | '30d' | '90d')}
                  className="text-sm bg-white/50 border border-gray-200 rounded-lg px-3 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="7d">7 days</option>
                  <option value="30d">30 days</option>
                  <option value="90d">90 days</option>
                </select>
                <Button onClick={() => setUploadModalOpen(true)} className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-lg">
                  <Upload className="w-4 h-4 mr-2" />
                  Upload Call
                </Button>
              </div>
            </div>
          </div>

          {/* Three-Column Grid Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[calc(100vh-200px)]">
            {/* Left Column - AI Coaching & Preparation */}
            <div className="lg:col-span-3 space-y-6">
              {/* Compact AI Coaching Tip */}
              <Card className="bg-white/70 backdrop-blur-md border-white/20 shadow-lg">
                <CardContent className="p-4">
                  <div className="flex items-start space-x-3">
                    <div className="p-2 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg">
                      <Brain className="w-4 h-4 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-2">
                        <h3 className="font-semibold text-gray-900 text-sm">AI Coach</h3>
                        <Badge className={cn(
                          "text-xs",
                          dailyCoachingTip.priority === 'high' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'
                        )}>
                          {dailyCoachingTip.priority}
                        </Badge>
                      </div>
                      <h4 className="font-medium text-gray-900 text-sm mb-1">{dailyCoachingTip.title}</h4>
                      <p className="text-xs text-gray-600 line-clamp-3">{dailyCoachingTip.content}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>


              {/* Quick Actions */}
              <Card className="bg-white/70 backdrop-blur-md border-white/20 shadow-lg">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold flex items-center space-x-2">
                    <Zap className="w-4 h-4 text-yellow-600" />
                    <span>Quick Actions</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-2">
                    <Button variant="outline" size="sm" className="w-full justify-start text-xs" onClick={() => navigate('/analytics')}>
                      <TrendingUp className="w-3 h-3 mr-2" />
                      Analytics
                    </Button>
                    <Button variant="outline" size="sm" className="w-full justify-start text-xs" onClick={() => navigate('/library')}>
                      <BookOpen className="w-3 h-3 mr-2" />
                      Training
                    </Button>
                    <Button variant="outline" size="sm" className="w-full justify-start text-xs" onClick={() => navigate('/profile')}>
                      <FileText className="w-3 h-3 mr-2" />
                      Export
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Areas for Improvement */}
              {coachingData && Array.isArray(coachingData) && (
                <Card className="bg-white/70 backdrop-blur-md border-white/20 shadow-lg">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-semibold flex items-center space-x-2">
                      <Trophy className="w-4 h-4 text-orange-600" />
                      <span>Areas for Improvement</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="space-y-2">
                      {coachingData
                        .filter(insight => insight.type === 'improvement')
                        .slice(0, 3)
                        .map((improvement, index) => (
                          <div key={index} className="flex items-start gap-2 p-2 bg-orange-50 rounded-lg">
                            <div className="flex-shrink-0 w-4 h-4 bg-orange-100 rounded-full flex items-center justify-center">
                              <span className="text-xs font-medium text-orange-600">{index + 1}</span>
                            </div>
                            <p className="text-xs text-orange-800 leading-relaxed">{improvement.description}</p>
                          </div>
                        ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Center Column - Performance & Recent Calls */}
            <div className="lg:col-span-6 space-y-6">

              {/* Recent Calls - Compact List */}
              <Card className="bg-white/70 backdrop-blur-md border-white/20 shadow-lg flex-1">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-semibold flex items-center space-x-2">
                      <Phone className="w-4 h-4 text-blue-600" />
                      <span>Recent Calls</span>
                    </CardTitle>
                    {recordings.some(r => r.status === 'error') && (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => {
                          localStorage.clear();
                          window.location.reload();
                        }}
                        className="text-xs"
                      >
                        Clear Cache
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-2 max-h-[400px] overflow-y-auto">
                    {recentRecordings.length === 0 ? (
                      <div className="text-center py-8">
                        <Phone className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                        <p className="text-gray-500 mb-2">No recordings yet</p>
                        <p className="text-sm text-gray-400">Upload your first call to get started</p>
                      </div>
                    ) : (
                      recentRecordings.slice(0, 8).map((recording) => (
                      <div
                        key={recording.id}
                        className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-lg cursor-pointer transition-colors"
                        onClick={() => navigate(`/summaries/${recording.id}`)}
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{recording.title}</p>
                          <div className="flex items-center gap-3 text-xs text-gray-500">
                            <span>{format(new Date(recording.created_at), 'MMM dd, HH:mm')}</span>
                            {(() => {
                              // Debug logging for each recording
                              console.log(`🔍 Recent Call [${recording.id?.slice(0, 8)}...]:`, {
                                status: recording.status,
                                statusType: typeof recording.status,
                                title: recording.title?.substring(0, 20) + '...',
                                duration: recording.duration,
                                durationType: typeof recording.duration
                              });
                              
                              if (recording.status === 'error') {
                                console.log(`⚠️ Showing error status for recording ${recording.id?.slice(0, 8)}...`);
                                return (
                                  <span className="text-xs text-red-500 flex items-center gap-1">
                                    <AlertTriangle className="w-3 h-3" />
                                    Error
                                  </span>
                                );
                              } else {
                                console.log(`✅ Using HybridDuration for recording ${recording.id?.slice(0, 8)}...`);
                                return (
                                  <HybridDuration 
                                    recordingId={recording.id}
                                    className="flex items-center gap-1"
                                    showIcon={true}
                                    fallbackDuration={recording.duration}
                                  />
                                );
                              }
                            })()}
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          {recording.coaching_evaluation && (
                            <span className={cn(
                              "text-xs font-bold",
                              recording.coaching_evaluation.overallScore >= 8 ? "text-green-600" : 
                              recording.coaching_evaluation.overallScore >= 6 ? "text-yellow-600" : "text-red-600"
                            )}>
                              {recording.coaching_evaluation.overallScore.toFixed(1)}
                            </span>
                          )}
                          <ChevronRight className="w-4 h-4 text-gray-400" />
                        </div>
                      </div>
                    ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Right Column - Trends & AI Insights */}
            <div className="lg:col-span-3 space-y-6">
              {/* Vertical Performance Trends */}
              <Card className="bg-white/70 backdrop-blur-md border-white/20 shadow-lg">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold flex items-center space-x-2">
                    <TrendingUp className="w-4 h-4 text-green-600" />
                    <span>Trends</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-gray-900">{recordings.length}</div>
                      <div className="text-xs text-gray-600">Total Calls</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">{Math.round((completedRecordings.length / recordings.length) * 100) || 0}%</div>
                      <div className="text-xs text-gray-600">Completion Rate</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">{recordingsWithFramework.length}</div>
                      <div className="text-xs text-gray-600">Analyzed</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Compact AI Coaching Insights */}
              <AICoachingInsights
                userId={user?.id}
              />
            </div>
          </div>
        </div>
      </div>
      
      <UploadModal
        open={uploadModalOpen}
        onClose={() => setUploadModalOpen(false)}
        onUpload={handleUpload}
        uploadProgress={uploadProgress}
        isUploading={isUploading}
      />
    </>
  );
}