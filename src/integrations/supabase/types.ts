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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      admin_audit_logs: {
        Row: {
          action: string
          admin_user_id: string
          created_at: string | null
          details: Json | null
          id: string
          ip_address: string | null
          target_id: string | null
          target_type: string | null
          target_user_id: string | null
          user_agent: string | null
        }
        Insert: {
          action: string
          admin_user_id: string
          created_at?: string | null
          details?: Json | null
          id?: string
          ip_address?: string | null
          target_id?: string | null
          target_type?: string | null
          target_user_id?: string | null
          user_agent?: string | null
        }
        Update: {
          action?: string
          admin_user_id?: string
          created_at?: string | null
          details?: Json | null
          id?: string
          ip_address?: string | null
          target_id?: string | null
          target_type?: string | null
          target_user_id?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
      plan_prices: {
        Row: {
          active: boolean | null
          amount_cents: number
          created_at: string | null
          currency: string
          description: string | null
          features: Json | null
          id: string
          plan_type: string
          updated_at: string | null
        }
        Insert: {
          active?: boolean | null
          amount_cents: number
          created_at?: string | null
          currency?: string
          description?: string | null
          features?: Json | null
          id?: string
          plan_type: string
          updated_at?: string | null
        }
        Update: {
          active?: boolean | null
          amount_cents?: number
          created_at?: string | null
          currency?: string
          description?: string | null
          features?: Json | null
          id?: string
          plan_type?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          cpf: string | null
          cpf_hash: string | null
          created_at: string | null
          current_level: number | null
          earned_days: number | null
          full_name: string | null
          has_seen_welcome: boolean | null
          id: string
          level_updated_at: string | null
          phone: string | null
          referral_code: string | null
          referred_by: string | null
          service_type: string | null
          total_referrals: number | null
          updated_at: string | null
        }
        Insert: {
          cpf?: string | null
          cpf_hash?: string | null
          created_at?: string | null
          current_level?: number | null
          earned_days?: number | null
          full_name?: string | null
          has_seen_welcome?: boolean | null
          id: string
          level_updated_at?: string | null
          phone?: string | null
          referral_code?: string | null
          referred_by?: string | null
          service_type?: string | null
          total_referrals?: number | null
          updated_at?: string | null
        }
        Update: {
          cpf?: string | null
          cpf_hash?: string | null
          created_at?: string | null
          current_level?: number | null
          earned_days?: number | null
          full_name?: string | null
          has_seen_welcome?: boolean | null
          id?: string
          level_updated_at?: string | null
          phone?: string | null
          referral_code?: string | null
          referred_by?: string | null
          service_type?: string | null
          total_referrals?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      referral_history: {
        Row: {
          created_at: string | null
          id: string
          referred_id: string
          referred_name: string | null
          referrer_id: string
          status: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          referred_id: string
          referred_name?: string | null
          referrer_id: string
          status?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          referred_id?: string
          referred_name?: string | null
          referrer_id?: string
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "referral_history_referred_id_fkey"
            columns: ["referred_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referral_history_referrer_id_fkey"
            columns: ["referrer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      tickets: {
        Row: {
          ai_confidence_score: number | null
          ai_processed: boolean | null
          ai_processed_at: string | null
          ai_sentiment: string | null
          ai_suggested_category: string | null
          ai_summary: string | null
          category: string | null
          closed_at: string | null
          created_at: string | null
          description: string
          email_sent: boolean | null
          email_sent_at: string | null
          email_template_id: string | null
          id: string
          priority: string
          resolved_at: string | null
          status: string
          subject: string
          synced_with_zendesk: boolean | null
          updated_at: string | null
          user_id: string
          zendesk_ticket_id: string | null
        }
        Insert: {
          ai_confidence_score?: number | null
          ai_processed?: boolean | null
          ai_processed_at?: string | null
          ai_sentiment?: string | null
          ai_suggested_category?: string | null
          ai_summary?: string | null
          category?: string | null
          closed_at?: string | null
          created_at?: string | null
          description: string
          email_sent?: boolean | null
          email_sent_at?: string | null
          email_template_id?: string | null
          id?: string
          priority?: string
          resolved_at?: string | null
          status?: string
          subject: string
          synced_with_zendesk?: boolean | null
          updated_at?: string | null
          user_id: string
          zendesk_ticket_id?: string | null
        }
        Update: {
          ai_confidence_score?: number | null
          ai_processed?: boolean | null
          ai_processed_at?: string | null
          ai_sentiment?: string | null
          ai_suggested_category?: string | null
          ai_summary?: string | null
          category?: string | null
          closed_at?: string | null
          created_at?: string | null
          description?: string
          email_sent?: boolean | null
          email_sent_at?: string | null
          email_template_id?: string | null
          id?: string
          priority?: string
          resolved_at?: string | null
          status?: string
          subject?: string
          synced_with_zendesk?: boolean | null
          updated_at?: string | null
          user_id?: string
          zendesk_ticket_id?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_subscriptions: {
        Row: {
          alert_15_days_sent: boolean | null
          alert_30_days_sent: boolean | null
          alert_7_days_sent: boolean | null
          amount_paid: number | null
          coupon_code: string | null
          created_at: string | null
          currency: string | null
          expires_at: string | null
          id: string
          mercadopago_payment_id: string | null
          paid_at: string | null
          payment_method: string | null
          payment_token: string | null
          plan_type: string
          status: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          alert_15_days_sent?: boolean | null
          alert_30_days_sent?: boolean | null
          alert_7_days_sent?: boolean | null
          amount_paid?: number | null
          coupon_code?: string | null
          created_at?: string | null
          currency?: string | null
          expires_at?: string | null
          id?: string
          mercadopago_payment_id?: string | null
          paid_at?: string | null
          payment_method?: string | null
          payment_token?: string | null
          plan_type: string
          status: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          alert_15_days_sent?: boolean | null
          alert_30_days_sent?: boolean | null
          alert_7_days_sent?: boolean | null
          amount_paid?: number | null
          coupon_code?: string | null
          created_at?: string | null
          currency?: string | null
          expires_at?: string | null
          id?: string
          mercadopago_payment_id?: string | null
          paid_at?: string | null
          payment_method?: string | null
          payment_token?: string | null
          plan_type?: string
          status?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      calculate_referral_level: {
        Args: { total_refs: number }
        Returns: number
      }
      get_active_subscription: {
        Args: { _user_id: string }
        Returns: {
          amount_paid: number
          days_remaining: number
          expires_at: string
          id: string
          payment_method: string
          plan_type: string
          status: string
        }[]
      }
      has_active_subscription: { Args: { _user_id: string }; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      hash_cpf: { Args: { cpf_plain: string }; Returns: string }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      process_referral: {
        Args: {
          _referred_name?: string
          _referred_user_id: string
          _referrer_code: string
        }
        Returns: Json
      }
      verify_cpf_unchanged: {
        Args: { _new_cpf: string; _new_cpf_hash: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
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
      app_role: ["admin", "user"],
    },
  },
} as const
