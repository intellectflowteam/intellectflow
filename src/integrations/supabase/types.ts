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
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      alerts: {
        Row: {
          business_id: string
          created_at: string | null
          id: string
          is_read: boolean | null
          message: string
          severity: string | null
          title: string
          type: string
        }
        Insert: {
          business_id: string
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message: string
          severity?: string | null
          title: string
          type: string
        }
        Update: {
          business_id?: string
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message?: string
          severity?: string | null
          title?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "alerts_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alerts_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses_public"
            referencedColumns: ["id"]
          },
        ]
      }
      businesses: {
        Row: {
          address: string | null
          business_type: string | null
          city: string | null
          created_at: string | null
          description: string | null
          gmb_link: string | null
          id: string
          latitude: number | null
          longitude: number | null
          name: string
          phone: string | null
          photo_url: string | null
          place_id: string | null
          qr_url: string | null
          rating: number | null
          slug: string
          swot_generated_at: string | null
          swot_summary: Json | null
          total_reviews: number | null
          total_scans: number | null
          user_id: string
          website: string | null
        }
        Insert: {
          address?: string | null
          business_type?: string | null
          city?: string | null
          created_at?: string | null
          description?: string | null
          gmb_link?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          name: string
          phone?: string | null
          photo_url?: string | null
          place_id?: string | null
          qr_url?: string | null
          rating?: number | null
          slug: string
          swot_generated_at?: string | null
          swot_summary?: Json | null
          total_reviews?: number | null
          total_scans?: number | null
          user_id: string
          website?: string | null
        }
        Update: {
          address?: string | null
          business_type?: string | null
          city?: string | null
          created_at?: string | null
          description?: string | null
          gmb_link?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          name?: string
          phone?: string | null
          photo_url?: string | null
          place_id?: string | null
          qr_url?: string | null
          rating?: number | null
          slug?: string
          swot_generated_at?: string | null
          swot_summary?: Json | null
          total_reviews?: number | null
          total_scans?: number | null
          user_id?: string
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "businesses_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      competitors: {
        Row: {
          business_id: string
          competitor_address: string | null
          competitor_name: string
          competitor_rating: number | null
          competitor_reviews: number | null
          created_at: string | null
          id: string
          last_checked: string | null
          place_id: string | null
        }
        Insert: {
          business_id: string
          competitor_address?: string | null
          competitor_name: string
          competitor_rating?: number | null
          competitor_reviews?: number | null
          created_at?: string | null
          id?: string
          last_checked?: string | null
          place_id?: string | null
        }
        Update: {
          business_id?: string
          competitor_address?: string | null
          competitor_name?: string
          competitor_rating?: number | null
          competitor_reviews?: number | null
          created_at?: string | null
          id?: string
          last_checked?: string | null
          place_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "competitors_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "competitors_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses_public"
            referencedColumns: ["id"]
          },
        ]
      }
      coupons: {
        Row: {
          business_id: string
          code: string
          created_at: string | null
          discount: string | null
          id: string
          max_usage: number | null
          used_count: number | null
          valid_till: string | null
        }
        Insert: {
          business_id: string
          code: string
          created_at?: string | null
          discount?: string | null
          id?: string
          max_usage?: number | null
          used_count?: number | null
          valid_till?: string | null
        }
        Update: {
          business_id?: string
          code?: string
          created_at?: string | null
          discount?: string | null
          id?: string
          max_usage?: number | null
          used_count?: number | null
          valid_till?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "coupons_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coupons_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses_public"
            referencedColumns: ["id"]
          },
        ]
      }
      faqs: {
        Row: {
          answer: string
          business_id: string
          created_at: string | null
          id: string
          published: boolean | null
          question: string
          source: string | null
        }
        Insert: {
          answer: string
          business_id: string
          created_at?: string | null
          id?: string
          published?: boolean | null
          question: string
          source?: string | null
        }
        Update: {
          answer?: string
          business_id?: string
          created_at?: string | null
          id?: string
          published?: boolean | null
          question?: string
          source?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "faqs_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "faqs_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses_public"
            referencedColumns: ["id"]
          },
        ]
      }
      gmb_posts: {
        Row: {
          business_id: string
          content: string
          created_at: string | null
          id: string
          image_url: string | null
          published_at: string | null
          scheduled_at: string | null
          status: string | null
        }
        Insert: {
          business_id: string
          content: string
          created_at?: string | null
          id?: string
          image_url?: string | null
          published_at?: string | null
          scheduled_at?: string | null
          status?: string | null
        }
        Update: {
          business_id?: string
          content?: string
          created_at?: string | null
          id?: string
          image_url?: string | null
          published_at?: string | null
          scheduled_at?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gmb_posts_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gmb_posts_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses_public"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          business_name: string | null
          city: string | null
          created_at: string | null
          email: string
          id: string
          is_admin: boolean | null
          is_founder_free: boolean | null
          last_active_at: string | null
          lifetime_free: boolean
          phone: string | null
          plan: string | null
          plan_price: number | null
          razorpay_payment_ref: string | null
          razorpay_plan_id: string | null
          subscription_status: string
          trial_ends_at: string | null
        }
        Insert: {
          business_name?: string | null
          city?: string | null
          created_at?: string | null
          email: string
          id: string
          is_admin?: boolean | null
          is_founder_free?: boolean | null
          last_active_at?: string | null
          lifetime_free?: boolean
          phone?: string | null
          plan?: string | null
          plan_price?: number | null
          razorpay_payment_ref?: string | null
          razorpay_plan_id?: string | null
          subscription_status?: string
          trial_ends_at?: string | null
        }
        Update: {
          business_name?: string | null
          city?: string | null
          created_at?: string | null
          email?: string
          id?: string
          is_admin?: boolean | null
          is_founder_free?: boolean | null
          last_active_at?: string | null
          lifetime_free?: boolean
          phone?: string | null
          plan?: string | null
          plan_price?: number | null
          razorpay_payment_ref?: string | null
          razorpay_plan_id?: string | null
          subscription_status?: string
          trial_ends_at?: string | null
        }
        Relationships: []
      }
      reviews: {
        Row: {
          ai_generated: boolean | null
          ai_reply_suggestion: Json | null
          business_id: string
          created_at: string | null
          customer_name: string | null
          customer_phone: string | null
          id: string
          rating: number
          review_text: string | null
          sentiment: string | null
          source: string | null
          status: string | null
        }
        Insert: {
          ai_generated?: boolean | null
          ai_reply_suggestion?: Json | null
          business_id: string
          created_at?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          id?: string
          rating: number
          review_text?: string | null
          sentiment?: string | null
          source?: string | null
          status?: string | null
        }
        Update: {
          ai_generated?: boolean | null
          ai_reply_suggestion?: Json | null
          business_id?: string
          created_at?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          id?: string
          rating?: number
          review_text?: string | null
          sentiment?: string | null
          source?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reviews_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses_public"
            referencedColumns: ["id"]
          },
        ]
      }
      standees: {
        Row: {
          business_id: string
          created_at: string | null
          design_url: string | null
          id: string
          qr_data: string | null
          status: string | null
          type: string
        }
        Insert: {
          business_id: string
          created_at?: string | null
          design_url?: string | null
          id?: string
          qr_data?: string | null
          status?: string | null
          type: string
        }
        Update: {
          business_id?: string
          created_at?: string | null
          design_url?: string | null
          id?: string
          qr_data?: string | null
          status?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "standees_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "standees_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses_public"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          created_at: string | null
          current_period_end: string | null
          current_period_start: string | null
          id: string
          is_lifetime: boolean | null
          market_value: string | null
          plan: string
          price: number
          status: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          is_lifetime?: boolean | null
          market_value?: string | null
          plan: string
          price: number
          status?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          is_lifetime?: boolean | null
          market_value?: string | null
          plan?: string
          price?: number
          status?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
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
          role: Database["public"]["Enums"]["app_role"]
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
      whatsapp_logs: {
        Row: {
          business_id: string
          id: string
          message_text: string | null
          message_type: string | null
          phone: string
          sent_at: string | null
          status: string | null
        }
        Insert: {
          business_id: string
          id?: string
          message_text?: string | null
          message_type?: string | null
          phone: string
          sent_at?: string | null
          status?: string | null
        }
        Update: {
          business_id?: string
          id?: string
          message_text?: string | null
          message_type?: string | null
          phone?: string
          sent_at?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_logs_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_logs_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses_public"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      businesses_public: {
        Row: {
          address: string | null
          business_type: string | null
          city: string | null
          description: string | null
          gmb_link: string | null
          id: string | null
          name: string | null
          photo_url: string | null
          rating: number | null
          slug: string | null
          total_reviews: number | null
        }
        Insert: {
          address?: string | null
          business_type?: string | null
          city?: string | null
          description?: string | null
          gmb_link?: string | null
          id?: string | null
          name?: string | null
          photo_url?: string | null
          rating?: number | null
          slug?: string | null
          total_reviews?: number | null
        }
        Update: {
          address?: string | null
          business_type?: string | null
          city?: string | null
          description?: string | null
          gmb_link?: string | null
          id?: string | null
          name?: string | null
          photo_url?: string | null
          rating?: number | null
          slug?: string | null
          total_reviews?: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_scan: { Args: { _slug: string }; Returns: undefined }
      is_admin: { Args: { _uid: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
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
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const
