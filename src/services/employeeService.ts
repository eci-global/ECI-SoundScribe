import { supabase } from '../integrations/supabase/client';
import type {
  Employee,
  Team,
  EmployeeCallParticipation,
  EmployeeScorecard,
  EmployeePerformanceTrend,
  ManagerCoachingNote,
  EmployeeAnalytics,
  EmployeeSearchFilters,
  EmployeeSearchResult,
  EmployeeDetailResponse,
  EmployeeListResponse,
  VoiceDetectionResult,
  EmployeeDashboardData,
  TeamPerformanceReport,
  EmployeePerformanceSummary
} from '../types/employee';

export class EmployeeService {
  // =============================================
  // EMPLOYEE MANAGEMENT
  // =============================================

  /**
   * Get all employees with optional filters
   */
  static async getEmployees(filters?: EmployeeSearchFilters): Promise<EmployeeListResponse> {
    try {
      // Simple query without complex joins for now
      let query = supabase
        .from('employees')
        .select('*')
        .eq('status', 'active');

      if (filters?.department) {
        query = query.eq('department', filters.department);
      }
      if (filters?.team_id) {
        query = query.eq('team_id', filters.team_id);
      }
      if (filters?.role) {
        query = query.eq('role', filters.role);
      }

      const { data: employees, error } = await query.order('first_name');

      if (error) {
        console.error('Error fetching employees:', error);
        throw error;
      }

      console.log('Fetched employees:', employees);

      // Create simplified employee results without complex performance data
      const employeesWithPerformance = employees.map((employee) => ({
        employee,
        performance_summary: {
          employee_name: `${employee.first_name} ${employee.last_name}`,
          total_calls: 0,
          current_score: 0,
          score_trend: 0,
          recent_strengths: [],
          recent_improvements: [],
          coaching_notes_count: 0,
          last_evaluation_date: new Date().toISOString()
        },
        recent_activity: 'No recent activity',
        score_trend: 'stable' as const
      }));

      return {
        employees: employeesWithPerformance,
        total_count: employees.length,
        page: 1,
        page_size: employees.length,
        filters_applied: filters || {}
      };
    } catch (error) {
      console.error('Error in getEmployees:', error);
      throw error;
    }
  }

  /**
   * Get employee by ID with full analytics
   */
  static async getEmployeeById(employeeId: string): Promise<EmployeeDetailResponse> {
    const { data: employee, error } = await supabase
      .from('employees')
      .select(`
        *,
        teams:team_id(name, department),
        manager:manager_id(first_name, last_name)
      `)
      .eq('id', employeeId)
      .single();

    if (error) throw error;

    const analytics = await this.getEmployeeAnalytics(employeeId);
    const dashboardData = await this.getEmployeeDashboardData(employeeId);

    return {
      employee,
      analytics,
      dashboard_data: dashboardData
    };
  }

