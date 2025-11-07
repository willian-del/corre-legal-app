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
          full_name: string | null
          id: string
          phone: string | null
          service_type: string | null
          updated_at: string | null
        }
        Insert: {
          cpf?: string | null
          cpf_hash?: string | null
          created_at?: string | null
          full_name?: string | null
          id: string
          phone?: string | null
          service_type?: string | null
          updated_at?: string | null
        }
        Update: {
          cpf?: string | null
          cpf_hash?: string | null
          created_at?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
          service_type?: string | null
          updated_at?: string | null
        }
        Relationships: []
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
      user_subscriptions: {
        Row: {
          alert_15_days_sent: boolean | null
          alert_30_days_sent: boolean | null
          alert_7_days_sent: boolean | null
          amount_paid: number | null
          created_at: string | null
          currency: string | null
          current_period_end: string | null
          current_period_start: string | null
          expires_at: string | null
          id: string
          paid_at: string | null
          payment_method: string | null
          plan_type: string
          status: string
          stripe_customer_id: string | null
          stripe_payment_intent_id: string | null
          stripe_subscription_id: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          alert_15_days_sent?: boolean | null
          alert_30_days_sent?: boolean | null
          alert_7_days_sent?: boolean | null
          amount_paid?: number | null
          created_at?: string | null
          currency?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          expires_at?: string | null
          id?: string
          paid_at?: string | null
          payment_method?: string | null
          plan_type: string
          status: string
          stripe_customer_id?: string | null
          stripe_payment_intent_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          alert_15_days_sent?: boolean | null
          alert_30_days_sent?: boolean | null
          alert_7_days_sent?: boolean | null
          amount_paid?: number | null
          created_at?: string | null
          currency?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          expires_at?: string | null
          id?: string
          paid_at?: string | null
          payment_method?: string | null
          plan_type?: string
          status?: string
          stripe_customer_id?: string | null
          stripe_payment_intent_id?: string | null
          stripe_subscription_id?: string | null
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
      hash_cpf: { Args: { cpf_plain: string }; Returns: string }
      verify_cpf_unchanged: {
        Args: { _new_cpf: string; _new_cpf_hash: string; _user_id: string }
        Returns: boolean
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
    Enums: {},
  },
} as const
