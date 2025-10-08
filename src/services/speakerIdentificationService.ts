import { supabase } from '../integrations/supabase/client';
import type { Recording } from '../types/recording';
import type { Employee } from '../types/employee';

export interface IdentifiedSpeaker {
  id: string;
  name: string;
  confidence: number;
  segments: SpeakerSegment[];
  voiceCharacteristics?: VoiceCharacteristics;
  isEmployee?: boolean;
  employeeId?: string;
  source: 'title' | 'transcript' | 'ai_analysis' | 'manual';
}

export interface SpeakerSegment {
  start_time: number;
  end_time: number;
  text: string;
  confidence: number;
}

export interface VoiceCharacteristics {
  pitch_range: [number, number];
  speaking_rate: number;
  volume_pattern: 'consistent' | 'variable' | 'increasing' | 'decreasing';
  pause_frequency: number;
  accent_indicators: string[];
  speech_patterns: string[];
}

export interface SpeakerConfirmationData {
  recordingId: string;
  identifiedSpeakers: IdentifiedSpeaker[];
  suggestedNames: string[];
  userConfirmed: boolean;
  confirmedSpeakers: ConfirmedSpeaker[];
}

export interface ConfirmedSpeaker {
  id: string;
  name: string;
  isEmployee: boolean;
  employeeId?: string;
  voiceCharacteristics?: VoiceCharacteristics;
}

export class SpeakerIdentificationService {
  
