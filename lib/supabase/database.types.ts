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
            referencedRelation: "my_applied_socialings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "applications_socialing_id_fkey"
            columns: ["socialing_id"]
            isOneToOne: false
            referencedRelation: "my_hosted_socialings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "applications_socialing_id_fkey"
            columns: ["socialing_id"]
            isOneToOne: false
            referencedRelation: "socialing_summaries"
            referencedColumns: ["id"]
          },
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
            referencedRelation: "my_applied_socialings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_socialing_id_fkey"
            columns: ["socialing_id"]
            isOneToOne: false
            referencedRelation: "my_hosted_socialings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_socialing_id_fkey"
            columns: ["socialing_id"]
            isOneToOne: false
            referencedRelation: "socialing_summaries"
            referencedColumns: ["id"]
          },
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
      hosted_socialing_applicants: {
        Row: {
          application_id: number | null
          applied_at: string | null
          canceled_at: string | null
          decided_at: string | null
          nickname: string | null
          socialing_id: number | null
          status: Database["public"]["Enums"]["application_status"] | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "applications_socialing_id_fkey"
            columns: ["socialing_id"]
            isOneToOne: false
            referencedRelation: "my_applied_socialings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "applications_socialing_id_fkey"
            columns: ["socialing_id"]
            isOneToOne: false
            referencedRelation: "my_hosted_socialings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "applications_socialing_id_fkey"
            columns: ["socialing_id"]
            isOneToOne: false
            referencedRelation: "socialing_summaries"
            referencedColumns: ["id"]
          },
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
      my_applied_socialings: {
        Row: {
          accepted_count: number | null
          application_id: number | null
          application_status:
            | Database["public"]["Enums"]["application_status"]
            | null
          applied_at: string | null
          apply_deadline_at: string | null
          approval_criteria: string | null
          can_apply: boolean | null
          capacity: number | null
          category_id: number | null
          category_is_party: boolean | null
          category_name: string | null
          category_slug: string | null
          closed_reason: string | null
          cover_photo_path: string | null
          description: string | null
          fee: number | null
          has_alcohol: boolean | null
          has_review: boolean | null
          host_id: string | null
          host_nickname: string | null
          id: number | null
          is_past: boolean | null
          join_type: Database["public"]["Enums"]["join_type"] | null
          region_sido: string | null
          region_sigungu: string | null
          staff_count: number | null
          starts_at: string | null
          status: Database["public"]["Enums"]["socialing_status"] | null
          status_tag: string | null
          title: string | null
          venue_id: number | null
          venue_name: string | null
          venue_type: Database["public"]["Enums"]["venue_type"] | null
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
      my_hosted_socialings: {
        Row: {
          accepted_count: number | null
          apply_deadline_at: string | null
          approval_criteria: string | null
          approve_blocked_reason: string | null
          can_apply: boolean | null
          can_approve: boolean | null
          can_cancel: boolean | null
          can_complete: boolean | null
          can_confirm: boolean | null
          can_decide: boolean | null
          can_edit: boolean | null
          capacity: number | null
          category_id: number | null
          category_is_party: boolean | null
          category_name: string | null
          category_slug: string | null
          closed_count: number | null
          closed_reason: string | null
          complete_blocked_reason: string | null
          confirm_blocked_reason: string | null
          cover_photo_path: string | null
          description: string | null
          fee: number | null
          has_alcohol: boolean | null
          host_id: string | null
          host_nickname: string | null
          id: number | null
          is_past: boolean | null
          join_type: Database["public"]["Enums"]["join_type"] | null
          pending_count: number | null
          region_sido: string | null
          region_sigungu: string | null
          staff_count: number | null
          starts_at: string | null
          status: Database["public"]["Enums"]["socialing_status"] | null
          status_tag: string | null
          title: string | null
          venue_id: number | null
          venue_name: string | null
          venue_type: Database["public"]["Enums"]["venue_type"] | null
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
      socialing_summaries: {
        Row: {
          accepted_count: number | null
          apply_deadline_at: string | null
          approval_criteria: string | null
          can_apply: boolean | null
          capacity: number | null
          category_id: number | null
          category_is_party: boolean | null
          category_name: string | null
          category_slug: string | null
          closed_reason: string | null
          cover_photo_path: string | null
          description: string | null
          fee: number | null
          has_alcohol: boolean | null
          host_id: string | null
          host_nickname: string | null
          id: number | null
          is_past: boolean | null
          join_type: Database["public"]["Enums"]["join_type"] | null
          region_sido: string | null
          region_sigungu: string | null
          staff_count: number | null
          starts_at: string | null
          status: Database["public"]["Enums"]["socialing_status"] | null
          status_tag: string | null
          title: string | null
          venue_id: number | null
          venue_name: string | null
          venue_type: Database["public"]["Enums"]["venue_type"] | null
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
      cancel_application: {
        Args: { p_application_id: number }
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
      cancel_socialing: {
        Args: { p_socialing_id: number }
        Returns: {
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
        SetofOptions: {
          from: "*"
          to: "socialings"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      complete_socialing: {
        Args: { p_socialing_id: number }
        Returns: {
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
        SetofOptions: {
          from: "*"
          to: "socialings"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      confirm_socialing: {
        Args: { p_socialing_id: number }
        Returns: {
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
        SetofOptions: {
          from: "*"
          to: "socialings"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      create_review: {
        Args: {
          p_body: string
          p_content_match: boolean
          p_extra_money: boolean
          p_members_match: boolean
          p_photo_path: string
          p_socialing_id: number
        }
        Returns: {
          body: string
          created_at: string
          id: number
          photo_path: string | null
          socialing_id: number
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "reviews"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      create_socialing: {
        Args: {
          p_apply_deadline_at: string
          p_approval_criteria: string
          p_branch_id: number
          p_capacity: number
          p_category_id: number
          p_cover_photo_path: string
          p_description: string
          p_fee: number
          p_has_alcohol: boolean
          p_join_type: Database["public"]["Enums"]["join_type"]
          p_place_name: string
          p_region_code: string
          p_staff_count: number
          p_starts_at: string
          p_title: string
        }
        Returns: {
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
        SetofOptions: {
          from: "*"
          to: "socialings"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      decide_application: {
        Args: { p_application_id: number; p_approve: boolean }
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
      get_host_record: {
        Args: { p_host_id: string }
        Returns: {
          canceled_count: number
          is_new_host: boolean
          is_trusted_host: boolean
          match_rate: number
          opened_count: number
          response_count: number
          review_count: number
        }[]
      }
      socialing_accepted_count: {
        Args: { p_socialing_id: number }
        Returns: number
      }
      update_socialing: {
        Args: {
          p_apply_deadline_at: string
          p_approval_criteria: string
          p_branch_id: number
          p_capacity: number
          p_category_id: number
          p_cover_photo_path: string
          p_description: string
          p_fee: number
          p_has_alcohol: boolean
          p_join_type: Database["public"]["Enums"]["join_type"]
          p_place_name: string
          p_region_code: string
          p_socialing_id: number
          p_staff_count: number
          p_starts_at: string
          p_title: string
        }
        Returns: {
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
        SetofOptions: {
          from: "*"
          to: "socialings"
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
