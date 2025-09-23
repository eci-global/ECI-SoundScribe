
export interface RecordingDetail {
  id: string;
  title: string;
  description?: string;
  duration?: number;
  created_at: string;
  status: string;
  transcript?: string;
  summary?: string;
  ai_summary?: string;
  coaching_evaluation?: any;
  ai_insights?: any;
}

export interface SpeakerSegment {
  id: string;
  recording_id: string;
  start_time: number;
  end_time: number;
  speaker_name: string;
  text: string;
  created_at: string;
}

export interface TopicSegment {
  id: string;
  recording_id: string;
  start_time: number;
  end_time: number;
  topic: string;
  confidence: number;
  created_at: string;
}

export interface AIMoment {
  id: string;
  recording_id: string;
  start_time: number;
  type: string;
  label?: string;
  tooltip: string;
  created_at: string;
}