  /**
   * Extract potential speaker names from recording title
   */
  static extractNamesFromTitle(title: string): string[] {
    if (!title) return [];
    
    const names: string[] = [];
    
    // Common patterns for names in titles
    const patterns = [
      // "Call with John Smith and Jane Doe"
      /(?:call|meeting|interview|conversation)\s+(?:with|between)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)(?:\s+and\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*))?(?:\s+and\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*))?/i,
      
      // "John Smith - Sales Call"
      /^([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s*[-–]\s*/,
      
      // "Interview: John Smith"
      /(?:interview|call|meeting):\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/i,
      
      // "John Smith, Jane Doe - Call"
      /^([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*),\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s*[-–]/,
      
      // "UX Interview with John Smith"
      /(?:ux\s+interview|user\s+interview|customer\s+interview)\s+(?:with\s+)?([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/i,
      
      // "Support call - John Smith"
      /(?:support\s+call|sales\s+call|customer\s+call)\s*[-–]\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/i
    ];
    
    for (const pattern of patterns) {
      const match = title.match(pattern);
      if (match) {
        // Extract all captured groups (names)
        for (let i = 1; i < match.length; i++) {
          if (match[i]) {
            const name = match[i].trim();
            if (this.isValidName(name) && !names.includes(name)) {
              names.push(name);
            }
          }
        }
      }
    }
    
    // Additional extraction for common separators
    const separatorPatterns = [
      /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s*[,&]\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/g,
      /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s+vs\.?\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/gi,
      /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s+&\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/g,
      /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s+and\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/gi
    ];
    
    for (const pattern of separatorPatterns) {
      let match;
      while ((match = pattern.exec(title)) !== null) {
        for (let i = 1; i < match.length; i++) {
          if (match[i]) {
            const name = match[i].trim();
            if (this.isValidName(name) && !names.includes(name)) {
              names.push(name);
            }
          }
        }
      }
    }
    
    return names;
  }
  
  /**
   * Validate if a string looks like a person's name
   */
  private static isValidName(name: string): boolean {
    if (!name || name.length < 2 || name.length > 50) return false;
    
    // Must start with capital letter
    if (!/^[A-Z]/.test(name)) return false;
    
    // Should contain only letters, spaces, hyphens, and apostrophes
    if (!/^[A-Za-z\s\-']+$/.test(name)) return false;
    
    // Exclude common words that might be mistaken for names
    const excludeWords = new Set([
      'Call', 'Meeting', 'Interview', 'Conversation', 'Sales', 'Support', 'Customer',
      'Client', 'User', 'Demo', 'Presentation', 'Training', 'Session', 'Review',
      'Follow', 'Up', 'Check', 'In', 'Stand', 'Daily', 'Weekly', 'Monthly',
      'Quarterly', 'Annual', 'Yearly', 'Team', 'Group', 'Department', 'Company',
      'Organization', 'Business', 'Project', 'Product', 'Service', 'Solution',
      'Strategy', 'Planning', 'Development', 'Design', 'Marketing', 'Finance',
      'Human', 'Resources', 'Information', 'Technology', 'Operations', 'Quality',
      'Assurance', 'Testing', 'Research', 'Analysis', 'Reporting', 'Documentation'
    ]);
    
    const words = name.split(/\s+/);
    for (const word of words) {
      if (excludeWords.has(word)) return false;
    }
    
    return true;
  }
  
  /**
   * Get existing employees that might match identified speakers
   */
  static async getMatchingEmployees(speakerNames: string[]): Promise<Employee[]> {
    if (speakerNames.length === 0) return [];
    
    try {
      const { data: employees, error } = await supabase
        .from('employees')
        .select('*')
        .eq('status', 'active');
      
      if (error) {
        console.error('Error fetching employees for speaker matching:', error);
        return [];
      }
      
      // Find employees whose names match the speaker names
      const matchingEmployees: Employee[] = [];
      
      for (const employee of employees || []) {
        const fullName = `${employee.first_name} ${employee.last_name}`.toLowerCase();
        const firstName = employee.first_name.toLowerCase();
        const lastName = employee.last_name.toLowerCase();
        
        for (const speakerName of speakerNames) {
          const speakerLower = speakerName.toLowerCase();
          
          // Check for exact match, first name match, or last name match
          if (fullName === speakerLower || 
              firstName === speakerLower || 
              lastName === speakerLower ||
              fullName.includes(speakerLower) ||
              speakerLower.includes(fullName)) {
            matchingEmployees.push(employee);
            break;
          }
        }
      }
      
      return matchingEmployees;
    } catch (error) {
      console.error('Error in getMatchingEmployees:', error);
      return [];
    }
  }
  
  /**
   * Create speaker confirmation data for a recording
   */
  static async createSpeakerConfirmationData(recording: Recording): Promise<SpeakerConfirmationData> {
    const titleNames = this.extractNamesFromTitle(recording.title || '');
    const matchingEmployees = await this.getMatchingEmployees(titleNames);
    
    // Create identified speakers from title names
    const identifiedSpeakers: IdentifiedSpeaker[] = titleNames.map((name, index) => {
      const matchingEmployee = matchingEmployees.find(emp => 
        `${emp.first_name} ${emp.last_name}`.toLowerCase() === name.toLowerCase() ||
        emp.first_name.toLowerCase() === name.toLowerCase() ||
        emp.last_name.toLowerCase() === name.toLowerCase()
      );
      
      return {
        id: `title-${index}`,
        name,
        confidence: 0.8, // High confidence for names extracted from title
        segments: [],
        isEmployee: !!matchingEmployee,
        employeeId: matchingEmployee?.id,
        source: 'title'
      };
    });
    
    return {
      recordingId: recording.id,
      identifiedSpeakers,
      suggestedNames: titleNames,
      userConfirmed: false,
      confirmedSpeakers: []
    };
  }
  
  /**
   * Save confirmed speaker data
   */
  static async saveConfirmedSpeakers(
    recordingId: string, 
    confirmedSpeakers: ConfirmedSpeaker[]
  ): Promise<void> {
    try {
      // Save to a new table for speaker confirmations
      const { error } = await supabase
        .from('speaker_confirmations')
        .upsert({
          recording_id: recordingId,
          confirmed_speakers: confirmedSpeakers,
          confirmed_at: new Date().toISOString()
        });
      
      if (error) {
        console.error('Error saving confirmed speakers:', error);
        throw error;
      }
      
      // If any speakers are marked as employees, update their voice profiles
      for (const speaker of confirmedSpeakers) {
        if (speaker.isEmployee && speaker.employeeId && speaker.voiceCharacteristics) {
          await this.updateEmployeeVoiceProfile(speaker.employeeId, speaker.voiceCharacteristics);
        }
      }
    } catch (error) {
      console.error('Error in saveConfirmedSpeakers:', error);
      throw error;
    }
  }
  
  /**
   * Update employee voice profile with new characteristics
   */
  private static async updateEmployeeVoiceProfile(
    employeeId: string, 
    characteristics: VoiceCharacteristics
  ): Promise<void> {
    try {
      // Get existing voice profile
      const { data: existingProfile, error: fetchError } = await supabase
        .from('employee_voice_profiles')
        .select('*')
        .eq('employee_id', employeeId)
        .eq('is_active', true)
        .single();
      
      if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 = no rows returned
        console.error('Error fetching existing voice profile:', fetchError);
        return;
      }
      
      if (existingProfile) {
        // Update existing profile by merging characteristics
        const updatedProfile = {
          ...existingProfile.voice_characteristics,
          ...characteristics,
          last_updated: new Date().toISOString(),
          recordings_count: (existingProfile.recordings_count || 0) + 1
        };
        
        const { error: updateError } = await supabase
          .from('employee_voice_profiles')
          .update({
            voice_characteristics: updatedProfile,
            last_updated: new Date().toISOString()
          })
          .eq('id', existingProfile.id);
        
        if (updateError) {
          console.error('Error updating voice profile:', updateError);
        }
      } else {
        // Create new voice profile
        const { error: insertError } = await supabase
          .from('employee_voice_profiles')
          .insert({
            employee_id: employeeId,
            voice_characteristics: characteristics,
            is_active: true,
            recordings_count: 1,
            created_at: new Date().toISOString(),
            last_updated: new Date().toISOString()
          });
        
        if (insertError) {
          console.error('Error creating voice profile:', insertError);
        }
      }
    } catch (error) {
      console.error('Error in updateEmployeeVoiceProfile:', error);
    }
  }
  
  /**
   * Get voice characteristics from recording analysis
   */
  static extractVoiceCharacteristics(recording: Recording, speakerName: string): VoiceCharacteristics | null {
    // This would typically use audio analysis, but for now we'll create mock data
    // In a real implementation, this would analyze the actual audio file
    
    if (!recording.transcript) return null;
    
    // Mock voice characteristics based on transcript analysis
    const transcript = recording.transcript.toLowerCase();
    const speakerSegments = this.extractSpeakerSegments(transcript, speakerName);
    
    if (speakerSegments.length === 0) return null;
    
    // Analyze speaking patterns
    const totalWords = speakerSegments.reduce((sum, segment) => 
      sum + segment.text.split(/\s+/).length, 0);
    const totalDuration = recording.duration || 0;
    const speakingRate = totalDuration > 0 ? totalWords / (totalDuration / 60) : 0;
    
    // Analyze pause patterns (simplified)
    const pauseFrequency = this.analyzePauseFrequency(speakerSegments);
    
    return {
      pitch_range: [120, 180], // Mock data - would be from audio analysis
      speaking_rate: speakingRate,
      volume_pattern: 'consistent', // Mock data
      pause_frequency: pauseFrequency,
      accent_indicators: [], // Mock data
      speech_patterns: this.extractSpeechPatterns(speakerSegments)
    };
  }
  
  /**
   * Extract segments for a specific speaker from transcript
   */
  private static extractSpeakerSegments(transcript: string, speakerName: string): SpeakerSegment[] {
    const segments: SpeakerSegment[] = [];
    const lines = transcript.split('\n');
    
    for (const line of lines) {
      if (line.toLowerCase().includes(speakerName.toLowerCase())) {
        // Extract text after speaker name
        const textMatch = line.match(new RegExp(`${speakerName}[^:]*:\\s*(.+)`, 'i'));
        if (textMatch) {
          segments.push({
            start_time: 0, // Would be extracted from timestamps
            end_time: 0,
            text: textMatch[1],
            confidence: 0.8
          });
        }
      }
    }
    
    return segments;
  }
  
  /**
   * Analyze pause frequency in speaker segments
   */
  private static analyzePauseFrequency(segments: SpeakerSegment[]): number {
    if (segments.length === 0) return 0;
    
    let pauseCount = 0;
    for (const segment of segments) {
      // Count pauses (simplified - would be more sophisticated in real implementation)
      pauseCount += (segment.text.match(/\.\.\.|\.\s+\./g) || []).length;
    }
    
    return pauseCount / segments.length;
  }
  
  /**
   * Extract speech patterns from segments
   */
  private static extractSpeechPatterns(segments: SpeakerSegment[]): string[] {
    const patterns: string[] = [];
    
    if (segments.length === 0) return patterns;
    
    // Analyze common phrases and patterns
    const allText = segments.map(s => s.text).join(' ');
    
    // Check for common speech patterns
    if (allText.includes('um') || allText.includes('uh')) {
      patterns.push('uses_fillers');
    }
    if (allText.includes('you know') || allText.includes('like')) {
      patterns.push('uses_casual_markers');
    }
    if (allText.includes('?')) {
      patterns.push('asks_questions');
    }
    if (allText.includes('!')) {
      patterns.push('expresses_enthusiasm');
    }
    
    return patterns;
  }
}