  /**
   * Create new employee
   */
  static async createEmployee(employeeData: Partial<Employee>): Promise<Employee> {
    const { data, error } = await supabase
      .from('employees')
      .insert(employeeData)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Update employee
   */
  static async updateEmployee(employeeId: string, updates: Partial<Employee>): Promise<Employee> {
    const { data, error } = await supabase
      .from('employees')
      .update(updates)
      .eq('id', employeeId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // =============================================
  // CALL PARTICIPATION TRACKING
  // =============================================

  /**
   * Record employee participation in a call
   */
  static async recordCallParticipation(
    recordingId: string,
    employeeId: string,
    participationData: Partial<EmployeeCallParticipation>
  ): Promise<EmployeeCallParticipation> {
    const { data, error } = await supabase
      .from('employee_call_participation')
      .insert({
        recording_id: recordingId,
        employee_id: employeeId,
        ...participationData
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Get call participation for a recording
   */
  static async getCallParticipation(recordingId: string): Promise<EmployeeCallParticipation[]> {
    const { data, error } = await supabase
      .from('employee_call_participation')
      .select(`
        *,
        employees:employee_id(first_name, last_name, role, department)
      `)
      .eq('recording_id', recordingId)
      .order('participation_type', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  /**
   * Update call participation
   */
  static async updateCallParticipation(
    participationId: string,
    updates: Partial<EmployeeCallParticipation>
  ): Promise<EmployeeCallParticipation> {
    const { data, error } = await supabase
      .from('employee_call_participation')
      .update(updates)
      .eq('id', participationId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // =============================================
  // SCORECARD MANAGEMENT
  // =============================================

  /**
   * Create employee scorecard
   */
  static async createScorecard(scorecardData: Partial<EmployeeScorecard>): Promise<EmployeeScorecard> {
    const { data, error } = await supabase
      .from('employee_scorecards')
      .insert(scorecardData)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Get scorecards for an employee
   */
  static async getEmployeeScorecards(
    employeeId: string,
    limit: number = 50
  ): Promise<EmployeeScorecard[]> {
    const { data, error } = await supabase
      .from('employee_scorecards')
      .select(`
        *,
        recordings:recording_id(title, created_at, duration)
      `)
      .eq('employee_id', employeeId)
      .order('evaluation_date', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  }

  /**
   * Get employee performance summary
   */
  static async getEmployeePerformanceSummary(employeeId: string): Promise<EmployeePerformanceSummary> {
    const { data, error } = await supabase
      .rpc('get_employee_performance_summary', { p_employee_id: employeeId });

    if (error) throw error;
    return data[0] || this.getDefaultPerformanceSummary();
  }

  // =============================================
  // COACHING AND FEEDBACK
  // =============================================

  /**
   * Create manager coaching note
   */
  static async createCoachingNote(noteData: Partial<ManagerCoachingNote>): Promise<ManagerCoachingNote> {
    const { data, error } = await supabase
      .from('manager_coaching_notes')
      .insert(noteData)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Get coaching notes for an employee
   */
  static async getEmployeeCoachingNotes(employeeId: string): Promise<ManagerCoachingNote[]> {
    const { data, error } = await supabase
      .from('manager_coaching_notes')
      .select(`
        *,
        manager:manager_id(first_name, last_name),
        recordings:recording_id(title, created_at)
      `)
      .eq('employee_id', employeeId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  /**
   * Update coaching note
   */
  static async updateCoachingNote(
    noteId: string,
    updates: Partial<ManagerCoachingNote>
  ): Promise<ManagerCoachingNote> {
    const { data, error } = await supabase
      .from('manager_coaching_notes')
      .update(updates)
      .eq('id', noteId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // =============================================
  // ANALYTICS AND REPORTING
  // =============================================

  /**
   * Get comprehensive employee analytics
   */
  static async getEmployeeAnalytics(employeeId: string): Promise<EmployeeAnalytics> {
    const [employee, performanceSummary, recentRecordings, scoreTrends, coachingHistory] = await Promise.all([
      this.getEmployeeById(employeeId),
      this.getEmployeePerformanceSummary(employeeId),
      this.getEmployeeRecentRecordings(employeeId),
      this.getEmployeeScoreTrends(employeeId),
      this.getEmployeeCoachingNotes(employeeId)
    ]);

    return {
      employee: employee.employee,
      performance_summary: performanceSummary,
      recent_recordings: recentRecordings,
      score_trends: scoreTrends,
      coaching_history: coachingHistory
    };
  }

  /**
   * Get employee dashboard data
   */
  static async getEmployeeDashboardData(employeeId: string): Promise<EmployeeDashboardData> {
    const [employee, performanceSummary, recentScores, strengthsAnalysis, improvementAreas, coachingEffectiveness] = await Promise.all([
      this.getEmployeeById(employeeId),
      this.getEmployeePerformanceSummary(employeeId),
      this.getEmployeeRecentScores(employeeId),
      this.getEmployeeStrengthsAnalysis(employeeId),
      this.getEmployeeImprovementAreas(employeeId),
      this.getEmployeeCoachingEffectiveness(employeeId)
    ]);

    return {
      employee: employee.employee,
      performance_metrics: {
        total_calls: performanceSummary.total_calls,
        average_score: performanceSummary.current_score,
        score_improvement: performanceSummary.score_trend,
        coaching_sessions: performanceSummary.coaching_notes_count,
        manager_feedback_count: performanceSummary.coaching_notes_count
      },
      recent_scores: recentScores,
      strengths_analysis: strengthsAnalysis,
      improvement_areas: improvementAreas,
      coaching_effectiveness: coachingEffectiveness
    };
  }

  /**
   * Get team performance report
   */
  static async getTeamPerformanceReport(teamId: string): Promise<TeamPerformanceReport> {
    const { data: team, error: teamError } = await supabase
      .from('teams')
      .select('*')
      .eq('id', teamId)
      .single();

    if (teamError) throw teamError;

    const { data: employees, error: employeesError } = await supabase
      .from('employees')
      .select('*')
      .eq('team_id', teamId)
      .eq('status', 'active');

    if (employeesError) throw employeesError;

    const teamMetrics = await this.calculateTeamMetrics(teamId);
    const individualPerformance = await Promise.all(
      employees.map(async (employee) => ({
        employee,
        performance_summary: await this.getEmployeePerformanceSummary(employee.id),
        recent_trend: this.calculateScoreTrend(0) // TODO: Calculate actual trend
      }))
    );

    return {
      team,
      employees,
      team_metrics: teamMetrics,
      individual_performance: individualPerformance
    };
  }

  // =============================================
  // VOICE DETECTION AND IDENTIFICATION
  // =============================================

  /**
   * Detect employee voice in recording
   */
  static async detectEmployeeVoice(
    recordingId: string,
    audioData?: ArrayBuffer
  ): Promise<VoiceDetectionResult> {
    // This would integrate with your existing voice analysis system
    // For now, return a mock result
    return {
      confidence: 0.85,
      detection_method: 'automatic',
      voice_characteristics: {},
      suggested_employees: []
    };
  }

  /**
   * Train voice profile for employee
   */
  static async trainEmployeeVoiceProfile(
    employeeId: string,
    sampleRecordings: string[]
  ): Promise<void> {
    const { error } = await supabase
      .from('employee_voice_profiles')
      .upsert({
        employee_id: employeeId,
        sample_recordings: sampleRecordings,
        training_status: 'completed',
        last_training_date: new Date().toISOString()
      });

    if (error) throw error;
  }

  // =============================================
  // HELPER METHODS
  // =============================================

  private static async getEmployeeRecentRecordings(employeeId: string) {
    const { data, error } = await supabase
      .from('employee_call_participation')
      .select(`
        *,
        recordings:recording_id(id, title, created_at, duration)
      `)
      .eq('employee_id', employeeId)
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) throw error;
    return data?.map(item => ({
      id: item.recordings.id,
      title: item.recordings.title,
      created_at: item.recordings.created_at,
      duration: item.recordings.duration,
      participation_type: item.participation_type,
      overall_score: 0, // TODO: Get from scorecard
      talk_time_percentage: item.talk_time_percentage,
      strengths: [],
      improvements: []
    })) || [];
  }

  private static async getEmployeeScoreTrends(employeeId: string) {
    const { data, error } = await supabase
      .from('employee_scorecards')
      .select('evaluation_date, overall_score')
      .eq('employee_id', employeeId)
      .order('evaluation_date', { ascending: true })
      .limit(30);

    if (error) throw error;
    return data?.map(item => ({
      date: item.evaluation_date,
      score: item.overall_score,
      period: 'daily' as const
    })) || [];
  }

  private static async getEmployeeRecentScores(employeeId: string) {
    const { data, error } = await supabase
      .from('employee_scorecards')
      .select(`
        evaluation_date,
        overall_score,
        recordings:recording_id(title)
      `)
      .eq('employee_id', employeeId)
      .order('evaluation_date', { ascending: false })
      .limit(10);

    if (error) throw error;
    return data?.map(item => ({
      date: item.evaluation_date,
      score: item.overall_score,
      recording_title: item.recordings.title
    })) || [];
  }

  private static async getEmployeeStrengthsAnalysis(employeeId: string) {
    const { data, error } = await supabase
      .from('employee_scorecards')
      .select('strengths')
      .eq('employee_id', employeeId)
      .order('evaluation_date', { ascending: false })
      .limit(20);

    if (error) throw error;

    const allStrengths = data?.flatMap(item => item.strengths || []) || [];
    const strengthFrequency = allStrengths.reduce((acc, strength) => {
      acc[strength] = (acc[strength] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      top_strengths: Object.keys(strengthFrequency).sort((a, b) => strengthFrequency[b] - strengthFrequency[a]).slice(0, 5),
      strength_frequency: strengthFrequency
    };
  }

  private static async getEmployeeImprovementAreas(employeeId: string) {
    const { data, error } = await supabase
      .from('employee_scorecards')
      .select('improvements')
      .eq('employee_id', employeeId)
      .order('evaluation_date', { ascending: false })
      .limit(20);

    if (error) throw error;

    const allImprovements = data?.flatMap(item => item.improvements || []) || [];
    const improvementFrequency = allImprovements.reduce((acc, improvement) => {
      acc[improvement] = (acc[improvement] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      top_improvements: Object.keys(improvementFrequency).sort((a, b) => improvementFrequency[b] - improvementFrequency[a]).slice(0, 5),
      improvement_frequency: improvementFrequency
    };
  }

  private static async getEmployeeCoachingEffectiveness(employeeId: string) {
    const { data, error } = await supabase
      .from('manager_coaching_notes')
      .select('status, action_items')
      .eq('employee_id', employeeId);

    if (error) throw error;

    const totalNotes = data?.length || 0;
    const completedNotes = data?.filter(note => note.status === 'completed').length || 0;
    const totalActionItems = data?.reduce((sum, note) => sum + (note.action_items?.length || 0), 0) || 0;

    return {
      coaching_notes_count: totalNotes,
      action_items_completed: completedNotes,
      follow_up_rate: totalNotes > 0 ? (completedNotes / totalNotes) * 100 : 0
    };
  }

  private static async calculateTeamMetrics(teamId: string) {
    // TODO: Implement team metrics calculation
    return {
      total_calls: 0,
      average_score: 0,
      top_performers: [],
      improvement_areas: []
    };
  }

  private static getDefaultPerformanceSummary(): EmployeePerformanceSummary {
    return {
      employee_name: '',
      total_calls: 0,
      current_score: 0,
      score_trend: 0,
      recent_strengths: [],
      recent_improvements: [],
      coaching_notes_count: 0,
      last_evaluation_date: new Date().toISOString()
    };
  }

  private static getRecentActivityText(performanceSummary: EmployeePerformanceSummary): string {
    if (performanceSummary.total_calls === 0) {
      return 'No recent activity';
    }
    return `Last evaluation: ${new Date(performanceSummary.last_evaluation_date).toLocaleDateString()}`;
  }

  private static calculateScoreTrend(scoreTrend: number): 'improving' | 'declining' | 'stable' {
    if (scoreTrend > 0.1) return 'improving';
    if (scoreTrend < -0.1) return 'declining';
    return 'stable';
  }
}
