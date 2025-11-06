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
      servicenow_incidents: {
        Row: {
          id: string
          incident_number: string | null
          sys_id: string | null
          short_description: string
          description: string | null
          caller_id: string | null
          assigned_to: string | null
          assignment_group: string | null
          category: string | null
          subcategory: string | null
          impact: string | null
          urgency: string | null
          priority: string | null
          state: string | null
          work_notes: string | null
          comments_and_work_notes: string | null
          close_code: string | null
          close_notes: string | null
          resolution_code: string | null
          resolution_notes: string | null
          opened_at: string | null
          resolved_at: string | null
          closed_at: string | null
          sys_created_on: string
          sys_updated_on: string
          sys_created_by: string | null
          sys_updated_by: string | null
          sys_mod_count: number | null
          business_service: string | null
          cmdb_ci: string | null
          legacy_ticket_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          incident_number?: string | null
          sys_id?: string | null
          short_description: string
          description?: string | null
          caller_id?: string | null
          assigned_to?: string | null
          assignment_group?: string | null
          category?: string | null
          subcategory?: string | null
          impact?: string | null
          urgency?: string | null
          priority?: string | null
          state?: string | null
          work_notes?: string | null
          comments_and_work_notes?: string | null
          close_code?: string | null
          close_notes?: string | null
          resolution_code?: string | null
          resolution_notes?: string | null
          opened_at?: string | null
          resolved_at?: string | null
          closed_at?: string | null
          sys_created_on?: string
          sys_updated_on?: string
          sys_created_by?: string | null
          sys_updated_by?: string | null
          sys_mod_count?: number | null
          business_service?: string | null
          cmdb_ci?: string | null
          legacy_ticket_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          incident_number?: string | null
          sys_id?: string | null
          short_description?: string
          description?: string | null
          caller_id?: string | null
          assigned_to?: string | null
          assignment_group?: string | null
          category?: string | null
          subcategory?: string | null
          impact?: string | null
          urgency?: string | null
          priority?: string | null
          state?: string | null
          work_notes?: string | null
          comments_and_work_notes?: string | null
          close_code?: string | null
          close_notes?: string | null
          resolution_code?: string | null
          resolution_notes?: string | null
          opened_at?: string | null
          resolved_at?: string | null
          closed_at?: string | null
          sys_created_on?: string
          sys_updated_on?: string
          sys_created_by?: string | null
          sys_updated_by?: string | null
          sys_mod_count?: number | null
          business_service?: string | null
          cmdb_ci?: string | null
          legacy_ticket_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      tickets: {
        Row: {
          assignment_group: string | null
          category: string | null
          created_at: string
          description: string | null
          id: string
          opened_at: string
          parent_id: string | null
          priority: string
          related_ticket_id: string | null
          resolved_at: string | null
          service: string | null
          short_desc: string
          sla_met: boolean | null
          status: string
          ticket_id: string
          type: string
          updated_at: string
        }
        Insert: {
          assignment_group?: string | null
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          opened_at?: string
          parent_id?: string | null
          priority: string
          related_ticket_id?: string | null
          resolved_at?: string | null
          service?: string | null
          short_desc: string
          sla_met?: boolean | null
          status: string
          ticket_id: string
          type: string
          updated_at?: string
        }
        Update: {
          assignment_group?: string | null
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          opened_at?: string
          parent_id?: string | null
          priority?: string
          related_ticket_id?: string | null
          resolved_at?: string | null
          service?: string | null
          short_desc?: string
          sla_met?: boolean | null
          status?: string
          ticket_id?: string
          type?: string
          updated_at?: string
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
