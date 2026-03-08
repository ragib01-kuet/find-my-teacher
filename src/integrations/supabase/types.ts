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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      deals: {
        Row: {
          admin_notes: string | null
          commission_amount: number | null
          contact_revealed: boolean | null
          created_at: string
          id: string
          request_id: string
          status: Database["public"]["Enums"]["deal_status"]
          student_id: string
          tutor_id: string
          updated_at: string
        }
        Insert: {
          admin_notes?: string | null
          commission_amount?: number | null
          contact_revealed?: boolean | null
          created_at?: string
          id?: string
          request_id: string
          status?: Database["public"]["Enums"]["deal_status"]
          student_id: string
          tutor_id: string
          updated_at?: string
        }
        Update: {
          admin_notes?: string | null
          commission_amount?: number | null
          contact_revealed?: boolean | null
          created_at?: string
          id?: string
          request_id?: string
          status?: Database["public"]["Enums"]["deal_status"]
          student_id?: string
          tutor_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "deals_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "tuition_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      demo_video_views: {
        Row: {
          comment: string | null
          completed: boolean
          created_at: string
          id: string
          rating: number | null
          student_id: string
          tutor_id: string
          watched_at: string
        }
        Insert: {
          comment?: string | null
          completed?: boolean
          created_at?: string
          id?: string
          rating?: number | null
          student_id: string
          tutor_id: string
          watched_at?: string
        }
        Update: {
          comment?: string | null
          completed?: boolean
          created_at?: string
          id?: string
          rating?: number | null
          student_id?: string
          tutor_id?: string
          watched_at?: string
        }
        Relationships: []
      }
      message_reactions: {
        Row: {
          created_at: string
          emoji: string
          id: string
          message_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          emoji: string
          id?: string
          message_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          emoji?: string
          id?: string
          message_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_reactions_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string
          created_at: string
          id: string
          is_flagged: boolean | null
          is_read: boolean | null
          reply_to_id: string | null
          request_id: string
          sender_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          is_flagged?: boolean | null
          is_read?: boolean | null
          reply_to_id?: string | null
          request_id: string
          sender_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          is_flagged?: boolean | null
          is_read?: boolean | null
          reply_to_id?: string | null
          request_id?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_reply_to_id_fkey"
            columns: ["reply_to_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "tuition_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          message: string
          metadata: Json | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          message: string
          metadata?: Json | null
          title: string
          type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          metadata?: Json | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string
          id: string
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name: string
          id?: string
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string
          id?: string
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      reports: {
        Row: {
          admin_response: string | null
          created_at: string
          details: string | null
          id: string
          reason: string
          reported_user_id: string | null
          reporter_id: string
          request_id: string | null
          status: string
        }
        Insert: {
          admin_response?: string | null
          created_at?: string
          details?: string | null
          id?: string
          reason: string
          reported_user_id?: string | null
          reporter_id: string
          request_id?: string | null
          status?: string
        }
        Update: {
          admin_response?: string | null
          created_at?: string
          details?: string | null
          id?: string
          reason?: string
          reported_user_id?: string | null
          reporter_id?: string
          request_id?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "reports_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "tuition_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          comment: string | null
          created_at: string
          deal_id: string | null
          id: string
          rating: number
          student_id: string
          tutor_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          deal_id?: string | null
          id?: string
          rating: number
          student_id: string
          tutor_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          deal_id?: string | null
          id?: string
          rating?: number
          student_id?: string
          tutor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
        ]
      }
      tuition_requests: {
        Row: {
          area: string | null
          budget: number | null
          class_level: string | null
          created_at: string
          id: string
          message: string | null
          status: Database["public"]["Enums"]["request_status"]
          student_id: string
          student_name: string | null
          subject: string | null
          tutor_id: string
          updated_at: string
        }
        Insert: {
          area?: string | null
          budget?: number | null
          class_level?: string | null
          created_at?: string
          id?: string
          message?: string | null
          status?: Database["public"]["Enums"]["request_status"]
          student_id: string
          student_name?: string | null
          subject?: string | null
          tutor_id: string
          updated_at?: string
        }
        Update: {
          area?: string | null
          budget?: number | null
          class_level?: string | null
          created_at?: string
          id?: string
          message?: string | null
          status?: Database["public"]["Enums"]["request_status"]
          student_id?: string
          student_name?: string | null
          subject?: string | null
          tutor_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      tutor_profiles: {
        Row: {
          admin_notes: string | null
          bio: string | null
          created_at: string
          cv_url: string | null
          demo_video_url: string | null
          department: string
          experience: string | null
          fee_expectation: number
          id: string
          photo_url: string | null
          preferred_areas: string[]
          rating: number | null
          session: string
          status: Database["public"]["Enums"]["tutor_status"]
          subjects: string[]
          total_reviews: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          bio?: string | null
          created_at?: string
          cv_url?: string | null
          demo_video_url?: string | null
          department: string
          experience?: string | null
          fee_expectation?: number
          id?: string
          photo_url?: string | null
          preferred_areas?: string[]
          rating?: number | null
          session: string
          status?: Database["public"]["Enums"]["tutor_status"]
          subjects?: string[]
          total_reviews?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          bio?: string | null
          created_at?: string
          cv_url?: string | null
          demo_video_url?: string | null
          department?: string
          experience?: string | null
          fee_expectation?: number
          id?: string
          photo_url?: string | null
          preferred_areas?: string[]
          rating?: number | null
          session?: string
          status?: Database["public"]["Enums"]["tutor_status"]
          subjects?: string[]
          total_reviews?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "tutor" | "student"
      deal_status: "pending_admin" | "approved" | "rejected" | "completed"
      request_status:
        | "pending"
        | "accepted"
        | "rejected"
        | "completed"
        | "cancelled"
      tutor_status: "pending" | "approved" | "rejected" | "suspended"
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
      app_role: ["admin", "tutor", "student"],
      deal_status: ["pending_admin", "approved", "rejected", "completed"],
      request_status: [
        "pending",
        "accepted",
        "rejected",
        "completed",
        "cancelled",
      ],
      tutor_status: ["pending", "approved", "rejected", "suspended"],
    },
  },
} as const
