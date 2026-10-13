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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      applications: {
        Row: {
          canceled_at: string | null
          created_at: string
          decided_at: string | null
          id: number
          socialing_id: number
          status: Database["public"]["Enums"]["application_status"]
          user_id: string
        }
        Insert: {
          canceled_at?: string | null
          created_at?: string
          decided_at?: string | null
          id?: never
          socialing_id: number
          status: Database["public"]["Enums"]["application_status"]
          user_id: string
        }
        Update: {
          canceled_at?: string | null
          created_at?: string
          decided_at?: string | null
          id?: never
          socialing_id?: number
          status?: Database["public"]["Enums"]["application_status"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "applications_socialing_id_fkey"
            columns: ["socialing_id"]
            isOneToOne: false
            referencedRelation: "socialings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "applications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          id: number
          is_party: boolean
          name: string
          slug: string
          sort_order: number
        }
        Insert: {
          id?: never
          is_party?: boolean
          name: string
          slug: string
          sort_order: number
        }
        Update: {
          id?: never
          is_party?: boolean
          name?: string
          slug?: string
          sort_order?: number
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          id: string
          nickname: string
          role: Database["public"]["Enums"]["profile_role"]
        }
        Insert: {
          created_at?: string
          id: string
          nickname: string
          role?: Database["public"]["Enums"]["profile_role"]
        }
        Update: {
          created_at?: string
          id?: string
          nickname?: string
          role?: Database["public"]["Enums"]["profile_role"]
        }
        Relationships: []
      }
      regions: {
        Row: {
          code: string
          id: number
          sido: string
          sigungu: string
        }
        Insert: {
          code: string
          id?: never
          sido: string
          sigungu: string
        }
        Update: {
          code?: string
          id?: never
          sido?: string
          sigungu?: string
        }
        Relationships: []
      }
      review_checks: {
        Row: {
          content_match: boolean
          extra_money: boolean
          members_match: boolean
          review_id: number
        }
        Insert: {
          content_match: boolean
          extra_money: boolean
          members_match: boolean
          review_id: number
        }
        Update: {
          content_match?: boolean
          extra_money?: boolean
          members_match?: boolean
          review_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "review_checks_review_id_fkey"
            columns: ["review_id"]
            isOneToOne: true
            referencedRelation: "reviews"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          body: string
          created_at: string
          id: number
          photo_path: string | null
          socialing_id: number
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: never
          photo_path?: string | null
          socialing_id: number
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: never
          photo_path?: string | null
          socialing_id?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_socialing_id_fkey"
            columns: ["socialing_id"]
            isOneToOne: false
            referencedRelation: "socialings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      socialings: {
        Row: {
          apply_deadline_at: string
          approval_criteria: string | null
          canceled_at: string | null
          capacity: number
          category_id: number
          completed_at: string | null
          confirmed_at: string | null
          cover_photo_path: string | null
          created_at: string
          description: string
          fee: number
          has_alcohol: boolean
          host_id: string
          id: number
          join_type: Database["public"]["Enums"]["join_type"]
          staff_count: number
          starts_at: string
          status: Database["public"]["Enums"]["socialing_status"]
          title: string
          updated_at: string
          venue_id: number
        }
        Insert: {
          apply_deadline_at: string
          approval_criteria?: string | null
          canceled_at?: string | null
          capacity: number
          category_id: number
          completed_at?: string | null
          confirmed_at?: string | null
          cover_photo_path?: string | null
          created_at?: string
          description: string
          fee: number
          has_alcohol: boolean
          host_id: string
          id?: never
          join_type: Database["public"]["Enums"]["join_type"]
          staff_count?: number
          starts_at: string
          status?: Database["public"]["Enums"]["socialing_status"]
          title: string
          updated_at?: string
          venue_id: number
        }
        Update: {
          apply_deadline_at?: string
          approval_criteria?: string | null
          canceled_at?: string | null
          capacity?: number
          category_id?: number
          completed_at?: string | null
          confirmed_at?: string | null
          cover_photo_path?: string | null
          created_at?: string
          description?: string
          fee?: number
          has_alcohol?: boolean
          host_id?: string
          id?: never
          join_type?: Database["public"]["Enums"]["join_type"]
          staff_count?: number
          starts_at?: string
          status?: Database["public"]["Enums"]["socialing_status"]
          title?: string
          updated_at?: string
          venue_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "socialings_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "socialings_host_id_fkey"
            columns: ["host_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "socialings_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      venues: {
        Row: {
          address_text: string | null
          id: number
          name: string
          region_id: number
          type: Database["public"]["Enums"]["venue_type"]
        }
        Insert: {
          address_text?: string | null
          id?: never
          name: string
          region_id: number
          type: Database["public"]["Enums"]["venue_type"]
        }
        Update: {
          address_text?: string | null
          id?: never
          name?: string
          region_id?: number
          type?: Database["public"]["Enums"]["venue_type"]
        }
        Relationships: [
          {
            foreignKeyName: "venues_region_id_fkey"
            columns: ["region_id"]
            isOneToOne: false
            referencedRelation: "regions"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      apply_to_socialing: {
        Args: { p_socialing_id: number }
        Returns: {
          canceled_at: string | null
          created_at: string
          decided_at: string | null
          id: number
          socialing_id: number
          status: Database["public"]["Enums"]["application_status"]
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "applications"
          isOneToOne: true
          isSetofReturn: false
        }
      }
    }
    Enums: {
      application_status: "pending" | "accepted" | "rejected" | "canceled"
      join_type: "first_come" | "approval"
      profile_role: "member" | "host" | "admin"
      socialing_status: "recruiting" | "confirmed" | "completed" | "canceled"
      venue_type: "branch" | "external"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      application_status: ["pending", "accepted", "rejected", "canceled"],
      join_type: ["first_come", "approval"],
      profile_role: ["member", "host", "admin"],
      socialing_status: ["recruiting", "confirmed", "completed", "canceled"],
      venue_type: ["branch", "external"],
    },
  },
} as const
