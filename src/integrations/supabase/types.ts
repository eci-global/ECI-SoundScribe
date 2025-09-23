export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          query?: string
          operationName?: string
          variables?: Json
          extensions?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      bdr_batch_processing_jobs: {
        Row: {
          created_at: string | null
          created_by: string | null
          end_time: string | null
          error_message: string | null
          failed_items: number | null
          id: string
          job_type: string | null
          metadata: Json | null
          processed_items: number | null
          start_time: string | null
          status: string | null
          total_items: number | null
          training_program_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          end_time?: string | null
          error_message?: string | null
          failed_items?: number | null
          id?: string
          job_type?: string | null
          metadata?: Json | null
          processed_items?: number | null
          start_time?: string | null
          status?: string | null
          total_items?: number | null
          training_program_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          end_time?: string | null
          error_message?: string | null
          failed_items?: number | null
          id?: string
          job_type?: string | null
          metadata?: Json | null
          processed_items?: number | null
          start_time?: string | null
          status?: string | null
          total_items?: number | null
          training_program_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bdr_batch_processing_jobs_training_program_id_fkey"
            columns: ["training_program_id"]
            isOneToOne: false
            referencedRelation: "bdr_training_programs"
            referencedColumns: ["id"]
          },
        ]
      }
      bdr_call_classifications: {
        Row: {
          classification: string | null
          confidence: number | null
          created_at: string | null
          id: string
          recording_id: string | null
        }
        Insert: {
          classification?: string | null
          confidence?: number | null
          created_at?: string | null
          id?: string
          recording_id?: string | null
        }
        Update: {
          classification?: string | null
          confidence?: number | null
          created_at?: string | null
          id?: string
          recording_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bdr_call_classifications_recording_id_fkey"
            columns: ["recording_id"]
            isOneToOne: false
            referencedRelation: "recordings"
            referencedColumns: ["id"]
          },
        ]
      }
      bdr_coaching_recommendations: {
        Row: {
          action_items: Json | null
          completion_date: string | null
          created_at: string | null
          created_date: string | null
          description: string | null
          id: string
          metadata: Json | null
          priority: number | null
          recommendation_type: string
          status: string | null
          target_completion_date: string | null
          title: string
          training_program_id: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          action_items?: Json | null
          completion_date?: string | null
          created_at?: string | null
          created_date?: string | null
          description?: string | null
          id?: string
          metadata?: Json | null
          priority?: number | null
          recommendation_type: string
          status?: string | null
          target_completion_date?: string | null
          title: string
          training_program_id?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          action_items?: Json | null
          completion_date?: string | null
          created_at?: string | null
          created_date?: string | null
          description?: string | null
          id?: string
          metadata?: Json | null
          priority?: number | null
          recommendation_type?: string
          status?: string | null
          target_completion_date?: string | null
          title?: string
          training_program_id?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bdr_coaching_recommendations_training_program_id_fkey"
            columns: ["training_program_id"]
            isOneToOne: false
            referencedRelation: "bdr_training_programs"
            referencedColumns: ["id"]
          },
        ]
      }
      bdr_performance_analytics: {
        Row: {
          created_at: string | null
          id: string
          metadata: Json | null
          metric_date: string
          metric_type: string
          metric_value: number | null
          training_program_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          metadata?: Json | null
          metric_date: string
          metric_type: string
          metric_value?: number | null
          training_program_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          metadata?: Json | null
          metric_date?: string
          metric_type?: string
          metric_value?: number | null
          training_program_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bdr_performance_analytics_training_program_id_fkey"
            columns: ["training_program_id"]
            isOneToOne: false
            referencedRelation: "bdr_training_programs"
            referencedColumns: ["id"]
          },
        ]
      }
      bdr_scorecard_evaluations: {
        Row: {
          batch_id: string | null
          call_date: string | null
          call_identifier: string | null
          created_at: string | null
          duration_minutes: number | null
          evaluator_type: string | null
          id: string
          manager_id: string | null
          matching_confidence: number | null
          recording_id: string | null
          scores: Json | null
        }
        Insert: {
          batch_id?: string | null
          call_date?: string | null
          call_identifier?: string | null
          created_at?: string | null
          duration_minutes?: number | null
          evaluator_type?: string | null
          id?: string
          manager_id?: string | null
          matching_confidence?: number | null
          recording_id?: string | null
          scores?: Json | null
        }
        Update: {
          batch_id?: string | null
          call_date?: string | null
          call_identifier?: string | null
          created_at?: string | null
          duration_minutes?: number | null
          evaluator_type?: string | null
          id?: string
          manager_id?: string | null
          matching_confidence?: number | null
          recording_id?: string | null
          scores?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "bdr_scorecard_evaluations_recording_id_fkey"
            columns: ["recording_id"]
            isOneToOne: false
            referencedRelation: "recordings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_bdr_evaluations_batch"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "bdr_batch_processing_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      bdr_system_notifications: {
        Row: {
          action_required: boolean | null
          action_url: string | null
          created_at: string | null
          expires_at: string | null
          id: string
          message: string
          metadata: Json | null
          notification_type: string
          priority: string | null
          read_status: boolean | null
          title: string
          user_id: string | null
        }
        Insert: {
          action_required?: boolean | null
          action_url?: string | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          message: string
          metadata?: Json | null
          notification_type: string
          priority?: string | null
          read_status?: boolean | null
          title: string
          user_id?: string | null
        }
        Update: {
          action_required?: boolean | null
          action_url?: string | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          message?: string
          metadata?: Json | null
          notification_type?: string
          priority?: string | null
          read_status?: boolean | null
          title?: string
          user_id?: string | null
        }
        Relationships: []
      }
      bdr_training_batches: {
        Row: {
          created_at: string | null
          id: string
          name: string
          status: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          status?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          status?: string | null
        }
        Relationships: []
      }
      bdr_training_datasets: {
        Row: {
          ai_scores: Json | null
          batch_id: string | null
          call_date: string | null
          call_identifier: string | null
          created_at: string | null
          duration_minutes: number | null
          id: string
          manager_id: string | null
          manager_scores: Json | null
          matching_confidence: number | null
          metadata: Json | null
          recording_id: string | null
          validation_status: string | null
        }
        Insert: {
          ai_scores?: Json | null
          batch_id?: string | null
          call_date?: string | null
          call_identifier?: string | null
          created_at?: string | null
          duration_minutes?: number | null
          id?: string
          manager_id?: string | null
          manager_scores?: Json | null
          matching_confidence?: number | null
          metadata?: Json | null
          recording_id?: string | null
          validation_status?: string | null
        }
        Update: {
          ai_scores?: Json | null
          batch_id?: string | null
          call_date?: string | null
          call_identifier?: string | null
          created_at?: string | null
          duration_minutes?: number | null
          id?: string
          manager_id?: string | null
          manager_scores?: Json | null
          matching_confidence?: number | null
          metadata?: Json | null
          recording_id?: string | null
          validation_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bdr_training_datasets_recording_id_fkey"
            columns: ["recording_id"]
            isOneToOne: false
            referencedRelation: "recordings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_bdr_datasets_batch"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "bdr_batch_processing_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      bdr_training_programs: {
        Row: {
          created_at: string | null
          criteria: Json | null
          description: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string | null
          criteria?: Json | null
          description?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string | null
          criteria?: Json | null
          description?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      bdr_upload_tracking: {
        Row: {
          created_at: string | null
          filename: string
          id: string
          processed_count: number | null
          total_count: number | null
          upload_status: string | null
        }
        Insert: {
          created_at?: string | null
          filename: string
          id?: string
          processed_count?: number | null
          total_count?: number | null
          upload_status?: string | null
        }
        Update: {
          created_at?: string | null
          filename?: string
          id?: string
          processed_count?: number | null
          total_count?: number | null
          upload_status?: string | null
        }
        Relationships: []
      }
      bdr_user_progress_summary: {
        Row: {
          average_score: number | null
          best_score: number | null
          completed_calls: number | null
          completion_percentage: number | null
          created_at: string | null
          id: string
          improvement_trend: number | null
          last_activity_date: string | null
          latest_score: number | null
          metadata: Json | null
          target_met: boolean | null
          total_calls: number | null
          training_program_id: string | null
          updated_at: string | null
          user_id: string
          worst_score: number | null
        }
        Insert: {
          average_score?: number | null
          best_score?: number | null
          completed_calls?: number | null
          completion_percentage?: number | null
          created_at?: string | null
          id?: string
          improvement_trend?: number | null
          last_activity_date?: string | null
          latest_score?: number | null
          metadata?: Json | null
          target_met?: boolean | null
          total_calls?: number | null
          training_program_id?: string | null
          updated_at?: string | null
          user_id: string
          worst_score?: number | null
        }
        Update: {
          average_score?: number | null
          best_score?: number | null
          completed_calls?: number | null
          completion_percentage?: number | null
          created_at?: string | null
          id?: string
          improvement_trend?: number | null
          last_activity_date?: string | null
          latest_score?: number | null
          metadata?: Json | null
          target_met?: boolean | null
          total_calls?: number | null
          training_program_id?: string | null
          updated_at?: string | null
          user_id?: string
          worst_score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "bdr_user_progress_summary_training_program_id_fkey"
            columns: ["training_program_id"]
            isOneToOne: false
            referencedRelation: "bdr_training_programs"
            referencedColumns: ["id"]
          },
        ]
      }
      bdr_validation_history: {
        Row: {
          confidence_score: number | null
          created_at: string | null
          dataset_id: string | null
          id: string
          original_scores: Json | null
          updated_at: string | null
          validated_scores: Json | null
          validation_metadata: Json | null
          validation_notes: string | null
          validation_status: string | null
          validation_type: string
          validator_id: string | null
        }
        Insert: {
          confidence_score?: number | null
          created_at?: string | null
          dataset_id?: string | null
          id?: string
          original_scores?: Json | null
          updated_at?: string | null
          validated_scores?: Json | null
          validation_metadata?: Json | null
          validation_notes?: string | null
          validation_status?: string | null
          validation_type: string
          validator_id?: string | null
        }
        Update: {
          confidence_score?: number | null
          created_at?: string | null
          dataset_id?: string | null
          id?: string
          original_scores?: Json | null
          updated_at?: string | null
          validated_scores?: Json | null
          validation_metadata?: Json | null
          validation_notes?: string | null
          validation_status?: string | null
          validation_type?: string
          validator_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bdr_validation_history_dataset_id_fkey"
            columns: ["dataset_id"]
            isOneToOne: false
            referencedRelation: "bdr_training_datasets"
            referencedColumns: ["id"]
          },
        ]
      }
      bdr_weekly_batch_schedules: {
        Row: {
          batch_size: number | null
          created_at: string | null
          id: string
          is_enabled: boolean | null
          last_run_time: string | null
          metadata: Json | null
          next_run_time: string | null
          schedule_day: string | null
          schedule_hour: number | null
          training_program_id: string | null
          updated_at: string | null
        }
        Insert: {
          batch_size?: number | null
          created_at?: string | null
          id?: string
          is_enabled?: boolean | null
          last_run_time?: string | null
          metadata?: Json | null
          next_run_time?: string | null
          schedule_day?: string | null
          schedule_hour?: number | null
          training_program_id?: string | null
          updated_at?: string | null
        }
        Update: {
          batch_size?: number | null
          created_at?: string | null
          id?: string
          is_enabled?: boolean | null
          last_run_time?: string | null
          metadata?: Json | null
          next_run_time?: string | null
          schedule_day?: string | null
          schedule_hour?: number | null
          training_program_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bdr_weekly_batch_schedules_training_program_id_fkey"
            columns: ["training_program_id"]
            isOneToOne: false
            referencedRelation: "bdr_training_programs"
            referencedColumns: ["id"]
          },
        ]
      }
      recordings: {
        Row: {
          created_at: string | null
          id: string
          title: string | null
          transcript: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          title?: string | null
          transcript?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          title?: string | null
          transcript?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      "training-data": {
        Row: {
          created_at: string | null
          id: string
          metadata: Json | null
          transcript: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          metadata?: Json | null
          transcript?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          metadata?: Json | null
          transcript?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  storage: {
    Tables: {
      buckets: {
        Row: {
          allowed_mime_types: string[] | null
          avif_autodetection: boolean | null
          created_at: string | null
          file_size_limit: number | null
          id: string
          name: string
          owner: string | null
          owner_id: string | null
          public: boolean | null
          updated_at: string | null
        }
        Insert: {
          allowed_mime_types?: string[] | null
          avif_autodetection?: boolean | null
          created_at?: string | null
          file_size_limit?: number | null
          id: string
          name: string
          owner?: string | null
          owner_id?: string | null
          public?: boolean | null
          updated_at?: string | null
        }
        Update: {
          allowed_mime_types?: string[] | null
          avif_autodetection?: boolean | null
          created_at?: string | null
          file_size_limit?: number | null
          id?: string
          name?: string
          owner?: string | null
          owner_id?: string | null
          public?: boolean | null
          updated_at?: string | null
        }
        Relationships: []
      }
      migrations: {
        Row: {
          executed_at: string | null
          hash: string
          id: number
          name: string
        }
        Insert: {
          executed_at?: string | null
          hash: string
          id: number
          name: string
        }
        Update: {
          executed_at?: string | null
          hash?: string
          id?: number
          name?: string
        }
        Relationships: []
      }
      objects: {
        Row: {
          bucket_id: string | null
          created_at: string | null
          id: string
          last_accessed_at: string | null
          level: number | null
          metadata: Json | null
          name: string | null
          owner: string | null
          owner_id: string | null
          path_tokens: string[] | null
          updated_at: string | null
          user_metadata: Json | null
          version: string | null
        }
        Insert: {
          bucket_id?: string | null
          created_at?: string | null
          id?: string
          last_accessed_at?: string | null
          level?: number | null
          metadata?: Json | null
          name?: string | null
          owner?: string | null
          owner_id?: string | null
          path_tokens?: string[] | null
          updated_at?: string | null
          user_metadata?: Json | null
          version?: string | null
        }
        Update: {
          bucket_id?: string | null
          created_at?: string | null
          id?: string
          last_accessed_at?: string | null
          level?: number | null
          metadata?: Json | null
          name?: string | null
          owner?: string | null
          owner_id?: string | null
          path_tokens?: string[] | null
          updated_at?: string | null
          user_metadata?: Json | null
          version?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "objects_bucketId_fkey"
            columns: ["bucket_id"]
            isOneToOne: false
            referencedRelation: "buckets"
            referencedColumns: ["id"]
          },
        ]
      }
      prefixes: {
        Row: {
          bucket_id: string
          created_at: string | null
          level: number
          name: string
          updated_at: string | null
        }
        Insert: {
          bucket_id: string
          created_at?: string | null
          level?: number
          name: string
          updated_at?: string | null
        }
        Update: {
          bucket_id?: string
          created_at?: string | null
          level?: number
          name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "prefixes_bucketId_fkey"
            columns: ["bucket_id"]
            isOneToOne: false
            referencedRelation: "buckets"
            referencedColumns: ["id"]
          },
        ]
      }
      s3_multipart_uploads: {
        Row: {
          bucket_id: string
          created_at: string
          id: string
          in_progress_size: number
          key: string
          owner_id: string | null
          upload_signature: string
          user_metadata: Json | null
          version: string
        }
        Insert: {
          bucket_id: string
          created_at?: string
          id: string
          in_progress_size?: number
          key: string
          owner_id?: string | null
          upload_signature: string
          user_metadata?: Json | null
          version: string
        }
        Update: {
          bucket_id?: string
          created_at?: string
          id?: string
          in_progress_size?: number
          key?: string
          owner_id?: string | null
          upload_signature?: string
          user_metadata?: Json | null
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "s3_multipart_uploads_bucket_id_fkey"
            columns: ["bucket_id"]
            isOneToOne: false
            referencedRelation: "buckets"
            referencedColumns: ["id"]
          },
        ]
      }
      s3_multipart_uploads_parts: {
        Row: {
          bucket_id: string
          created_at: string
          etag: string
          id: string
          key: string
          owner_id: string | null
          part_number: number
          size: number
          upload_id: string
          version: string
        }
        Insert: {
          bucket_id: string
          created_at?: string
          etag: string
          id?: string
          key: string
          owner_id?: string | null
          part_number: number
          size?: number
          upload_id: string
          version: string
        }
        Update: {
          bucket_id?: string
          created_at?: string
          etag?: string
          id?: string
          key?: string
          owner_id?: string | null
          part_number?: number
          size?: number
          upload_id?: string
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "s3_multipart_uploads_parts_bucket_id_fkey"
            columns: ["bucket_id"]
            isOneToOne: false
            referencedRelation: "buckets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "s3_multipart_uploads_parts_upload_id_fkey"
            columns: ["upload_id"]
            isOneToOne: false
            referencedRelation: "s3_multipart_uploads"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      add_prefixes: {
        Args: { _name: string; _bucket_id: string }
        Returns: undefined
      }
      can_insert_object: {
        Args: { metadata: Json; owner: string; name: string; bucketid: string }
        Returns: undefined
      }
      delete_prefix: {
        Args: { _name: string; _bucket_id: string }
        Returns: boolean
      }
      extension: {
        Args: { name: string }
        Returns: string
      }
      filename: {
        Args: { name: string }
        Returns: string
      }
      foldername: {
        Args: { name: string }
        Returns: string[]
      }
      get_level: {
        Args: { name: string }
        Returns: number
      }
      get_prefix: {
        Args: { name: string }
        Returns: string
      }
      get_prefixes: {
        Args: { name: string }
        Returns: string[]
      }
      get_size_by_bucket: {
        Args: Record<PropertyKey, never>
        Returns: {
          size: number
          bucket_id: string
        }[]
      }
      list_multipart_uploads_with_delimiter: {
        Args: {
          max_keys?: number
          delimiter_param: string
          prefix_param: string
          bucket_id: string
          next_key_token?: string
          next_upload_token?: string
        }
        Returns: {
          id: string
          created_at: string
          key: string
        }[]
      }
      list_objects_with_delimiter: {
        Args: {
          bucket_id: string
          prefix_param: string
          delimiter_param: string
          max_keys?: number
          start_after?: string
          next_token?: string
        }
        Returns: {
          name: string
          id: string
          metadata: Json
          updated_at: string
        }[]
      }
      operation: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      search: {
        Args: {
          limits?: number
          prefix: string
          sortorder?: string
          sortcolumn?: string
          search?: string
          offsets?: number
          levels?: number
          bucketname: string
        }
        Returns: {
          last_accessed_at: string
          created_at: string
          metadata: Json
          updated_at: string
          id: string
          name: string
        }[]
      }
      search_legacy_v1: {
        Args: {
          prefix: string
          sortorder?: string
          sortcolumn?: string
          search?: string
          offsets?: number
          levels?: number
          limits?: number
          bucketname: string
        }
        Returns: {
          metadata: Json
          created_at: string
          updated_at: string
          id: string
          name: string
          last_accessed_at: string
        }[]
      }
      search_v1_optimised: {
        Args: {
          prefix: string
          bucketname: string
          limits?: number
          levels?: number
          offsets?: number
          search?: string
          sortcolumn?: string
          sortorder?: string
        }
        Returns: {
          metadata: Json
          id: string
          name: string
          updated_at: string
          created_at: string
          last_accessed_at: string
        }[]
      }
      search_v2: {
        Args: {
          bucket_name: string
          limits?: number
          levels?: number
          start_after?: string
          prefix: string
        }
        Returns: {
          key: string
          name: string
          id: string
          updated_at: string
          metadata: Json
          created_at: string
        }[]
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
  storage: {
    Enums: {},
  },
} as const

