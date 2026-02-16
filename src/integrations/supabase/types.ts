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
      activity_log: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          entity_id: string | null
          entity_type: string | null
          id: string
          metadata: Json | null
          org_id: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          metadata?: Json | null
          org_id: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          metadata?: Json | null
          org_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_log_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          created_at: string
          id: string
          name: string
          settings: Json | null
          slug: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          settings?: Json | null
          slug?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          settings?: Json | null
          slug?: string | null
        }
        Relationships: []
      }
      compliance_plans: {
        Row: {
          company_id: string
          created_at: string
          id: string
          report_id: string
          status: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          report_id: string
          status?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          report_id?: string
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "compliance_plans_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compliance_plans_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "reports"
            referencedColumns: ["id"]
          },
        ]
      }
      compliance_steps: {
        Row: {
          assigned_to: string | null
          created_at: string
          description: string | null
          due_date: string | null
          id: string
          is_completed: boolean
          memo: string | null
          plan_id: string
          step_number: number
          title: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          is_completed?: boolean
          memo?: string | null
          plan_id: string
          step_number: number
          title: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          is_completed?: boolean
          memo?: string | null
          plan_id?: string
          step_number?: number
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "compliance_steps_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "compliance_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      controls: {
        Row: {
          attestation: string | null
          attested_at: string | null
          attested_by: string | null
          control_ref: string
          created_at: string
          description: string | null
          framework: string
          id: string
          org_id: string
          status: Database["public"]["Enums"]["control_status"]
          title: string
          tool_id: string | null
          updated_at: string
        }
        Insert: {
          attestation?: string | null
          attested_at?: string | null
          attested_by?: string | null
          control_ref: string
          created_at?: string
          description?: string | null
          framework: string
          id?: string
          org_id: string
          status?: Database["public"]["Enums"]["control_status"]
          title: string
          tool_id?: string | null
          updated_at?: string
        }
        Update: {
          attestation?: string | null
          attested_at?: string | null
          attested_by?: string | null
          control_ref?: string
          created_at?: string
          description?: string | null
          framework?: string
          id?: string
          org_id?: string
          status?: Database["public"]["Enums"]["control_status"]
          title?: string
          tool_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "controls_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "controls_tool_id_fkey"
            columns: ["tool_id"]
            isOneToOne: false
            referencedRelation: "tools"
            referencedColumns: ["id"]
          },
        ]
      }
      members: {
        Row: {
          created_at: string
          id: string
          org_id: string
          role: Database["public"]["Enums"]["member_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          org_id: string
          role?: Database["public"]["Enums"]["member_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          org_id?: string
          role?: Database["public"]["Enums"]["member_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "members_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          company_id: string
          created_at: string
          full_name: string
          id: string
          user_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          full_name: string
          id?: string
          user_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          full_name?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      reports: {
        Row: {
          analysis: Json | null
          company_id: string | null
          created_at: string
          id: string
          search_data: Json | null
          service_name: string
          status: string
          test_bool: boolean | null
          trust_score: number | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          analysis?: Json | null
          company_id?: string | null
          created_at?: string
          id?: string
          search_data?: Json | null
          service_name: string
          status?: string
          test_bool?: boolean | null
          trust_score?: number | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          analysis?: Json | null
          company_id?: string | null
          created_at?: string
          id?: string
          search_data?: Json | null
          service_name?: string
          status?: string
          test_bool?: boolean | null
          trust_score?: number | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reports_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      requests: {
        Row: {
          created_at: string
          id: string
          notes: string | null
          org_id: string
          requester_id: string
          reviewed_at: string | null
          reviewed_by: string | null
          submission_data: Json | null
          tool_id: string | null
          updated_at: string
          workflow_stage: Database["public"]["Enums"]["workflow_stage"]
        }
        Insert: {
          created_at?: string
          id?: string
          notes?: string | null
          org_id: string
          requester_id: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          submission_data?: Json | null
          tool_id?: string | null
          updated_at?: string
          workflow_stage?: Database["public"]["Enums"]["workflow_stage"]
        }
        Update: {
          created_at?: string
          id?: string
          notes?: string | null
          org_id?: string
          requester_id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          submission_data?: Json | null
          tool_id?: string | null
          updated_at?: string
          workflow_stage?: Database["public"]["Enums"]["workflow_stage"]
        }
        Relationships: [
          {
            foreignKeyName: "requests_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "requests_tool_id_fkey"
            columns: ["tool_id"]
            isOneToOne: false
            referencedRelation: "tools"
            referencedColumns: ["id"]
          },
        ]
      }
      tools: {
        Row: {
          category: string | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          name: string
          org_id: string
          report_id: string | null
          risk_level: Database["public"]["Enums"]["risk_level"] | null
          status: Database["public"]["Enums"]["tool_status"]
          updated_at: string
          url: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name: string
          org_id: string
          report_id?: string | null
          risk_level?: Database["public"]["Enums"]["risk_level"] | null
          status?: Database["public"]["Enums"]["tool_status"]
          updated_at?: string
          url?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name?: string
          org_id?: string
          report_id?: string | null
          risk_level?: Database["public"]["Enums"]["risk_level"] | null
          status?: Database["public"]["Enums"]["tool_status"]
          updated_at?: string
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tools_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tools_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "reports"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      vendors: {
        Row: {
          created_at: string
          id: string
          name: string
          org_id: string
          research_data: Json | null
          updated_at: string
          website: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          org_id: string
          research_data?: Json | null
          updated_at?: string
          website?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          org_id?: string
          research_data?: Json | null
          updated_at?: string
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vendors_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_member_role: {
        Args: { _org_id: string; _user_id: string }
        Returns: Database["public"]["Enums"]["member_role"]
      }
      get_user_company_id: { Args: { _user_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_org_member: {
        Args: { _org_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
      control_status: "compliant" | "non_compliant" | "not_applicable"
      member_role: "owner" | "admin" | "member"
      risk_level: "high" | "medium" | "low"
      tool_status: "pending" | "approved" | "rejected" | "sunset"
      workflow_stage: "draft" | "review" | "approved" | "rejected"
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
      control_status: ["compliant", "non_compliant", "not_applicable"],
      member_role: ["owner", "admin", "member"],
      risk_level: ["high", "medium", "low"],
      tool_status: ["pending", "approved", "rejected", "sunset"],
      workflow_stage: ["draft", "review", "approved", "rejected"],
    },
  },
} as const
