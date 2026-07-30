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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      activation_logs: {
        Row: {
          browser: string | null
          created_at: string
          device_hash: string | null
          ext_version: string | null
          id: string
          ip_address: string | null
          license_id: string | null
          license_key_hash: string | null
          os: string | null
          reason: string | null
          result: Database["public"]["Enums"]["activation_result"]
          user_agent: string | null
        }
        Insert: {
          browser?: string | null
          created_at?: string
          device_hash?: string | null
          ext_version?: string | null
          id?: string
          ip_address?: string | null
          license_id?: string | null
          license_key_hash?: string | null
          os?: string | null
          reason?: string | null
          result: Database["public"]["Enums"]["activation_result"]
          user_agent?: string | null
        }
        Update: {
          browser?: string | null
          created_at?: string
          device_hash?: string | null
          ext_version?: string | null
          id?: string
          ip_address?: string | null
          license_id?: string | null
          license_key_hash?: string | null
          os?: string | null
          reason?: string | null
          result?: Database["public"]["Enums"]["activation_result"]
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "activation_logs_license_id_fkey"
            columns: ["license_id"]
            isOneToOne: false
            referencedRelation: "licenses"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_audit_log: {
        Row: {
          action: string
          admin_id: string | null
          created_at: string
          details: Json
          id: string
          target_id: string | null
          target_type: string | null
        }
        Insert: {
          action: string
          admin_id?: string | null
          created_at?: string
          details?: Json
          id?: string
          target_id?: string | null
          target_type?: string | null
        }
        Update: {
          action?: string
          admin_id?: string | null
          created_at?: string
          details?: Json
          id?: string
          target_id?: string | null
          target_type?: string | null
        }
        Relationships: []
      }
      admin_credentials: {
        Row: {
          created_at: string
          password_hash: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          password_hash: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          password_hash?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      devices: {
        Row: {
          browser: string | null
          device_hash: string
          ext_version: string | null
          first_seen_at: string
          id: string
          is_revoked: boolean
          last_seen_at: string
          license_id: string
          os: string | null
        }
        Insert: {
          browser?: string | null
          device_hash: string
          ext_version?: string | null
          first_seen_at?: string
          id?: string
          is_revoked?: boolean
          last_seen_at?: string
          license_id: string
          os?: string | null
        }
        Update: {
          browser?: string | null
          device_hash?: string
          ext_version?: string | null
          first_seen_at?: string
          id?: string
          is_revoked?: boolean
          last_seen_at?: string
          license_id?: string
          os?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "devices_license_id_fkey"
            columns: ["license_id"]
            isOneToOne: false
            referencedRelation: "licenses"
            referencedColumns: ["id"]
          },
        ]
      }
      edge_rate_limits: {
        Row: {
          key_hash: string
          request_count: number
          scope: string
          updated_at: string
          window_started_at: string
        }
        Insert: {
          key_hash: string
          request_count?: number
          scope: string
          updated_at?: string
          window_started_at?: string
        }
        Update: {
          key_hash?: string
          request_count?: number
          scope?: string
          updated_at?: string
          window_started_at?: string
        }
        Relationships: []
      }
      licenses: {
        Row: {
          activated_at: string | null
          created_at: string
          custom_duration_minutes: number | null
          custom_duration_seconds: number | null
          expires_at: string | null
          id: string
          license_key: string
          license_key_hash: string
          max_devices_override: number | null
          notes: string | null
          plan_id: string | null
          status: Database["public"]["Enums"]["license_status"]
          updated_at: string
          user_id: string | null
        }
        Insert: {
          activated_at?: string | null
          created_at?: string
          custom_duration_minutes?: number | null
          custom_duration_seconds?: number | null
          expires_at?: string | null
          id?: string
          license_key: string
          license_key_hash: string
          max_devices_override?: number | null
          notes?: string | null
          plan_id?: string | null
          status?: Database["public"]["Enums"]["license_status"]
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          activated_at?: string | null
          created_at?: string
          custom_duration_minutes?: number | null
          custom_duration_seconds?: number | null
          expires_at?: string | null
          id?: string
          license_key?: string
          license_key_hash?: string
          max_devices_override?: number | null
          notes?: string | null
          plan_id?: string | null
          status?: Database["public"]["Enums"]["license_status"]
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "licenses_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
      }
      marketplace_orders: {
        Row: {
          amount_cents: number
          buyer_email: string | null
          buyer_id: string
          buyer_name: string | null
          buyer_note: string | null
          buyer_whatsapp: string | null
          client_request_id: string | null
          created_at: string
          delivered_at: string | null
          delivered_content: string | null
          expires_at: string | null
          id: string
          paid_at: string | null
          product_id: string | null
          provider: string
          provider_payment_id: string | null
          qr_code: string | null
          qr_code_base64: string | null
          raw: Json | null
          status: Database["public"]["Enums"]["marketplace_order_status"]
          ticket_url: string | null
          updated_at: string
        }
        Insert: {
          amount_cents?: number
          buyer_email?: string | null
          buyer_id: string
          buyer_name?: string | null
          buyer_note?: string | null
          buyer_whatsapp?: string | null
          client_request_id?: string | null
          created_at?: string
          delivered_at?: string | null
          delivered_content?: string | null
          expires_at?: string | null
          id?: string
          paid_at?: string | null
          product_id?: string | null
          provider?: string
          provider_payment_id?: string | null
          qr_code?: string | null
          qr_code_base64?: string | null
          raw?: Json | null
          status?: Database["public"]["Enums"]["marketplace_order_status"]
          ticket_url?: string | null
          updated_at?: string
        }
        Update: {
          amount_cents?: number
          buyer_email?: string | null
          buyer_id?: string
          buyer_name?: string | null
          buyer_note?: string | null
          buyer_whatsapp?: string | null
          client_request_id?: string | null
          created_at?: string
          delivered_at?: string | null
          delivered_content?: string | null
          expires_at?: string | null
          id?: string
          paid_at?: string | null
          product_id?: string | null
          provider?: string
          provider_payment_id?: string | null
          qr_code?: string | null
          qr_code_base64?: string | null
          raw?: Json | null
          status?: Database["public"]["Enums"]["marketplace_order_status"]
          ticket_url?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketplace_orders_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "marketplace_products"
            referencedColumns: ["id"]
          },
        ]
      }
      marketplace_products: {
        Row: {
          category: string
          cover_url: string | null
          created_at: string
          delivery_content: string | null
          delivery_instructions: string | null
          delivery_type: Database["public"]["Enums"]["marketplace_delivery_type"]
          description: string | null
          featured: boolean
          id: string
          is_active: boolean
          name: string
          old_price_cents: number | null
          price_cents: number
          rating: number
          slug: string
          sort_order: number
          stock: number | null
          tagline: string | null
          updated_at: string
        }
        Insert: {
          category?: string
          cover_url?: string | null
          created_at?: string
          delivery_content?: string | null
          delivery_instructions?: string | null
          delivery_type?: Database["public"]["Enums"]["marketplace_delivery_type"]
          description?: string | null
          featured?: boolean
          id?: string
          is_active?: boolean
          name: string
          old_price_cents?: number | null
          price_cents?: number
          rating?: number
          slug: string
          sort_order?: number
          stock?: number | null
          tagline?: string | null
          updated_at?: string
        }
        Update: {
          category?: string
          cover_url?: string | null
          created_at?: string
          delivery_content?: string | null
          delivery_instructions?: string | null
          delivery_type?: Database["public"]["Enums"]["marketplace_delivery_type"]
          description?: string | null
          featured?: boolean
          id?: string
          is_active?: boolean
          name?: string
          old_price_cents?: number | null
          price_cents?: number
          rating?: number
          slug?: string
          sort_order?: number
          stock?: number | null
          tagline?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount_cents: number
          buyer_email: string | null
          buyer_name: string
          buyer_whatsapp: string
          created_at: string
          custom_duration_days: number | null
          expires_at: string | null
          id: string
          license_id: string | null
          paid_at: string | null
          plan_id: string
          provider: string
          provider_payment_id: string | null
          qr_code: string | null
          qr_code_base64: string | null
          quantity: number
          raw: Json | null
          reseller_id: string | null
          status: string
          ticket_url: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          amount_cents: number
          buyer_email?: string | null
          buyer_name: string
          buyer_whatsapp: string
          created_at?: string
          custom_duration_days?: number | null
          expires_at?: string | null
          id?: string
          license_id?: string | null
          paid_at?: string | null
          plan_id: string
          provider?: string
          provider_payment_id?: string | null
          qr_code?: string | null
          qr_code_base64?: string | null
          quantity?: number
          raw?: Json | null
          reseller_id?: string | null
          status?: string
          ticket_url?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          amount_cents?: number
          buyer_email?: string | null
          buyer_name?: string
          buyer_whatsapp?: string
          created_at?: string
          custom_duration_days?: number | null
          expires_at?: string | null
          id?: string
          license_id?: string | null
          paid_at?: string | null
          plan_id?: string
          provider?: string
          provider_payment_id?: string | null
          qr_code?: string | null
          qr_code_base64?: string | null
          quantity?: number
          raw?: Json | null
          reseller_id?: string | null
          status?: string
          ticket_url?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_license_id_fkey"
            columns: ["license_id"]
            isOneToOne: false
            referencedRelation: "licenses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
      }
      plans: {
        Row: {
          created_at: string
          description: string | null
          duration_days: number
          duration_minutes: number | null
          features: Json
          id: string
          is_active: boolean
          max_devices: number
          name: string
          price_cents: number
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          duration_days: number
          duration_minutes?: number | null
          features?: Json
          id?: string
          is_active?: boolean
          max_devices?: number
          name: string
          price_cents?: number
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          duration_days?: number
          duration_minutes?: number | null
          features?: Json
          id?: string
          is_active?: boolean
          max_devices?: number
          name?: string
          price_cents?: number
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string | null
          id: string
          referral_code: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id: string
          referral_code?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          referral_code?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      trial_license_claims: {
        Row: {
          activated_at: string | null
          created_at: string
          expires_at: string | null
          id: string
          license_id: string | null
          license_key: string
          license_key_hash: string
          license_status: Database["public"]["Enums"]["license_status"]
          plan_id: string
          source: string
          updated_at: string
          user_id: string
        }
        Insert: {
          activated_at?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          license_id?: string | null
          license_key: string
          license_key_hash: string
          license_status?: Database["public"]["Enums"]["license_status"]
          plan_id: string
          source?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          activated_at?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          license_id?: string | null
          license_key?: string
          license_key_hash?: string
          license_status?: Database["public"]["Enums"]["license_status"]
          plan_id?: string
          source?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trial_license_claims_license_id_fkey"
            columns: ["license_id"]
            isOneToOne: false
            referencedRelation: "licenses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trial_license_claims_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      claim_trial_license: {
        Args: {
          p_expires_at: string
          p_license_key: string
          p_license_key_hash: string
          p_plan_id: string
          p_user_id: string
        }
        Returns: Json
      }
      consume_edge_rate_limit: {
        Args: {
          p_key_hash: string
          p_limit: number
          p_scope: string
          p_window_seconds: number
        }
        Returns: {
          allowed: boolean
          remaining: number
          retry_after_seconds: number
        }[]
      }
      finalize_approved_payment: {
        Args: {
          p_license_key: string
          p_license_key_hash: string
          p_payment_id: string
        }
        Returns: string
      }
      finalize_approved_payment_bulk: {
        Args: { p_keys: Json; p_payment_id: string }
        Returns: Json
      }
      generate_referral_code: { Args: { _user_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      activation_result:
        | "success"
        | "invalid_key"
        | "expired"
        | "revoked"
        | "suspended"
        | "device_limit"
        | "device_mismatch"
        | "not_found"
        | "rate_limited"
        | "error"
      app_role: "admin" | "user" | "cliente" | "revendedor" | "owner"
      license_status: "pending" | "active" | "expired" | "suspended" | "revoked"
      marketplace_delivery_type: "link" | "text" | "file" | "manual"
      marketplace_order_status: "pending" | "paid" | "delivered" | "cancelled"
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
      activation_result: [
        "success",
        "invalid_key",
        "expired",
        "revoked",
        "suspended",
        "device_limit",
        "device_mismatch",
        "not_found",
        "rate_limited",
        "error",
      ],
      app_role: ["admin", "user", "cliente", "revendedor", "owner"],
      license_status: ["pending", "active", "expired", "suspended", "revoked"],
      marketplace_delivery_type: ["link", "text", "file", "manual"],
      marketplace_order_status: ["pending", "paid", "delivered", "cancelled"],
    },
  },
} as const
