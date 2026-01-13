export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      account_integrations: {
        Row: {
          account_id: string
          api_key_encrypted: string | null
          api_secret_encrypted: string | null
          config_json: Json | null
          created_at: string | null
          created_by: string | null
          id: string
          is_active: boolean | null
          is_verified: boolean | null
          last_used_at: string | null
          last_verified_at: string | null
          provider: string
          total_requests: number | null
          updated_at: string | null
          verification_error: string | null
        }
        Insert: {
          account_id: string
          api_key_encrypted?: string | null
          api_secret_encrypted?: string | null
          config_json?: Json | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          is_verified?: boolean | null
          last_used_at?: string | null
          last_verified_at?: string | null
          provider: string
          total_requests?: number | null
          updated_at?: string | null
          verification_error?: string | null
        }
        Update: {
          account_id?: string
          api_key_encrypted?: string | null
          api_secret_encrypted?: string | null
          config_json?: Json | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          is_verified?: boolean | null
          last_used_at?: string | null
          last_verified_at?: string | null
          provider?: string
          total_requests?: number | null
          updated_at?: string | null
          verification_error?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "account_integrations_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      accounts: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          name: string
          settings_json: Json | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          settings_json?: Json | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          settings_json?: Json | null
          updated_at?: string | null
        }
        Relationships: []
      }
      agent_skills: {
        Row: {
          agent_id: string
          id: string
          queue_id: string
          skill_level: number | null
        }
        Insert: {
          agent_id: string
          id?: string
          queue_id: string
          skill_level?: number | null
        }
        Update: {
          agent_id?: string
          id?: string
          queue_id?: string
          skill_level?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "agent_skills_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_skills_queue_id_fkey"
            columns: ["queue_id"]
            isOneToOne: false
            referencedRelation: "queues"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_stats: {
        Row: {
          adherence: number | null
          agent_id: string
          aht: number | null
          calls_handled: number | null
          calls_missed: number | null
          conversions: number | null
          date: string
          id: string
          total_hold_time: number | null
          total_talk_time: number | null
          total_wrapup_time: number | null
        }
        Insert: {
          adherence?: number | null
          agent_id: string
          aht?: number | null
          calls_handled?: number | null
          calls_missed?: number | null
          conversions?: number | null
          date: string
          id?: string
          total_hold_time?: number | null
          total_talk_time?: number | null
          total_wrapup_time?: number | null
        }
        Update: {
          adherence?: number | null
          agent_id?: string
          aht?: number | null
          calls_handled?: number | null
          calls_missed?: number | null
          conversions?: number | null
          date?: string
          id?: string
          total_hold_time?: number | null
          total_talk_time?: number | null
          total_wrapup_time?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "agent_stats_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
        ]
      }
      agents: {
        Row: {
          account_id: string
          created_at: string | null
          current_call_id: string | null
          extension: string | null
          id: string
          last_call_at: string | null
          logged_in_at: string | null
          pause_reason: string | null
          sip_user: string | null
          status: Database["public"]["Enums"]["agent_status"] | null
          team_id: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          account_id: string
          created_at?: string | null
          current_call_id?: string | null
          extension?: string | null
          id?: string
          last_call_at?: string | null
          logged_in_at?: string | null
          pause_reason?: string | null
          sip_user?: string | null
          status?: Database["public"]["Enums"]["agent_status"] | null
          team_id?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          account_id?: string
          created_at?: string | null
          current_call_id?: string | null
          extension?: string | null
          id?: string
          last_call_at?: string | null
          logged_in_at?: string | null
          pause_reason?: string | null
          sip_user?: string | null
          status?: Database["public"]["Enums"]["agent_status"] | null
          team_id?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "agents_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agents_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_agent_calls: {
        Row: {
          account_id: string
          agent_id: string | null
          call_id: string | null
          caller_phone: string | null
          conversation_id: string | null
          created_at: string | null
          duration_seconds: number | null
          ended_at: string | null
          handoff_reason: string | null
          handoff_requested: boolean | null
          id: string
          metadata_json: Json | null
          satisfaction_score: number | null
          sentiment: string | null
          started_at: string | null
          summary: string | null
          transcript: string | null
        }
        Insert: {
          account_id: string
          agent_id?: string | null
          call_id?: string | null
          caller_phone?: string | null
          conversation_id?: string | null
          created_at?: string | null
          duration_seconds?: number | null
          ended_at?: string | null
          handoff_reason?: string | null
          handoff_requested?: boolean | null
          id?: string
          metadata_json?: Json | null
          satisfaction_score?: number | null
          sentiment?: string | null
          started_at?: string | null
          summary?: string | null
          transcript?: string | null
        }
        Update: {
          account_id?: string
          agent_id?: string | null
          call_id?: string | null
          caller_phone?: string | null
          conversation_id?: string | null
          created_at?: string | null
          duration_seconds?: number | null
          ended_at?: string | null
          handoff_reason?: string | null
          handoff_requested?: boolean | null
          id?: string
          metadata_json?: Json | null
          satisfaction_score?: number | null
          sentiment?: string | null
          started_at?: string | null
          summary?: string | null
          transcript?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_agent_calls_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_agent_calls_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "ai_voice_agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_agent_calls_call_id_fkey"
            columns: ["call_id"]
            isOneToOne: false
            referencedRelation: "calls"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_handoffs: {
        Row: {
          call_id: string
          confidence: number | null
          created_at: string | null
          duration: number | null
          fields_json: Json | null
          id: string
          intent: string | null
          sentiment: string | null
          summary: string | null
          transcript: string | null
        }
        Insert: {
          call_id: string
          confidence?: number | null
          created_at?: string | null
          duration?: number | null
          fields_json?: Json | null
          id?: string
          intent?: string | null
          sentiment?: string | null
          summary?: string | null
          transcript?: string | null
        }
        Update: {
          call_id?: string
          confidence?: number | null
          created_at?: string | null
          duration?: number | null
          fields_json?: Json | null
          id?: string
          intent?: string | null
          sentiment?: string | null
          summary?: string | null
          transcript?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_handoffs_call_id_fkey"
            columns: ["call_id"]
            isOneToOne: false
            referencedRelation: "calls"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_prompt_templates: {
        Row: {
          account_id: string | null
          category: string
          created_at: string | null
          description: string | null
          id: string
          is_public: boolean | null
          name: string
          system_prompt: string
          updated_at: string | null
          usage_count: number | null
          variables: Json | null
        }
        Insert: {
          account_id?: string | null
          category?: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_public?: boolean | null
          name: string
          system_prompt: string
          updated_at?: string | null
          usage_count?: number | null
          variables?: Json | null
        }
        Update: {
          account_id?: string | null
          category?: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_public?: boolean | null
          name?: string
          system_prompt?: string
          updated_at?: string | null
          usage_count?: number | null
          variables?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_prompt_templates_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_prompt_versions: {
        Row: {
          account_id: string
          agent_id: string
          created_at: string | null
          created_by: string | null
          id: string
          is_active: boolean | null
          notes: string | null
          performance_metrics: Json | null
          system_prompt: string
          training_examples_count: number | null
          variables: Json | null
          version: number
        }
        Insert: {
          account_id: string
          agent_id: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          notes?: string | null
          performance_metrics?: Json | null
          system_prompt: string
          training_examples_count?: number | null
          variables?: Json | null
          version?: number
        }
        Update: {
          account_id?: string
          agent_id?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          notes?: string | null
          performance_metrics?: Json | null
          system_prompt?: string
          training_examples_count?: number | null
          variables?: Json | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "ai_prompt_versions_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_prompt_versions_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "ai_voice_agents"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_training_examples: {
        Row: {
          account_id: string
          agent_id: string | null
          annotations: Json | null
          call_id: string | null
          category: string
          created_at: string | null
          created_by: string | null
          expected_behavior: string | null
          id: string
          is_positive_example: boolean | null
          quality_score: number | null
          subcategory: string | null
          tags: string[] | null
          transcript: string
          updated_at: string | null
        }
        Insert: {
          account_id: string
          agent_id?: string | null
          annotations?: Json | null
          call_id?: string | null
          category?: string
          created_at?: string | null
          created_by?: string | null
          expected_behavior?: string | null
          id?: string
          is_positive_example?: boolean | null
          quality_score?: number | null
          subcategory?: string | null
          tags?: string[] | null
          transcript: string
          updated_at?: string | null
        }
        Update: {
          account_id?: string
          agent_id?: string | null
          annotations?: Json | null
          call_id?: string | null
          category?: string
          created_at?: string | null
          created_by?: string | null
          expected_behavior?: string | null
          id?: string
          is_positive_example?: boolean | null
          quality_score?: number | null
          subcategory?: string | null
          tags?: string[] | null
          transcript?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_training_examples_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_training_examples_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "ai_voice_agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_training_examples_call_id_fkey"
            columns: ["call_id"]
            isOneToOne: false
            referencedRelation: "calls"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_voice_agents: {
        Row: {
          account_id: string
          agent_id: string | null
          avg_satisfaction: number | null
          created_at: string | null
          description: string | null
          first_message: string | null
          id: string
          is_active: boolean | null
          language: string | null
          name: string
          overrides_config: Json | null
          provider: string
          system_prompt: string | null
          tools_config: Json | null
          total_calls: number | null
          total_duration_seconds: number | null
          updated_at: string | null
          voice_id: string | null
          voice_name: string | null
        }
        Insert: {
          account_id: string
          agent_id?: string | null
          avg_satisfaction?: number | null
          created_at?: string | null
          description?: string | null
          first_message?: string | null
          id?: string
          is_active?: boolean | null
          language?: string | null
          name: string
          overrides_config?: Json | null
          provider?: string
          system_prompt?: string | null
          tools_config?: Json | null
          total_calls?: number | null
          total_duration_seconds?: number | null
          updated_at?: string | null
          voice_id?: string | null
          voice_name?: string | null
        }
        Update: {
          account_id?: string
          agent_id?: string | null
          avg_satisfaction?: number | null
          created_at?: string | null
          description?: string | null
          first_message?: string | null
          id?: string
          is_active?: boolean | null
          language?: string | null
          name?: string
          overrides_config?: Json | null
          provider?: string
          system_prompt?: string | null
          tools_config?: Json | null
          total_calls?: number | null
          total_duration_seconds?: number | null
          updated_at?: string | null
          voice_id?: string | null
          voice_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_voice_agents_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      amd_provider_configs: {
        Row: {
          account_id: string
          config_json: Json | null
          cost_per_detection: number | null
          created_at: string | null
          id: string
          is_active: boolean | null
          max_detection_time_ms: number | null
          min_word_count: number | null
          priority: number | null
          provider: string
          silence_threshold_ms: number | null
          speech_threshold_ms: number | null
          updated_at: string | null
        }
        Insert: {
          account_id: string
          config_json?: Json | null
          cost_per_detection?: number | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          max_detection_time_ms?: number | null
          min_word_count?: number | null
          priority?: number | null
          provider: string
          silence_threshold_ms?: number | null
          speech_threshold_ms?: number | null
          updated_at?: string | null
        }
        Update: {
          account_id?: string
          config_json?: Json | null
          cost_per_detection?: number | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          max_detection_time_ms?: number | null
          min_word_count?: number | null
          priority?: number | null
          provider?: string
          silence_threshold_ms?: number | null
          speech_threshold_ms?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "amd_provider_configs_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      amd_results: {
        Row: {
          action_taken: string | null
          audio_duration_ms: number | null
          beep_detected: boolean | null
          call_id: string
          campaign_id: string | null
          confidence_score: number | null
          created_at: string | null
          detection_result: string
          detection_time_ms: number | null
          id: string
          provider: string | null
          raw_response: Json | null
          silence_duration_ms: number | null
          speech_detected: boolean | null
        }
        Insert: {
          action_taken?: string | null
          audio_duration_ms?: number | null
          beep_detected?: boolean | null
          call_id: string
          campaign_id?: string | null
          confidence_score?: number | null
          created_at?: string | null
          detection_result: string
          detection_time_ms?: number | null
          id?: string
          provider?: string | null
          raw_response?: Json | null
          silence_duration_ms?: number | null
          speech_detected?: boolean | null
        }
        Update: {
          action_taken?: string | null
          audio_duration_ms?: number | null
          beep_detected?: boolean | null
          call_id?: string
          campaign_id?: string | null
          confidence_score?: number | null
          created_at?: string | null
          detection_result?: string
          detection_time_ms?: number | null
          id?: string
          provider?: string | null
          raw_response?: Json | null
          silence_duration_ms?: number | null
          speech_detected?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "amd_results_call_id_fkey"
            columns: ["call_id"]
            isOneToOne: false
            referencedRelation: "calls"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "amd_results_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      amd_statistics: {
        Row: {
          avg_confidence: number | null
          avg_detection_time_ms: number | null
          campaign_id: string
          created_at: string | null
          date: string
          fax_detections: number | null
          hour: number | null
          human_detections: number | null
          id: string
          machine_detections: number | null
          messages_left: number | null
          total_detections: number | null
          unknown_detections: number | null
        }
        Insert: {
          avg_confidence?: number | null
          avg_detection_time_ms?: number | null
          campaign_id: string
          created_at?: string | null
          date?: string
          fax_detections?: number | null
          hour?: number | null
          human_detections?: number | null
          id?: string
          machine_detections?: number | null
          messages_left?: number | null
          total_detections?: number | null
          unknown_detections?: number | null
        }
        Update: {
          avg_confidence?: number | null
          avg_detection_time_ms?: number | null
          campaign_id?: string
          created_at?: string | null
          date?: string
          fax_detections?: number | null
          hour?: number | null
          human_detections?: number | null
          id?: string
          machine_detections?: number | null
          messages_left?: number | null
          total_detections?: number | null
          unknown_detections?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "amd_statistics_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          account_id: string | null
          action: string
          created_at: string | null
          entity_id: string | null
          entity_type: string | null
          id: string
          ip_address: string | null
          new_data: Json | null
          old_data: Json | null
          user_id: string | null
        }
        Insert: {
          account_id?: string | null
          action: string
          created_at?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          ip_address?: string | null
          new_data?: Json | null
          old_data?: Json | null
          user_id?: string | null
        }
        Update: {
          account_id?: string | null
          action?: string
          created_at?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          ip_address?: string | null
          new_data?: Json | null
          old_data?: Json | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      call_attempt_events: {
        Row: {
          attempt_id: string
          created_at: string | null
          event_data: Json | null
          event_source: string | null
          event_type: string
          from_state: string | null
          id: string
          rtp_stats: Json | null
          sip_code: number | null
          sip_reason: string | null
          to_state: string | null
        }
        Insert: {
          attempt_id: string
          created_at?: string | null
          event_data?: Json | null
          event_source?: string | null
          event_type: string
          from_state?: string | null
          id?: string
          rtp_stats?: Json | null
          sip_code?: number | null
          sip_reason?: string | null
          to_state?: string | null
        }
        Update: {
          attempt_id?: string
          created_at?: string | null
          event_data?: Json | null
          event_source?: string | null
          event_type?: string
          from_state?: string | null
          id?: string
          rtp_stats?: Json | null
          sip_code?: number | null
          sip_reason?: string | null
          to_state?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "call_attempt_events_attempt_id_fkey"
            columns: ["attempt_id"]
            isOneToOne: false
            referencedRelation: "call_attempts"
            referencedColumns: ["id"]
          },
        ]
      }
      call_attempt_timers: {
        Row: {
          attempt_id: string
          cancelled: boolean | null
          created_at: string | null
          fired: boolean | null
          fires_at: string
          id: string
          timer_type: string
        }
        Insert: {
          attempt_id: string
          cancelled?: boolean | null
          created_at?: string | null
          fired?: boolean | null
          fires_at: string
          id?: string
          timer_type: string
        }
        Update: {
          attempt_id?: string
          cancelled?: boolean | null
          created_at?: string | null
          fired?: boolean | null
          fires_at?: string
          id?: string
          timer_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "call_attempt_timers_attempt_id_fkey"
            columns: ["attempt_id"]
            isOneToOne: false
            referencedRelation: "call_attempts"
            referencedColumns: ["id"]
          },
        ]
      }
      call_attempts: {
        Row: {
          account_id: string
          agent_id: string | null
          amd_confidence: number | null
          amd_duration_ms: number | null
          amd_result: string | null
          answer_at: string | null
          attempt_number: number | null
          bridge_at: string | null
          caller_id_id: string | null
          caller_id_used: string | null
          campaign_id: string | null
          carrier_id: string | null
          correlation_id: string | null
          created_at: string | null
          duration_ms: number | null
          early_media_at: string | null
          end_at: string | null
          failover_count: number | null
          failover_reason: string | null
          hangup_cause: string | null
          hangup_source: string | null
          hold_duration_ms: number | null
          id: string
          lead_id: string | null
          metadata: Json | null
          mos_score: number | null
          originate_at: string | null
          phone_e164: string
          previous_attempt_id: string | null
          quality_issues: string[] | null
          queued_at: string | null
          reserved_at: string | null
          retry_count: number | null
          ring_at: string | null
          ring_duration_ms: number | null
          route_id: string | null
          rtp_jitter_ms: number | null
          rtp_last_seen_at: string | null
          rtp_packet_loss_percent: number | null
          rtp_packets_received: number | null
          rtp_started_at: string | null
          sip_call_id: string | null
          sip_codes: number[] | null
          sip_final_code: number | null
          sip_final_reason: string | null
          sip_from_tag: string | null
          sip_to_tag: string | null
          state: string
          talk_duration_ms: number | null
          trunk_id: string | null
          updated_at: string | null
        }
        Insert: {
          account_id: string
          agent_id?: string | null
          amd_confidence?: number | null
          amd_duration_ms?: number | null
          amd_result?: string | null
          answer_at?: string | null
          attempt_number?: number | null
          bridge_at?: string | null
          caller_id_id?: string | null
          caller_id_used?: string | null
          campaign_id?: string | null
          carrier_id?: string | null
          correlation_id?: string | null
          created_at?: string | null
          duration_ms?: number | null
          early_media_at?: string | null
          end_at?: string | null
          failover_count?: number | null
          failover_reason?: string | null
          hangup_cause?: string | null
          hangup_source?: string | null
          hold_duration_ms?: number | null
          id?: string
          lead_id?: string | null
          metadata?: Json | null
          mos_score?: number | null
          originate_at?: string | null
          phone_e164: string
          previous_attempt_id?: string | null
          quality_issues?: string[] | null
          queued_at?: string | null
          reserved_at?: string | null
          retry_count?: number | null
          ring_at?: string | null
          ring_duration_ms?: number | null
          route_id?: string | null
          rtp_jitter_ms?: number | null
          rtp_last_seen_at?: string | null
          rtp_packet_loss_percent?: number | null
          rtp_packets_received?: number | null
          rtp_started_at?: string | null
          sip_call_id?: string | null
          sip_codes?: number[] | null
          sip_final_code?: number | null
          sip_final_reason?: string | null
          sip_from_tag?: string | null
          sip_to_tag?: string | null
          state?: string
          talk_duration_ms?: number | null
          trunk_id?: string | null
          updated_at?: string | null
        }
        Update: {
          account_id?: string
          agent_id?: string | null
          amd_confidence?: number | null
          amd_duration_ms?: number | null
          amd_result?: string | null
          answer_at?: string | null
          attempt_number?: number | null
          bridge_at?: string | null
          caller_id_id?: string | null
          caller_id_used?: string | null
          campaign_id?: string | null
          carrier_id?: string | null
          correlation_id?: string | null
          created_at?: string | null
          duration_ms?: number | null
          early_media_at?: string | null
          end_at?: string | null
          failover_count?: number | null
          failover_reason?: string | null
          hangup_cause?: string | null
          hangup_source?: string | null
          hold_duration_ms?: number | null
          id?: string
          lead_id?: string | null
          metadata?: Json | null
          mos_score?: number | null
          originate_at?: string | null
          phone_e164?: string
          previous_attempt_id?: string | null
          quality_issues?: string[] | null
          queued_at?: string | null
          reserved_at?: string | null
          retry_count?: number | null
          ring_at?: string | null
          ring_duration_ms?: number | null
          route_id?: string | null
          rtp_jitter_ms?: number | null
          rtp_last_seen_at?: string | null
          rtp_packet_loss_percent?: number | null
          rtp_packets_received?: number | null
          rtp_started_at?: string | null
          sip_call_id?: string | null
          sip_codes?: number[] | null
          sip_final_code?: number | null
          sip_final_reason?: string | null
          sip_from_tag?: string | null
          sip_to_tag?: string | null
          state?: string
          talk_duration_ms?: number | null
          trunk_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "call_attempts_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "call_attempts_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "call_attempts_caller_id_id_fkey"
            columns: ["caller_id_id"]
            isOneToOne: false
            referencedRelation: "caller_id_numbers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "call_attempts_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "call_attempts_carrier_id_fkey"
            columns: ["carrier_id"]
            isOneToOne: false
            referencedRelation: "telephony_carriers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "call_attempts_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "call_attempts_previous_attempt_id_fkey"
            columns: ["previous_attempt_id"]
            isOneToOne: false
            referencedRelation: "call_attempts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "call_attempts_route_id_fkey"
            columns: ["route_id"]
            isOneToOne: false
            referencedRelation: "carrier_routes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "call_attempts_trunk_id_fkey"
            columns: ["trunk_id"]
            isOneToOne: false
            referencedRelation: "trunk_config"
            referencedColumns: ["id"]
          },
        ]
      }
      call_bridges: {
        Row: {
          account_id: string
          bridge_type: string
          call_a_id: string | null
          call_b_id: string | null
          connected_at: string | null
          created_at: string | null
          ended_at: string | null
          id: string
          initiated_by: string | null
          status: string | null
        }
        Insert: {
          account_id: string
          bridge_type?: string
          call_a_id?: string | null
          call_b_id?: string | null
          connected_at?: string | null
          created_at?: string | null
          ended_at?: string | null
          id?: string
          initiated_by?: string | null
          status?: string | null
        }
        Update: {
          account_id?: string
          bridge_type?: string
          call_a_id?: string | null
          call_b_id?: string | null
          connected_at?: string | null
          created_at?: string | null
          ended_at?: string | null
          id?: string
          initiated_by?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "call_bridges_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "call_bridges_call_a_id_fkey"
            columns: ["call_a_id"]
            isOneToOne: false
            referencedRelation: "calls"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "call_bridges_call_b_id_fkey"
            columns: ["call_b_id"]
            isOneToOne: false
            referencedRelation: "calls"
            referencedColumns: ["id"]
          },
        ]
      }
      call_dispositions: {
        Row: {
          call_id: string
          callback_at: string | null
          created_at: string | null
          disposition_id: string
          id: string
          notes: string | null
        }
        Insert: {
          call_id: string
          callback_at?: string | null
          created_at?: string | null
          disposition_id: string
          id?: string
          notes?: string | null
        }
        Update: {
          call_id?: string
          callback_at?: string | null
          created_at?: string | null
          disposition_id?: string
          id?: string
          notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "call_dispositions_call_id_fkey"
            columns: ["call_id"]
            isOneToOne: true
            referencedRelation: "calls"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "call_dispositions_disposition_id_fkey"
            columns: ["disposition_id"]
            isOneToOne: false
            referencedRelation: "dispositions"
            referencedColumns: ["id"]
          },
        ]
      }
      call_events: {
        Row: {
          call_id: string
          created_at: string | null
          event_data: Json | null
          event_type: string
          id: string
        }
        Insert: {
          call_id: string
          created_at?: string | null
          event_data?: Json | null
          event_type: string
          id?: string
        }
        Update: {
          call_id?: string
          created_at?: string | null
          event_data?: Json | null
          event_type?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "call_events_call_id_fkey"
            columns: ["call_id"]
            isOneToOne: false
            referencedRelation: "calls"
            referencedColumns: ["id"]
          },
        ]
      }
      call_quality_metrics: {
        Row: {
          avg_jitter_ms: number | null
          avg_rtt_ms: number | null
          bitrate_kbps: number | null
          call_id: string
          carrier_id: string | null
          codec_used: string | null
          created_at: string | null
          id: string
          jitter_ms: number | null
          max_jitter_ms: number | null
          max_rtt_ms: number | null
          measured_at: string | null
          min_jitter_ms: number | null
          min_rtt_ms: number | null
          mos_score: number | null
          packet_loss_percent: number | null
          rtt_ms: number | null
          samples_collected: number | null
          total_packets_lost: number | null
          total_packets_sent: number | null
          trunk_id: string | null
        }
        Insert: {
          avg_jitter_ms?: number | null
          avg_rtt_ms?: number | null
          bitrate_kbps?: number | null
          call_id: string
          carrier_id?: string | null
          codec_used?: string | null
          created_at?: string | null
          id?: string
          jitter_ms?: number | null
          max_jitter_ms?: number | null
          max_rtt_ms?: number | null
          measured_at?: string | null
          min_jitter_ms?: number | null
          min_rtt_ms?: number | null
          mos_score?: number | null
          packet_loss_percent?: number | null
          rtt_ms?: number | null
          samples_collected?: number | null
          total_packets_lost?: number | null
          total_packets_sent?: number | null
          trunk_id?: string | null
        }
        Update: {
          avg_jitter_ms?: number | null
          avg_rtt_ms?: number | null
          bitrate_kbps?: number | null
          call_id?: string
          carrier_id?: string | null
          codec_used?: string | null
          created_at?: string | null
          id?: string
          jitter_ms?: number | null
          max_jitter_ms?: number | null
          max_rtt_ms?: number | null
          measured_at?: string | null
          min_jitter_ms?: number | null
          min_rtt_ms?: number | null
          mos_score?: number | null
          packet_loss_percent?: number | null
          rtt_ms?: number | null
          samples_collected?: number | null
          total_packets_lost?: number | null
          total_packets_sent?: number | null
          trunk_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "call_quality_metrics_call_id_fkey"
            columns: ["call_id"]
            isOneToOne: false
            referencedRelation: "calls"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "call_quality_metrics_carrier_id_fkey"
            columns: ["carrier_id"]
            isOneToOne: false
            referencedRelation: "telephony_carriers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "call_quality_metrics_trunk_id_fkey"
            columns: ["trunk_id"]
            isOneToOne: false
            referencedRelation: "trunk_config"
            referencedColumns: ["id"]
          },
        ]
      }
      call_state_transitions: {
        Row: {
          call_id: string
          created_at: string | null
          duration_in_state_ms: number | null
          from_state: Database["public"]["Enums"]["call_state"] | null
          id: string
          metadata: Json | null
          rtp_stats: Json | null
          sip_code: number | null
          to_state: Database["public"]["Enums"]["call_state"]
          trigger_event: string
        }
        Insert: {
          call_id: string
          created_at?: string | null
          duration_in_state_ms?: number | null
          from_state?: Database["public"]["Enums"]["call_state"] | null
          id?: string
          metadata?: Json | null
          rtp_stats?: Json | null
          sip_code?: number | null
          to_state: Database["public"]["Enums"]["call_state"]
          trigger_event: string
        }
        Update: {
          call_id?: string
          created_at?: string | null
          duration_in_state_ms?: number | null
          from_state?: Database["public"]["Enums"]["call_state"] | null
          id?: string
          metadata?: Json | null
          rtp_stats?: Json | null
          sip_code?: number | null
          to_state?: Database["public"]["Enums"]["call_state"]
          trigger_event?: string
        }
        Relationships: [
          {
            foreignKeyName: "call_state_transitions_call_id_fkey"
            columns: ["call_id"]
            isOneToOne: false
            referencedRelation: "calls"
            referencedColumns: ["id"]
          },
        ]
      }
      callbacks: {
        Row: {
          account_id: string
          agent_id: string | null
          campaign_id: string | null
          completed_at: string | null
          created_at: string | null
          id: string
          lead_id: string
          notes: string | null
          scheduled_at: string
          status: string | null
        }
        Insert: {
          account_id: string
          agent_id?: string | null
          campaign_id?: string | null
          completed_at?: string | null
          created_at?: string | null
          id?: string
          lead_id: string
          notes?: string | null
          scheduled_at: string
          status?: string | null
        }
        Update: {
          account_id?: string
          agent_id?: string | null
          campaign_id?: string | null
          completed_at?: string | null
          created_at?: string | null
          id?: string
          lead_id?: string
          notes?: string | null
          scheduled_at?: string
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "callbacks_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "callbacks_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "callbacks_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "callbacks_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      caller_id_health: {
        Row: {
          answer_rate: number | null
          block_rate: number | null
          caller_id_number_id: string
          calls_attempted: number | null
          calls_blocked: number | null
          calls_connected: number | null
          calls_spam_reported: number | null
          created_at: string | null
          date: string
          external_reputation_score: number | null
          flagged_as_spam: boolean | null
          flagged_at: string | null
          health_score: number | null
          id: string
          reputation_source: string | null
        }
        Insert: {
          answer_rate?: number | null
          block_rate?: number | null
          caller_id_number_id: string
          calls_attempted?: number | null
          calls_blocked?: number | null
          calls_connected?: number | null
          calls_spam_reported?: number | null
          created_at?: string | null
          date?: string
          external_reputation_score?: number | null
          flagged_as_spam?: boolean | null
          flagged_at?: string | null
          health_score?: number | null
          id?: string
          reputation_source?: string | null
        }
        Update: {
          answer_rate?: number | null
          block_rate?: number | null
          caller_id_number_id?: string
          calls_attempted?: number | null
          calls_blocked?: number | null
          calls_connected?: number | null
          calls_spam_reported?: number | null
          created_at?: string | null
          date?: string
          external_reputation_score?: number | null
          flagged_as_spam?: boolean | null
          flagged_at?: string | null
          health_score?: number | null
          id?: string
          reputation_source?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "caller_id_health_caller_id_number_id_fkey"
            columns: ["caller_id_number_id"]
            isOneToOne: false
            referencedRelation: "caller_id_numbers"
            referencedColumns: ["id"]
          },
        ]
      }
      caller_id_numbers: {
        Row: {
          carrier_id: string | null
          created_at: string | null
          friendly_name: string | null
          id: string
          is_active: boolean | null
          is_verified: boolean | null
          last_used_at: string | null
          phone_number: string
          pool_id: string
          priority: number | null
          stir_shaken_attestation: string | null
          updated_at: string | null
          uses_this_hour: number | null
          uses_today: number | null
          weight: number | null
        }
        Insert: {
          carrier_id?: string | null
          created_at?: string | null
          friendly_name?: string | null
          id?: string
          is_active?: boolean | null
          is_verified?: boolean | null
          last_used_at?: string | null
          phone_number: string
          pool_id: string
          priority?: number | null
          stir_shaken_attestation?: string | null
          updated_at?: string | null
          uses_this_hour?: number | null
          uses_today?: number | null
          weight?: number | null
        }
        Update: {
          carrier_id?: string | null
          created_at?: string | null
          friendly_name?: string | null
          id?: string
          is_active?: boolean | null
          is_verified?: boolean | null
          last_used_at?: string | null
          phone_number?: string
          pool_id?: string
          priority?: number | null
          stir_shaken_attestation?: string | null
          updated_at?: string | null
          uses_this_hour?: number | null
          uses_today?: number | null
          weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "caller_id_numbers_carrier_id_fkey"
            columns: ["carrier_id"]
            isOneToOne: false
            referencedRelation: "telephony_carriers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "caller_id_numbers_pool_id_fkey"
            columns: ["pool_id"]
            isOneToOne: false
            referencedRelation: "caller_id_pools"
            referencedColumns: ["id"]
          },
        ]
      }
      caller_id_pools: {
        Row: {
          account_id: string
          cooldown_seconds: number | null
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          max_uses_per_hour: number | null
          name: string
          region: string | null
          rotation_strategy: string | null
          updated_at: string | null
        }
        Insert: {
          account_id: string
          cooldown_seconds?: number | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          max_uses_per_hour?: number | null
          name: string
          region?: string | null
          rotation_strategy?: string | null
          updated_at?: string | null
        }
        Update: {
          account_id?: string
          cooldown_seconds?: number | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          max_uses_per_hour?: number | null
          name?: string
          region?: string | null
          rotation_strategy?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "caller_id_pools_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      caller_id_rules: {
        Row: {
          account_id: string
          campaign_id: string | null
          created_at: string | null
          days_of_week: number[] | null
          ddd_pattern: string | null
          id: string
          is_active: boolean | null
          name: string
          pool_id: string
          priority: number | null
          time_end: string | null
          time_start: string | null
        }
        Insert: {
          account_id: string
          campaign_id?: string | null
          created_at?: string | null
          days_of_week?: number[] | null
          ddd_pattern?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          pool_id: string
          priority?: number | null
          time_end?: string | null
          time_start?: string | null
        }
        Update: {
          account_id?: string
          campaign_id?: string | null
          created_at?: string | null
          days_of_week?: number[] | null
          ddd_pattern?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          pool_id?: string
          priority?: number | null
          time_end?: string | null
          time_start?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "caller_id_rules_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "caller_id_rules_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "caller_id_rules_pool_id_fkey"
            columns: ["pool_id"]
            isOneToOne: false
            referencedRelation: "caller_id_pools"
            referencedColumns: ["id"]
          },
        ]
      }
      caller_id_usage: {
        Row: {
          call_id: string | null
          caller_id_number_id: string
          campaign_id: string | null
          duration_seconds: number | null
          id: string
          result: string | null
          used_at: string | null
        }
        Insert: {
          call_id?: string | null
          caller_id_number_id: string
          campaign_id?: string | null
          duration_seconds?: number | null
          id?: string
          result?: string | null
          used_at?: string | null
        }
        Update: {
          call_id?: string | null
          caller_id_number_id?: string
          campaign_id?: string | null
          duration_seconds?: number | null
          id?: string
          result?: string | null
          used_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "caller_id_usage_call_id_fkey"
            columns: ["call_id"]
            isOneToOne: false
            referencedRelation: "calls"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "caller_id_usage_caller_id_number_id_fkey"
            columns: ["caller_id_number_id"]
            isOneToOne: false
            referencedRelation: "caller_id_numbers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "caller_id_usage_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      calls: {
        Row: {
          account_id: string
          agent_id: string | null
          ai_action_items: string[] | null
          ai_analyzed_at: string | null
          ai_handoff_summary: string | null
          ai_key_topics: string[] | null
          ai_quality_score: number | null
          ai_sentiment: string | null
          ai_summary: string | null
          amd_confidence: number | null
          amd_duration_ms: number | null
          amd_result: string | null
          caller_id: string | null
          campaign_id: string | null
          carrier_id: string | null
          connected_at: string | null
          created_at: string | null
          current_state: Database["public"]["Enums"]["call_state"] | null
          direction: Database["public"]["Enums"]["call_direction"]
          disposition_id: string | null
          duration: number | null
          ended_at: string | null
          hold_time: number | null
          id: string
          is_ai_handled: boolean | null
          lead_id: string | null
          notes: string | null
          phone: string
          queue_id: string | null
          recording_url: string | null
          ringing_at: string | null
          started_at: string | null
          status: Database["public"]["Enums"]["call_status"] | null
          telephony_id: string | null
          transcript: string | null
          trunk_id: string | null
          wrapup_time: number | null
        }
        Insert: {
          account_id: string
          agent_id?: string | null
          ai_action_items?: string[] | null
          ai_analyzed_at?: string | null
          ai_handoff_summary?: string | null
          ai_key_topics?: string[] | null
          ai_quality_score?: number | null
          ai_sentiment?: string | null
          ai_summary?: string | null
          amd_confidence?: number | null
          amd_duration_ms?: number | null
          amd_result?: string | null
          caller_id?: string | null
          campaign_id?: string | null
          carrier_id?: string | null
          connected_at?: string | null
          created_at?: string | null
          current_state?: Database["public"]["Enums"]["call_state"] | null
          direction: Database["public"]["Enums"]["call_direction"]
          disposition_id?: string | null
          duration?: number | null
          ended_at?: string | null
          hold_time?: number | null
          id?: string
          is_ai_handled?: boolean | null
          lead_id?: string | null
          notes?: string | null
          phone: string
          queue_id?: string | null
          recording_url?: string | null
          ringing_at?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["call_status"] | null
          telephony_id?: string | null
          transcript?: string | null
          trunk_id?: string | null
          wrapup_time?: number | null
        }
        Update: {
          account_id?: string
          agent_id?: string | null
          ai_action_items?: string[] | null
          ai_analyzed_at?: string | null
          ai_handoff_summary?: string | null
          ai_key_topics?: string[] | null
          ai_quality_score?: number | null
          ai_sentiment?: string | null
          ai_summary?: string | null
          amd_confidence?: number | null
          amd_duration_ms?: number | null
          amd_result?: string | null
          caller_id?: string | null
          campaign_id?: string | null
          carrier_id?: string | null
          connected_at?: string | null
          created_at?: string | null
          current_state?: Database["public"]["Enums"]["call_state"] | null
          direction?: Database["public"]["Enums"]["call_direction"]
          disposition_id?: string | null
          duration?: number | null
          ended_at?: string | null
          hold_time?: number | null
          id?: string
          is_ai_handled?: boolean | null
          lead_id?: string | null
          notes?: string | null
          phone?: string
          queue_id?: string | null
          recording_url?: string | null
          ringing_at?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["call_status"] | null
          telephony_id?: string | null
          transcript?: string | null
          trunk_id?: string | null
          wrapup_time?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "calls_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calls_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calls_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calls_carrier_id_fkey"
            columns: ["carrier_id"]
            isOneToOne: false
            referencedRelation: "telephony_carriers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calls_disposition_id_fkey"
            columns: ["disposition_id"]
            isOneToOne: false
            referencedRelation: "dispositions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calls_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calls_queue_id_fkey"
            columns: ["queue_id"]
            isOneToOne: false
            referencedRelation: "queues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calls_trunk_id_fkey"
            columns: ["trunk_id"]
            isOneToOne: false
            referencedRelation: "trunk_config"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_amd_settings: {
        Row: {
          amd_enabled: boolean | null
          amd_provider: string | null
          campaign_id: string
          created_at: string | null
          fax_action: string | null
          id: string
          machine_action: string | null
          machine_message: string | null
          max_detection_time_ms: number | null
          no_answer_action: string | null
          updated_at: string | null
        }
        Insert: {
          amd_enabled?: boolean | null
          amd_provider?: string | null
          campaign_id: string
          created_at?: string | null
          fax_action?: string | null
          id?: string
          machine_action?: string | null
          machine_message?: string | null
          max_detection_time_ms?: number | null
          no_answer_action?: string | null
          updated_at?: string | null
        }
        Update: {
          amd_enabled?: boolean | null
          amd_provider?: string | null
          campaign_id?: string
          created_at?: string | null
          fax_action?: string | null
          id?: string
          machine_action?: string | null
          machine_message?: string | null
          max_detection_time_ms?: number | null
          no_answer_action?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "campaign_amd_settings_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: true
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_lists: {
        Row: {
          campaign_id: string
          id: string
          list_id: string
          priority: number | null
        }
        Insert: {
          campaign_id: string
          id?: string
          list_id: string
          priority?: number | null
        }
        Update: {
          campaign_id?: string
          id?: string
          list_id?: string
          priority?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "campaign_lists_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_lists_list_id_fkey"
            columns: ["list_id"]
            isOneToOne: false
            referencedRelation: "lists"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_metrics_window: {
        Row: {
          abandon_rate: number | null
          acd_seconds: number | null
          asr: number | null
          attempts_abandoned: number | null
          attempts_answered: number | null
          attempts_failed: number | null
          attempts_no_rtp: number | null
          attempts_total: number | null
          campaign_id: string
          created_at: string | null
          id: string
          metrics_by_route: Json | null
          pdd_ms: number | null
          window_end: string
          window_start: string
        }
        Insert: {
          abandon_rate?: number | null
          acd_seconds?: number | null
          asr?: number | null
          attempts_abandoned?: number | null
          attempts_answered?: number | null
          attempts_failed?: number | null
          attempts_no_rtp?: number | null
          attempts_total?: number | null
          campaign_id: string
          created_at?: string | null
          id?: string
          metrics_by_route?: Json | null
          pdd_ms?: number | null
          window_end: string
          window_start: string
        }
        Update: {
          abandon_rate?: number | null
          acd_seconds?: number | null
          asr?: number | null
          attempts_abandoned?: number | null
          attempts_answered?: number | null
          attempts_failed?: number | null
          attempts_no_rtp?: number | null
          attempts_total?: number | null
          campaign_id?: string
          created_at?: string | null
          id?: string
          metrics_by_route?: Json | null
          pdd_ms?: number | null
          window_end?: string
          window_start?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaign_metrics_window_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      campaigns: {
        Row: {
          abandon_limit_percent: number | null
          account_id: string
          adaptive_method: Database["public"]["Enums"]["adaptive_method"] | null
          agent_assign_timeout_seconds: number | null
          allowed_routes: string[] | null
          answer_no_rtp_timeout_seconds: number | null
          available_only_tally: boolean | null
          caller_id: string | null
          cooldown_minutes: number | null
          created_at: string | null
          description: string | null
          dial_mode: Database["public"]["Enums"]["dial_mode"] | null
          dial_ratio: number | null
          dialer_mode: string | null
          drop_percentage_target: number | null
          end_time: string | null
          id: string
          max_adapt_dial_level: number | null
          max_attempts: number | null
          max_call_duration_seconds: number | null
          max_concurrent: number | null
          max_retry_attempts: number | null
          name: string
          queue_id: string | null
          retry_delay_minutes: number | null
          ring_timeout_seconds: number | null
          script_id: string | null
          start_time: string | null
          status: Database["public"]["Enums"]["campaign_status"] | null
          target_cps: number | null
          updated_at: string | null
          work_days: number[] | null
        }
        Insert: {
          abandon_limit_percent?: number | null
          account_id: string
          adaptive_method?:
            | Database["public"]["Enums"]["adaptive_method"]
            | null
          agent_assign_timeout_seconds?: number | null
          allowed_routes?: string[] | null
          answer_no_rtp_timeout_seconds?: number | null
          available_only_tally?: boolean | null
          caller_id?: string | null
          cooldown_minutes?: number | null
          created_at?: string | null
          description?: string | null
          dial_mode?: Database["public"]["Enums"]["dial_mode"] | null
          dial_ratio?: number | null
          dialer_mode?: string | null
          drop_percentage_target?: number | null
          end_time?: string | null
          id?: string
          max_adapt_dial_level?: number | null
          max_attempts?: number | null
          max_call_duration_seconds?: number | null
          max_concurrent?: number | null
          max_retry_attempts?: number | null
          name: string
          queue_id?: string | null
          retry_delay_minutes?: number | null
          ring_timeout_seconds?: number | null
          script_id?: string | null
          start_time?: string | null
          status?: Database["public"]["Enums"]["campaign_status"] | null
          target_cps?: number | null
          updated_at?: string | null
          work_days?: number[] | null
        }
        Update: {
          abandon_limit_percent?: number | null
          account_id?: string
          adaptive_method?:
            | Database["public"]["Enums"]["adaptive_method"]
            | null
          agent_assign_timeout_seconds?: number | null
          allowed_routes?: string[] | null
          answer_no_rtp_timeout_seconds?: number | null
          available_only_tally?: boolean | null
          caller_id?: string | null
          cooldown_minutes?: number | null
          created_at?: string | null
          description?: string | null
          dial_mode?: Database["public"]["Enums"]["dial_mode"] | null
          dial_ratio?: number | null
          dialer_mode?: string | null
          drop_percentage_target?: number | null
          end_time?: string | null
          id?: string
          max_adapt_dial_level?: number | null
          max_attempts?: number | null
          max_call_duration_seconds?: number | null
          max_concurrent?: number | null
          max_retry_attempts?: number | null
          name?: string
          queue_id?: string | null
          retry_delay_minutes?: number | null
          ring_timeout_seconds?: number | null
          script_id?: string | null
          start_time?: string | null
          status?: Database["public"]["Enums"]["campaign_status"] | null
          target_cps?: number | null
          updated_at?: string | null
          work_days?: number[] | null
        }
        Relationships: [
          {
            foreignKeyName: "campaigns_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaigns_queue_id_fkey"
            columns: ["queue_id"]
            isOneToOne: false
            referencedRelation: "queues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaigns_script_id_fkey"
            columns: ["script_id"]
            isOneToOne: false
            referencedRelation: "scripts"
            referencedColumns: ["id"]
          },
        ]
      }
      carrier_decisions: {
        Row: {
          actual_cost: number | null
          actual_duration: number | null
          ai_reasoning: string | null
          call_id: string | null
          campaign_id: string | null
          carrier_id: string
          created_at: string | null
          id: string
          latency_ms: number | null
          was_successful: boolean | null
        }
        Insert: {
          actual_cost?: number | null
          actual_duration?: number | null
          ai_reasoning?: string | null
          call_id?: string | null
          campaign_id?: string | null
          carrier_id: string
          created_at?: string | null
          id?: string
          latency_ms?: number | null
          was_successful?: boolean | null
        }
        Update: {
          actual_cost?: number | null
          actual_duration?: number | null
          ai_reasoning?: string | null
          call_id?: string | null
          campaign_id?: string | null
          carrier_id?: string
          created_at?: string | null
          id?: string
          latency_ms?: number | null
          was_successful?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "carrier_decisions_call_id_fkey"
            columns: ["call_id"]
            isOneToOne: false
            referencedRelation: "calls"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "carrier_decisions_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "carrier_decisions_carrier_id_fkey"
            columns: ["carrier_id"]
            isOneToOne: false
            referencedRelation: "telephony_carriers"
            referencedColumns: ["id"]
          },
        ]
      }
      carrier_metrics: {
        Row: {
          avg_duration: number | null
          avg_latency_ms: number | null
          carrier_id: string
          connected_calls: number | null
          connection_rate: number | null
          cost_total: number | null
          created_at: string | null
          date: string
          failed_calls: number | null
          hour: number | null
          id: string
          total_calls: number | null
        }
        Insert: {
          avg_duration?: number | null
          avg_latency_ms?: number | null
          carrier_id: string
          connected_calls?: number | null
          connection_rate?: number | null
          cost_total?: number | null
          created_at?: string | null
          date?: string
          failed_calls?: number | null
          hour?: number | null
          id?: string
          total_calls?: number | null
        }
        Update: {
          avg_duration?: number | null
          avg_latency_ms?: number | null
          carrier_id?: string
          connected_calls?: number | null
          connection_rate?: number | null
          cost_total?: number | null
          created_at?: string | null
          date?: string
          failed_calls?: number | null
          hour?: number | null
          id?: string
          total_calls?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "carrier_metrics_carrier_id_fkey"
            columns: ["carrier_id"]
            isOneToOne: false
            referencedRelation: "telephony_carriers"
            referencedColumns: ["id"]
          },
        ]
      }
      carrier_routes: {
        Row: {
          account_id: string
          campaign_types: string[] | null
          carrier_id: string
          created_at: string | null
          days_of_week: number[] | null
          ddd_patterns: string[] | null
          id: string
          is_active: boolean | null
          name: string
          priority: number | null
          time_end: string | null
          time_start: string | null
          weight: number | null
        }
        Insert: {
          account_id: string
          campaign_types?: string[] | null
          carrier_id: string
          created_at?: string | null
          days_of_week?: number[] | null
          ddd_patterns?: string[] | null
          id?: string
          is_active?: boolean | null
          name: string
          priority?: number | null
          time_end?: string | null
          time_start?: string | null
          weight?: number | null
        }
        Update: {
          account_id?: string
          campaign_types?: string[] | null
          carrier_id?: string
          created_at?: string | null
          days_of_week?: number[] | null
          ddd_patterns?: string[] | null
          id?: string
          is_active?: boolean | null
          name?: string
          priority?: number | null
          time_end?: string | null
          time_start?: string | null
          weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "carrier_routes_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "carrier_routes_carrier_id_fkey"
            columns: ["carrier_id"]
            isOneToOne: false
            referencedRelation: "telephony_carriers"
            referencedColumns: ["id"]
          },
        ]
      }
      conference_participants: {
        Row: {
          agent_id: string | null
          call_id: string | null
          conference_id: string
          display_name: string | null
          id: string
          is_muted: boolean | null
          is_on_hold: boolean | null
          joined_at: string | null
          left_at: string | null
          participant_type: string
          phone_number: string | null
          status: string | null
        }
        Insert: {
          agent_id?: string | null
          call_id?: string | null
          conference_id: string
          display_name?: string | null
          id?: string
          is_muted?: boolean | null
          is_on_hold?: boolean | null
          joined_at?: string | null
          left_at?: string | null
          participant_type?: string
          phone_number?: string | null
          status?: string | null
        }
        Update: {
          agent_id?: string | null
          call_id?: string | null
          conference_id?: string
          display_name?: string | null
          id?: string
          is_muted?: boolean | null
          is_on_hold?: boolean | null
          joined_at?: string | null
          left_at?: string | null
          participant_type?: string
          phone_number?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "conference_participants_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conference_participants_call_id_fkey"
            columns: ["call_id"]
            isOneToOne: false
            referencedRelation: "calls"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conference_participants_conference_id_fkey"
            columns: ["conference_id"]
            isOneToOne: false
            referencedRelation: "conference_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      conference_rooms: {
        Row: {
          account_id: string
          created_at: string | null
          created_by: string | null
          ended_at: string | null
          id: string
          is_active: boolean | null
          is_moderated: boolean | null
          is_recording: boolean | null
          max_participants: number | null
          moderator_pin: string | null
          name: string
          participant_pin: string | null
          room_code: string
        }
        Insert: {
          account_id: string
          created_at?: string | null
          created_by?: string | null
          ended_at?: string | null
          id?: string
          is_active?: boolean | null
          is_moderated?: boolean | null
          is_recording?: boolean | null
          max_participants?: number | null
          moderator_pin?: string | null
          name: string
          participant_pin?: string | null
          room_code: string
        }
        Update: {
          account_id?: string
          created_at?: string | null
          created_by?: string | null
          ended_at?: string | null
          id?: string
          is_active?: boolean | null
          is_moderated?: boolean | null
          is_recording?: boolean | null
          max_participants?: number | null
          moderator_pin?: string | null
          name?: string
          participant_pin?: string | null
          room_code?: string
        }
        Relationships: [
          {
            foreignKeyName: "conference_rooms_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      cps_history: {
        Row: {
          calls_queued: number | null
          calls_rejected: number | null
          cps_value: number
          id: string
          limit_value: number
          throttle_reason: string | null
          timestamp: string | null
          trunk_id: string
          was_throttled: boolean | null
        }
        Insert: {
          calls_queued?: number | null
          calls_rejected?: number | null
          cps_value: number
          id?: string
          limit_value: number
          throttle_reason?: string | null
          timestamp?: string | null
          trunk_id: string
          was_throttled?: boolean | null
        }
        Update: {
          calls_queued?: number | null
          calls_rejected?: number | null
          cps_value?: number
          id?: string
          limit_value?: number
          throttle_reason?: string | null
          timestamp?: string | null
          trunk_id?: string
          was_throttled?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "cps_history_trunk_id_fkey"
            columns: ["trunk_id"]
            isOneToOne: false
            referencedRelation: "trunk_config"
            referencedColumns: ["id"]
          },
        ]
      }
      dial_metrics: {
        Row: {
          agents_available: number | null
          agents_on_call: number | null
          asr: number | null
          avg_talk_time: number | null
          calls_abandoned: number | null
          calls_connected: number | null
          calls_dialed: number | null
          calls_ringing: number | null
          campaign_id: string
          created_at: string | null
          current_dial_ratio: number | null
          drop_rate: number | null
          id: string
          timestamp: string
        }
        Insert: {
          agents_available?: number | null
          agents_on_call?: number | null
          asr?: number | null
          avg_talk_time?: number | null
          calls_abandoned?: number | null
          calls_connected?: number | null
          calls_dialed?: number | null
          calls_ringing?: number | null
          campaign_id: string
          created_at?: string | null
          current_dial_ratio?: number | null
          drop_rate?: number | null
          id?: string
          timestamp?: string
        }
        Update: {
          agents_available?: number | null
          agents_on_call?: number | null
          asr?: number | null
          avg_talk_time?: number | null
          calls_abandoned?: number | null
          calls_connected?: number | null
          calls_dialed?: number | null
          calls_ringing?: number | null
          campaign_id?: string
          created_at?: string | null
          current_dial_ratio?: number | null
          drop_rate?: number | null
          id?: string
          timestamp?: string
        }
        Relationships: [
          {
            foreignKeyName: "dial_metrics_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      dispositions: {
        Row: {
          account_id: string
          category: Database["public"]["Enums"]["disposition_category"]
          code: string
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          is_default: boolean | null
          name: string
          requires_callback: boolean | null
          requires_notes: boolean | null
        }
        Insert: {
          account_id: string
          category: Database["public"]["Enums"]["disposition_category"]
          code: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          name: string
          requires_callback?: boolean | null
          requires_notes?: boolean | null
        }
        Update: {
          account_id?: string
          category?: Database["public"]["Enums"]["disposition_category"]
          code?: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          name?: string
          requires_callback?: boolean | null
          requires_notes?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "dispositions_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          account_id: string
          attempts: number | null
          city: string | null
          company: string | null
          created_at: string | null
          email: string | null
          first_name: string | null
          has_consent: boolean | null
          id: string
          is_dnc: boolean | null
          last_attempt_at: string | null
          last_name: string | null
          list_id: string | null
          max_attempts: number | null
          metadata_json: Json | null
          next_attempt_at: string | null
          normalized_phone: string | null
          phone: string
          score: number | null
          state: string | null
          status: string | null
          tags: string[] | null
          updated_at: string | null
        }
        Insert: {
          account_id: string
          attempts?: number | null
          city?: string | null
          company?: string | null
          created_at?: string | null
          email?: string | null
          first_name?: string | null
          has_consent?: boolean | null
          id?: string
          is_dnc?: boolean | null
          last_attempt_at?: string | null
          last_name?: string | null
          list_id?: string | null
          max_attempts?: number | null
          metadata_json?: Json | null
          next_attempt_at?: string | null
          normalized_phone?: string | null
          phone: string
          score?: number | null
          state?: string | null
          status?: string | null
          tags?: string[] | null
          updated_at?: string | null
        }
        Update: {
          account_id?: string
          attempts?: number | null
          city?: string | null
          company?: string | null
          created_at?: string | null
          email?: string | null
          first_name?: string | null
          has_consent?: boolean | null
          id?: string
          is_dnc?: boolean | null
          last_attempt_at?: string | null
          last_name?: string | null
          list_id?: string | null
          max_attempts?: number | null
          metadata_json?: Json | null
          next_attempt_at?: string | null
          normalized_phone?: string | null
          phone?: string
          score?: number | null
          state?: string | null
          status?: string | null
          tags?: string[] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "leads_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_list_id_fkey"
            columns: ["list_id"]
            isOneToOne: false
            referencedRelation: "lists"
            referencedColumns: ["id"]
          },
        ]
      }
      lists: {
        Row: {
          account_id: string
          created_at: string | null
          description: string | null
          id: string
          leads_count: number | null
          name: string
          status: string | null
          updated_at: string | null
        }
        Insert: {
          account_id: string
          created_at?: string | null
          description?: string | null
          id?: string
          leads_count?: number | null
          name: string
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          account_id?: string
          created_at?: string | null
          description?: string | null
          id?: string
          leads_count?: number | null
          name?: string
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lists_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          account_id: string
          created_at: string | null
          id: string
          message: string
          metadata_json: Json | null
          read: boolean | null
          related_entity_id: string | null
          related_entity_type: string | null
          severity: string | null
          title: string
          type: string
          user_id: string | null
        }
        Insert: {
          account_id: string
          created_at?: string | null
          id?: string
          message: string
          metadata_json?: Json | null
          read?: boolean | null
          related_entity_id?: string | null
          related_entity_type?: string | null
          severity?: string | null
          title: string
          type: string
          user_id?: string | null
        }
        Update: {
          account_id?: string
          created_at?: string | null
          id?: string
          message?: string
          metadata_json?: Json | null
          read?: boolean | null
          related_entity_id?: string | null
          related_entity_type?: string | null
          severity?: string | null
          title?: string
          type?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notifications_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      originate_jobs: {
        Row: {
          attempt_id: string
          caller_id_id: string | null
          campaign_id: string
          created_at: string | null
          error_message: string | null
          id: string
          locked_at: string | null
          locked_by: string | null
          priority: number | null
          processed_at: string | null
          result: Json | null
          route_id: string | null
          status: string | null
          trunk_id: string | null
        }
        Insert: {
          attempt_id: string
          caller_id_id?: string | null
          campaign_id: string
          created_at?: string | null
          error_message?: string | null
          id?: string
          locked_at?: string | null
          locked_by?: string | null
          priority?: number | null
          processed_at?: string | null
          result?: Json | null
          route_id?: string | null
          status?: string | null
          trunk_id?: string | null
        }
        Update: {
          attempt_id?: string
          caller_id_id?: string | null
          campaign_id?: string
          created_at?: string | null
          error_message?: string | null
          id?: string
          locked_at?: string | null
          locked_by?: string | null
          priority?: number | null
          processed_at?: string | null
          result?: Json | null
          route_id?: string | null
          status?: string | null
          trunk_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "originate_jobs_attempt_id_fkey"
            columns: ["attempt_id"]
            isOneToOne: false
            referencedRelation: "call_attempts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "originate_jobs_caller_id_id_fkey"
            columns: ["caller_id_id"]
            isOneToOne: false
            referencedRelation: "caller_id_numbers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "originate_jobs_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "originate_jobs_route_id_fkey"
            columns: ["route_id"]
            isOneToOne: false
            referencedRelation: "carrier_routes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "originate_jobs_trunk_id_fkey"
            columns: ["trunk_id"]
            isOneToOne: false
            referencedRelation: "trunk_config"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          account_id: string | null
          avatar_url: string | null
          created_at: string | null
          full_name: string | null
          id: string
          phone: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          account_id?: string | null
          avatar_url?: string | null
          created_at?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          account_id?: string | null
          avatar_url?: string | null
          created_at?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      qa_reviews: {
        Row: {
          agent_id: string | null
          call_id: string
          created_at: string | null
          feedback: string | null
          id: string
          reviewer_id: string | null
          scorecard_id: string | null
          scores_json: Json | null
          total_score: number | null
        }
        Insert: {
          agent_id?: string | null
          call_id: string
          created_at?: string | null
          feedback?: string | null
          id?: string
          reviewer_id?: string | null
          scorecard_id?: string | null
          scores_json?: Json | null
          total_score?: number | null
        }
        Update: {
          agent_id?: string | null
          call_id?: string
          created_at?: string | null
          feedback?: string | null
          id?: string
          reviewer_id?: string | null
          scorecard_id?: string | null
          scores_json?: Json | null
          total_score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "qa_reviews_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "qa_reviews_call_id_fkey"
            columns: ["call_id"]
            isOneToOne: false
            referencedRelation: "calls"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "qa_reviews_scorecard_id_fkey"
            columns: ["scorecard_id"]
            isOneToOne: false
            referencedRelation: "qa_scorecards"
            referencedColumns: ["id"]
          },
        ]
      }
      qa_scorecards: {
        Row: {
          account_id: string
          campaign_id: string | null
          created_at: string | null
          criteria_json: Json
          id: string
          is_active: boolean | null
          max_score: number | null
          name: string
        }
        Insert: {
          account_id: string
          campaign_id?: string | null
          created_at?: string | null
          criteria_json?: Json
          id?: string
          is_active?: boolean | null
          max_score?: number | null
          name: string
        }
        Update: {
          account_id?: string
          campaign_id?: string | null
          created_at?: string | null
          criteria_json?: Json
          id?: string
          is_active?: boolean | null
          max_score?: number | null
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "qa_scorecards_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "qa_scorecards_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      quality_alerts: {
        Row: {
          account_id: string
          acknowledged_at: string | null
          acknowledged_by: string | null
          action_details: Json | null
          alert_type: string
          auto_action_taken: string | null
          call_id: string | null
          carrier_id: string | null
          created_at: string | null
          current_value: number | null
          id: string
          message: string | null
          resolved_at: string | null
          severity: string
          threshold_value: number | null
          trunk_id: string | null
        }
        Insert: {
          account_id: string
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          action_details?: Json | null
          alert_type: string
          auto_action_taken?: string | null
          call_id?: string | null
          carrier_id?: string | null
          created_at?: string | null
          current_value?: number | null
          id?: string
          message?: string | null
          resolved_at?: string | null
          severity?: string
          threshold_value?: number | null
          trunk_id?: string | null
        }
        Update: {
          account_id?: string
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          action_details?: Json | null
          alert_type?: string
          auto_action_taken?: string | null
          call_id?: string | null
          carrier_id?: string | null
          created_at?: string | null
          current_value?: number | null
          id?: string
          message?: string | null
          resolved_at?: string | null
          severity?: string
          threshold_value?: number | null
          trunk_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quality_alerts_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quality_alerts_call_id_fkey"
            columns: ["call_id"]
            isOneToOne: false
            referencedRelation: "calls"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quality_alerts_carrier_id_fkey"
            columns: ["carrier_id"]
            isOneToOne: false
            referencedRelation: "telephony_carriers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quality_alerts_trunk_id_fkey"
            columns: ["trunk_id"]
            isOneToOne: false
            referencedRelation: "trunk_config"
            referencedColumns: ["id"]
          },
        ]
      }
      queue_agents: {
        Row: {
          agent_id: string
          id: string
          priority: number | null
          queue_id: string
        }
        Insert: {
          agent_id: string
          id?: string
          priority?: number | null
          queue_id: string
        }
        Update: {
          agent_id?: string
          id?: string
          priority?: number | null
          queue_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "queue_agents_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "queue_agents_queue_id_fkey"
            columns: ["queue_id"]
            isOneToOne: false
            referencedRelation: "queues"
            referencedColumns: ["id"]
          },
        ]
      }
      queues: {
        Row: {
          account_id: string
          created_at: string | null
          id: string
          is_active: boolean | null
          max_wait_time: number | null
          name: string
          sla_target: number | null
          strategy: Database["public"]["Enums"]["queue_strategy"] | null
          type: Database["public"]["Enums"]["queue_type"]
          wrapup_time: number | null
        }
        Insert: {
          account_id: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          max_wait_time?: number | null
          name: string
          sla_target?: number | null
          strategy?: Database["public"]["Enums"]["queue_strategy"] | null
          type?: Database["public"]["Enums"]["queue_type"]
          wrapup_time?: number | null
        }
        Update: {
          account_id?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          max_wait_time?: number | null
          name?: string
          sla_target?: number | null
          strategy?: Database["public"]["Enums"]["queue_strategy"] | null
          type?: Database["public"]["Enums"]["queue_type"]
          wrapup_time?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "queues_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      rate_limit_buckets: {
        Row: {
          bucket_type: string
          carrier_id: string | null
          created_at: string | null
          id: string
          last_refill_at: string | null
          max_tokens: number
          refill_rate: number
          tokens: number
          trunk_id: string | null
          updated_at: string | null
        }
        Insert: {
          bucket_type?: string
          carrier_id?: string | null
          created_at?: string | null
          id?: string
          last_refill_at?: string | null
          max_tokens?: number
          refill_rate?: number
          tokens?: number
          trunk_id?: string | null
          updated_at?: string | null
        }
        Update: {
          bucket_type?: string
          carrier_id?: string | null
          created_at?: string | null
          id?: string
          last_refill_at?: string | null
          max_tokens?: number
          refill_rate?: number
          tokens?: number
          trunk_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rate_limit_buckets_carrier_id_fkey"
            columns: ["carrier_id"]
            isOneToOne: true
            referencedRelation: "telephony_carriers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rate_limit_buckets_trunk_id_fkey"
            columns: ["trunk_id"]
            isOneToOne: true
            referencedRelation: "trunk_config"
            referencedColumns: ["id"]
          },
        ]
      }
      recordings: {
        Row: {
          call_id: string
          created_at: string | null
          duration: number | null
          file_size: number | null
          file_url: string
          id: string
        }
        Insert: {
          call_id: string
          created_at?: string | null
          duration?: number | null
          file_size?: number | null
          file_url: string
          id?: string
        }
        Update: {
          call_id?: string
          created_at?: string | null
          duration?: number | null
          file_size?: number | null
          file_url?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recordings_call_id_fkey"
            columns: ["call_id"]
            isOneToOne: false
            referencedRelation: "calls"
            referencedColumns: ["id"]
          },
        ]
      }
      route_health: {
        Row: {
          acd: number | null
          asr: number | null
          carrier_id: string | null
          connected_calls: number | null
          cooldown_until: string | null
          created_at: string | null
          failed_calls: number | null
          health_score: number | null
          id: string
          is_degraded: boolean | null
          last_failure_at: string | null
          last_success_at: string | null
          no_rtp_count: number | null
          pdd: number | null
          timeout_count: number | null
          total_calls: number | null
          trunk_id: string | null
          updated_at: string | null
        }
        Insert: {
          acd?: number | null
          asr?: number | null
          carrier_id?: string | null
          connected_calls?: number | null
          cooldown_until?: string | null
          created_at?: string | null
          failed_calls?: number | null
          health_score?: number | null
          id?: string
          is_degraded?: boolean | null
          last_failure_at?: string | null
          last_success_at?: string | null
          no_rtp_count?: number | null
          pdd?: number | null
          timeout_count?: number | null
          total_calls?: number | null
          trunk_id?: string | null
          updated_at?: string | null
        }
        Update: {
          acd?: number | null
          asr?: number | null
          carrier_id?: string | null
          connected_calls?: number | null
          cooldown_until?: string | null
          created_at?: string | null
          failed_calls?: number | null
          health_score?: number | null
          id?: string
          is_degraded?: boolean | null
          last_failure_at?: string | null
          last_success_at?: string | null
          no_rtp_count?: number | null
          pdd?: number | null
          timeout_count?: number | null
          total_calls?: number | null
          trunk_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "route_health_carrier_id_fkey"
            columns: ["carrier_id"]
            isOneToOne: true
            referencedRelation: "telephony_carriers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "route_health_trunk_id_fkey"
            columns: ["trunk_id"]
            isOneToOne: true
            referencedRelation: "trunk_config"
            referencedColumns: ["id"]
          },
        ]
      }
      scripts: {
        Row: {
          account_id: string
          created_at: string | null
          id: string
          is_active: boolean | null
          name: string
          steps_json: Json
          updated_at: string | null
        }
        Insert: {
          account_id: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          steps_json?: Json
          updated_at?: string | null
        }
        Update: {
          account_id?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          steps_json?: Json
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "scripts_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      sensitive_action_logs: {
        Row: {
          account_id: string | null
          action: string
          created_at: string | null
          error_message: string | null
          id: string
          ip_address: unknown
          payload: Json | null
          resource_id: string | null
          resource_type: string | null
          success: boolean | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          account_id?: string | null
          action: string
          created_at?: string | null
          error_message?: string | null
          id?: string
          ip_address?: unknown
          payload?: Json | null
          resource_id?: string | null
          resource_type?: string | null
          success?: boolean | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          account_id?: string | null
          action?: string
          created_at?: string | null
          error_message?: string | null
          id?: string
          ip_address?: unknown
          payload?: Json | null
          resource_id?: string | null
          resource_type?: string | null
          success?: boolean | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      sip_webrtc_logs: {
        Row: {
          account_id: string
          call_id: string | null
          carrier_id: string | null
          category: string
          created_at: string | null
          error_code: string | null
          error_description: string | null
          ice_candidate: string | null
          ice_state: string | null
          id: string
          log_level: string
          message: string
          metadata_json: Json | null
          remote_address: string | null
          sdp_content: string | null
          sdp_type: string | null
          session_id: string | null
          sip_call_id: string | null
          sip_from: string | null
          sip_method: string | null
          sip_status_code: number | null
          sip_status_text: string | null
          sip_to: string | null
          stack_trace: string | null
          trunk_id: string | null
          user_agent: string | null
        }
        Insert: {
          account_id: string
          call_id?: string | null
          carrier_id?: string | null
          category: string
          created_at?: string | null
          error_code?: string | null
          error_description?: string | null
          ice_candidate?: string | null
          ice_state?: string | null
          id?: string
          log_level?: string
          message: string
          metadata_json?: Json | null
          remote_address?: string | null
          sdp_content?: string | null
          sdp_type?: string | null
          session_id?: string | null
          sip_call_id?: string | null
          sip_from?: string | null
          sip_method?: string | null
          sip_status_code?: number | null
          sip_status_text?: string | null
          sip_to?: string | null
          stack_trace?: string | null
          trunk_id?: string | null
          user_agent?: string | null
        }
        Update: {
          account_id?: string
          call_id?: string | null
          carrier_id?: string | null
          category?: string
          created_at?: string | null
          error_code?: string | null
          error_description?: string | null
          ice_candidate?: string | null
          ice_state?: string | null
          id?: string
          log_level?: string
          message?: string
          metadata_json?: Json | null
          remote_address?: string | null
          sdp_content?: string | null
          sdp_type?: string | null
          session_id?: string | null
          sip_call_id?: string | null
          sip_from?: string | null
          sip_method?: string | null
          sip_status_code?: number | null
          sip_status_text?: string | null
          sip_to?: string | null
          stack_trace?: string | null
          trunk_id?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sip_webrtc_logs_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sip_webrtc_logs_call_id_fkey"
            columns: ["call_id"]
            isOneToOne: false
            referencedRelation: "calls"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sip_webrtc_logs_carrier_id_fkey"
            columns: ["carrier_id"]
            isOneToOne: false
            referencedRelation: "telephony_carriers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sip_webrtc_logs_trunk_id_fkey"
            columns: ["trunk_id"]
            isOneToOne: false
            referencedRelation: "trunk_config"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          account_id: string
          created_at: string | null
          description: string | null
          id: string
          name: string
        }
        Insert: {
          account_id: string
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
        }
        Update: {
          account_id?: string
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "teams_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      telephony_carriers: {
        Row: {
          account_id: string
          config_json: Json
          cost_per_minute: number | null
          created_at: string | null
          id: string
          is_active: boolean | null
          max_concurrent_calls: number | null
          name: string
          priority: number | null
          type: Database["public"]["Enums"]["carrier_type"]
          updated_at: string | null
          webhook_url: string | null
        }
        Insert: {
          account_id: string
          config_json?: Json
          cost_per_minute?: number | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          max_concurrent_calls?: number | null
          name: string
          priority?: number | null
          type: Database["public"]["Enums"]["carrier_type"]
          updated_at?: string | null
          webhook_url?: string | null
        }
        Update: {
          account_id?: string
          config_json?: Json
          cost_per_minute?: number | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          max_concurrent_calls?: number | null
          name?: string
          priority?: number | null
          type?: Database["public"]["Enums"]["carrier_type"]
          updated_at?: string | null
          webhook_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "telephony_carriers_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      trunk_config: {
        Row: {
          carrier_id: string
          codecs_allowed: string[] | null
          cps_window_seconds: number | null
          created_at: string | null
          current_cps: number | null
          dtmf_mode: string | null
          id: string
          max_cps: number | null
          min_se_seconds: number | null
          name: string
          nat_traversal_enabled: boolean | null
          session_expires_seconds: number | null
          session_timers_enabled: boolean | null
          srtp_enabled: boolean | null
          tls_enabled: boolean | null
          topology_hiding: boolean | null
          updated_at: string | null
        }
        Insert: {
          carrier_id: string
          codecs_allowed?: string[] | null
          cps_window_seconds?: number | null
          created_at?: string | null
          current_cps?: number | null
          dtmf_mode?: string | null
          id?: string
          max_cps?: number | null
          min_se_seconds?: number | null
          name: string
          nat_traversal_enabled?: boolean | null
          session_expires_seconds?: number | null
          session_timers_enabled?: boolean | null
          srtp_enabled?: boolean | null
          tls_enabled?: boolean | null
          topology_hiding?: boolean | null
          updated_at?: string | null
        }
        Update: {
          carrier_id?: string
          codecs_allowed?: string[] | null
          cps_window_seconds?: number | null
          created_at?: string | null
          current_cps?: number | null
          dtmf_mode?: string | null
          id?: string
          max_cps?: number | null
          min_se_seconds?: number | null
          name?: string
          nat_traversal_enabled?: boolean | null
          session_expires_seconds?: number | null
          session_timers_enabled?: boolean | null
          srtp_enabled?: boolean | null
          tls_enabled?: boolean | null
          topology_hiding?: boolean | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "trunk_config_carrier_id_fkey"
            columns: ["carrier_id"]
            isOneToOne: false
            referencedRelation: "telephony_carriers"
            referencedColumns: ["id"]
          },
        ]
      }
      trunk_limits: {
        Row: {
          burst_limit: number | null
          created_at: string | null
          current_usage: number | null
          id: string
          is_active: boolean | null
          last_throttle_at: string | null
          limit_scope_id: string | null
          limit_scope_pattern: string | null
          limit_type: string
          max_cps: number
          throttle_duration_seconds: number | null
          trunk_id: string
        }
        Insert: {
          burst_limit?: number | null
          created_at?: string | null
          current_usage?: number | null
          id?: string
          is_active?: boolean | null
          last_throttle_at?: string | null
          limit_scope_id?: string | null
          limit_scope_pattern?: string | null
          limit_type: string
          max_cps?: number
          throttle_duration_seconds?: number | null
          trunk_id: string
        }
        Update: {
          burst_limit?: number | null
          created_at?: string | null
          current_usage?: number | null
          id?: string
          is_active?: boolean | null
          last_throttle_at?: string | null
          limit_scope_id?: string | null
          limit_scope_pattern?: string | null
          limit_type?: string
          max_cps?: number
          throttle_duration_seconds?: number | null
          trunk_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trunk_limits_trunk_id_fkey"
            columns: ["trunk_id"]
            isOneToOne: false
            referencedRelation: "trunk_config"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      webhook_deliveries: {
        Row: {
          attempts: number | null
          created_at: string | null
          event_type: string
          id: string
          last_attempt_at: string | null
          payload: Json | null
          response_code: number | null
          status: string | null
          webhook_id: string
        }
        Insert: {
          attempts?: number | null
          created_at?: string | null
          event_type: string
          id?: string
          last_attempt_at?: string | null
          payload?: Json | null
          response_code?: number | null
          status?: string | null
          webhook_id: string
        }
        Update: {
          attempts?: number | null
          created_at?: string | null
          event_type?: string
          id?: string
          last_attempt_at?: string | null
          payload?: Json | null
          response_code?: number | null
          status?: string | null
          webhook_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "webhook_deliveries_webhook_id_fkey"
            columns: ["webhook_id"]
            isOneToOne: false
            referencedRelation: "webhooks"
            referencedColumns: ["id"]
          },
        ]
      }
      webhooks: {
        Row: {
          account_id: string
          created_at: string | null
          events: string[] | null
          id: string
          is_active: boolean | null
          secret_key: string | null
          url: string
        }
        Insert: {
          account_id: string
          created_at?: string | null
          events?: string[] | null
          id?: string
          is_active?: boolean | null
          secret_key?: string | null
          url: string
        }
        Update: {
          account_id?: string
          created_at?: string | null
          events?: string[] | null
          id?: string
          is_active?: boolean | null
          secret_key?: string | null
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "webhooks_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      webrtc_sessions: {
        Row: {
          account_id: string
          agent_id: string | null
          call_id: string | null
          codec_audio: string | null
          codec_video: string | null
          connected_at: string | null
          created_at: string | null
          disconnected_at: string | null
          ice_connection_state: string | null
          id: string
          local_sdp: string | null
          provider: string
          remote_sdp: string | null
          session_id: string
          signaling_state: string | null
          status: string | null
        }
        Insert: {
          account_id: string
          agent_id?: string | null
          call_id?: string | null
          codec_audio?: string | null
          codec_video?: string | null
          connected_at?: string | null
          created_at?: string | null
          disconnected_at?: string | null
          ice_connection_state?: string | null
          id?: string
          local_sdp?: string | null
          provider?: string
          remote_sdp?: string | null
          session_id: string
          signaling_state?: string | null
          status?: string | null
        }
        Update: {
          account_id?: string
          agent_id?: string | null
          call_id?: string | null
          codec_audio?: string | null
          codec_video?: string | null
          connected_at?: string | null
          created_at?: string | null
          disconnected_at?: string | null
          ice_connection_state?: string | null
          id?: string
          local_sdp?: string | null
          provider?: string
          remote_sdp?: string | null
          session_id?: string
          signaling_state?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "webrtc_sessions_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "webrtc_sessions_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "webrtc_sessions_call_id_fkey"
            columns: ["call_id"]
            isOneToOne: false
            referencedRelation: "calls"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      consume_token: { Args: { p_trunk_id: string }; Returns: boolean }
      decrypt_api_key: {
        Args: { encrypted_key: string; encryption_key: string }
        Returns: string
      }
      encrypt_api_key: {
        Args: { encryption_key: string; plain_key: string }
        Returns: string
      }
      get_user_account_id: { Args: { _user_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      process_expired_timers: {
        Args: never
        Returns: {
          attempt_id: string
          current_state: string
          timer_id: string
          timer_type: string
        }[]
      }
      reserve_leads_for_campaign: {
        Args: { p_account_id: string; p_campaign_id: string; p_limit: number }
        Returns: {
          lead_id: string
          phone: string
        }[]
      }
    }
    Enums: {
      adaptive_method: "HARD_LIMIT" | "TAPERED" | "AVERAGE"
      agent_status: "READY" | "BUSY" | "WRAPUP" | "PAUSE" | "OFFLINE"
      app_role: "admin" | "supervisor" | "qa" | "agent" | "analyst"
      call_direction: "INBOUND" | "OUTBOUND"
      call_state:
        | "QUEUED"
        | "ORIGINATING"
        | "RINGING"
        | "EARLY_MEDIA"
        | "ANSWERED"
        | "BRIDGED"
        | "PLAYING"
        | "RECORDING"
        | "TRANSFER_PENDING"
        | "TRANSFERRED"
        | "ENDED"
        | "FAILED"
        | "NO_RTP"
        | "ABANDONED"
        | "TIMEOUT"
        | "CANCELLED"
      call_status:
        | "QUEUED"
        | "RINGING"
        | "CONNECTED"
        | "ON_HOLD"
        | "TRANSFERRING"
        | "ENDED"
        | "FAILED"
        | "ABANDONED"
      campaign_status: "DRAFT" | "ACTIVE" | "PAUSED" | "COMPLETED"
      carrier_type:
        | "telnyx"
        | "jambonz"
        | "sip_generic"
        | "sip_webrtc"
        | "twilio"
        | "vonage"
        | "plivo"
        | "bandwidth"
        | "sinch"
        | "infobip"
        | "zenvia"
        | "totalvoice"
        | "asterisk_ami"
        | "freeswitch_esl"
        | "opensips"
        | "kamailio"
        | "gsvoip"
        | "mundivox"
        | "directcall"
      dial_mode: "PREVIEW" | "POWER" | "PREDICTIVE"
      disposition_category:
        | "POSITIVE"
        | "NEGATIVE"
        | "NEUTRAL"
        | "CALLBACK"
        | "DNC"
      queue_strategy: "LONGEST_IDLE" | "ROUND_ROBIN" | "SKILL_WEIGHTED"
      queue_type: "INBOUND" | "OUTBOUND" | "CALLBACK" | "AI_TRIAGE"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      adaptive_method: ["HARD_LIMIT", "TAPERED", "AVERAGE"],
      agent_status: ["READY", "BUSY", "WRAPUP", "PAUSE", "OFFLINE"],
      app_role: ["admin", "supervisor", "qa", "agent", "analyst"],
      call_direction: ["INBOUND", "OUTBOUND"],
      call_state: [
        "QUEUED",
        "ORIGINATING",
        "RINGING",
        "EARLY_MEDIA",
        "ANSWERED",
        "BRIDGED",
        "PLAYING",
        "RECORDING",
        "TRANSFER_PENDING",
        "TRANSFERRED",
        "ENDED",
        "FAILED",
        "NO_RTP",
        "ABANDONED",
        "TIMEOUT",
        "CANCELLED",
      ],
      call_status: [
        "QUEUED",
        "RINGING",
        "CONNECTED",
        "ON_HOLD",
        "TRANSFERRING",
        "ENDED",
        "FAILED",
        "ABANDONED",
      ],
      campaign_status: ["DRAFT", "ACTIVE", "PAUSED", "COMPLETED"],
      carrier_type: [
        "telnyx",
        "jambonz",
        "sip_generic",
        "sip_webrtc",
        "twilio",
        "vonage",
        "plivo",
        "bandwidth",
        "sinch",
        "infobip",
        "zenvia",
        "totalvoice",
        "asterisk_ami",
        "freeswitch_esl",
        "opensips",
        "kamailio",
        "gsvoip",
        "mundivox",
        "directcall",
      ],
      dial_mode: ["PREVIEW", "POWER", "PREDICTIVE"],
      disposition_category: [
        "POSITIVE",
        "NEGATIVE",
        "NEUTRAL",
        "CALLBACK",
        "DNC",
      ],
      queue_strategy: ["LONGEST_IDLE", "ROUND_ROBIN", "SKILL_WEIGHTED"],
      queue_type: ["INBOUND", "OUTBOUND", "CALLBACK", "AI_TRIAGE"],
    },
  },
} as const
