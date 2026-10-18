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
      activation_accounts: {
        Row: {
          created_at: string
          id: string
          label: string
          mode: string
          password: string
          source_id: string
          tenant_id: string
          username: string
        }
        Insert: {
          created_at?: string
          id?: string
          label: string
          mode: string
          password: string
          source_id: string
          tenant_id: string
          username: string
        }
        Update: {
          created_at?: string
          id?: string
          label?: string
          mode?: string
          password?: string
          source_id?: string
          tenant_id?: string
          username?: string
        }
        Relationships: [
          {
            foreignKeyName: "activation_accounts_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "tenant_sources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activation_accounts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      activation_attempts: {
        Row: {
          attempts: number
          device_id: string
          tenant_id: string
          window_start: string
        }
        Insert: {
          attempts?: number
          device_id: string
          tenant_id: string
          window_start?: string
        }
        Update: {
          attempts?: number
          device_id?: string
          tenant_id?: string
          window_start?: string
        }
        Relationships: [
          {
            foreignKeyName: "activation_attempts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      activation_codes: {
        Row: {
          account_id: string
          activated_at: string | null
          code_hash: string
          code_hint: string
          created_at: string
          device_id: string | null
          enabled: boolean
          id: string
          tenant_id: string
        }
        Insert: {
          account_id: string
          activated_at?: string | null
          code_hash: string
          code_hint: string
          created_at?: string
          device_id?: string | null
          enabled?: boolean
          id?: string
          tenant_id: string
        }
        Update: {
          account_id?: string
          activated_at?: string | null
          code_hash?: string
          code_hint?: string
          created_at?: string
          device_id?: string | null
          enabled?: boolean
          id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "activation_codes_account_id_tenant_id_fkey"
            columns: ["account_id", "tenant_id"]
            isOneToOne: false
            referencedRelation: "activation_accounts"
            referencedColumns: ["id", "tenant_id"]
          },
          {
            foreignKeyName: "activation_codes_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      activation_receipts: {
        Row: {
          created_at: string
          id: string
          password: string
          source_id: string
          tenant_id: string
          username: string
        }
        Insert: {
          created_at?: string
          id: string
          password: string
          source_id: string
          tenant_id: string
          username: string
        }
        Update: {
          created_at?: string
          id?: string
          password?: string
          source_id?: string
          tenant_id?: string
          username?: string
        }
        Relationships: []
      }
      announcements: {
        Row: {
          active: boolean
          body: string | null
          created_at: string
          expires_at: string | null
          id: string
          image_url: string | null
          kind: string
          tenant_id: string
          title: string
        }
        Insert: {
          active?: boolean
          body?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          image_url?: string | null
          kind?: string
          tenant_id: string
          title: string
        }
        Update: {
          active?: boolean
          body?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          image_url?: string | null
          kind?: string
          tenant_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "announcements_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      app_settings: {
        Row: {
          announcement: string | null
          app_name: string
          config_version: number
          id: number
          logo_url: string | null
          store_url: string
          support_phone: string | null
          support_telegram: string | null
          support_whatsapp: string | null
          updated_at: string
        }
        Insert: {
          announcement?: string | null
          app_name?: string
          config_version?: number
          id?: number
          logo_url?: string | null
          store_url?: string
          support_phone?: string | null
          support_telegram?: string | null
          support_whatsapp?: string | null
          updated_at?: string
        }
        Update: {
          announcement?: string | null
          app_name?: string
          config_version?: number
          id?: number
          logo_url?: string | null
          store_url?: string
          support_phone?: string | null
          support_telegram?: string | null
          support_whatsapp?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      builds: {
        Row: {
          apk_url: string | null
          created_at: string
          error: string | null
          finished_at: string | null
          id: string
          status: string
          tenant_id: string
          version: string
        }
        Insert: {
          apk_url?: string | null
          created_at?: string
          error?: string | null
          finished_at?: string | null
          id?: string
          status?: string
          tenant_id: string
          version: string
        }
        Update: {
          apk_url?: string | null
          created_at?: string
          error?: string | null
          finished_at?: string | null
          id?: string
          status?: string
          tenant_id?: string
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "builds_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      firebase_settings: {
        Row: {
          client_email: string
          enabled: boolean
          google_services: Json | null
          id: string
          project_id: string
          service_account: Json
          updated_at: string
        }
        Insert: {
          client_email: string
          enabled?: boolean
          google_services?: Json | null
          id?: string
          project_id: string
          service_account: Json
          updated_at?: string
        }
        Update: {
          client_email?: string
          enabled?: boolean
          google_services?: Json | null
          id?: string
          project_id?: string
          service_account?: Json
          updated_at?: string
        }
        Relationships: []
      }
      homepage_settings: {
        Row: {
          content: Json
          id: string
          updated_at: string
        }
        Insert: {
          content?: Json
          id?: string
          updated_at?: string
        }
        Update: {
          content?: Json
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      hosts: {
        Row: {
          created_at: string
          id: string
          is_primary: boolean
          server_id: string
          sort_order: number
          url: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_primary?: boolean
          server_id: string
          sort_order?: number
          url: string
        }
        Update: {
          created_at?: string
          id?: string
          is_primary?: boolean
          server_id?: string
          sort_order?: number
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "hosts_server_id_fkey"
            columns: ["server_id"]
            isOneToOne: false
            referencedRelation: "servers"
            referencedColumns: ["id"]
          },
        ]
      }
      push_notifications: {
        Row: {
          body: string
          created_at: string
          created_by: string | null
          error: string | null
          id: string
          status: string
          target: string
          title: string
        }
        Insert: {
          body: string
          created_at?: string
          created_by?: string | null
          error?: string | null
          id?: string
          status: string
          target: string
          title: string
        }
        Update: {
          body?: string
          created_at?: string
          created_by?: string | null
          error?: string | null
          id?: string
          status?: string
          target?: string
          title?: string
        }
        Relationships: []
      }
      servers: {
        Row: {
          activation_api_url: string | null
          code: string
          created_at: string
          enabled: boolean
          id: string
          name: string
          sort_order: number
        }
        Insert: {
          activation_api_url?: string | null
          code: string
          created_at?: string
          enabled?: boolean
          id?: string
          name: string
          sort_order?: number
        }
        Update: {
          activation_api_url?: string | null
          code?: string
          created_at?: string
          enabled?: boolean
          id?: string
          name?: string
          sort_order?: number
        }
        Relationships: []
      }
      tenant_changes: {
        Row: {
          created_at: string
          id: string
          section: string
          summary: string
          tenant_id: string
          user_email: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          section: string
          summary: string
          tenant_id: string
          user_email?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          section?: string
          summary?: string
          tenant_id?: string
          user_email?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tenant_changes_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_members: {
        Row: {
          id: string
          tenant_id: string
          user_id: string
        }
        Insert: {
          id?: string
          tenant_id: string
          user_id: string
        }
        Update: {
          id?: string
          tenant_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_members_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_sources: {
        Row: {
          activation_api_url: string | null
          backup_urls: string[]
          created_at: string
          enabled: boolean
          id: string
          last_check_at: string | null
          last_check_ok: boolean | null
          login_code: string | null
          name: string
          sort_order: number
          tenant_id: string
          type: string
          url: string
        }
        Insert: {
          activation_api_url?: string | null
          backup_urls?: string[]
          created_at?: string
          enabled?: boolean
          id?: string
          last_check_at?: string | null
          last_check_ok?: boolean | null
          login_code?: string | null
          name: string
          sort_order?: number
          tenant_id: string
          type: string
          url: string
        }
        Update: {
          activation_api_url?: string | null
          backup_urls?: string[]
          created_at?: string
          enabled?: boolean
          id?: string
          last_check_at?: string | null
          last_check_ok?: boolean | null
          login_code?: string | null
          name?: string
          sort_order?: number
          tenant_id?: string
          type?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_sources_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          accent_color: string
          banner_url: string | null
          colors: Json
          created_at: string
          customer_notice: string | null
          enabled: boolean
          features: Json
          id: string
          latest_version: string
          layout: Json
          logo_url: string | null
          max_hosts: number
          min_version: string
          name: string
          owner_email: string | null
          owner_phone: string | null
          package_id: string
          panel_url: string | null
          plan_name: string
          primary_color: string
          slug: string
          store_url: string | null
          subscription_expires_at: string | null
          support_email: string | null
          support_facebook: string | null
          support_phone: string | null
          support_telegram: string | null
          support_website: string | null
          support_whatsapp: string | null
          theme: string
          update_url: string | null
        }
        Insert: {
          accent_color?: string
          banner_url?: string | null
          colors?: Json
          created_at?: string
          customer_notice?: string | null
          enabled?: boolean
          features?: Json
          id?: string
          latest_version?: string
          layout?: Json
          logo_url?: string | null
          max_hosts?: number
          min_version?: string
          name: string
          owner_email?: string | null
          owner_phone?: string | null
          package_id: string
          panel_url?: string | null
          plan_name?: string
          primary_color?: string
          slug: string
          store_url?: string | null
          subscription_expires_at?: string | null
          support_email?: string | null
          support_facebook?: string | null
          support_phone?: string | null
          support_telegram?: string | null
          support_website?: string | null
          support_whatsapp?: string | null
          theme?: string
          update_url?: string | null
        }
        Update: {
          accent_color?: string
          banner_url?: string | null
          colors?: Json
          created_at?: string
          customer_notice?: string | null
          enabled?: boolean
          features?: Json
          id?: string
          latest_version?: string
          layout?: Json
          logo_url?: string | null
          max_hosts?: number
          min_version?: string
          name?: string
          owner_email?: string | null
          owner_phone?: string | null
          package_id?: string
          panel_url?: string | null
          plan_name?: string
          primary_color?: string
          slug?: string
          store_url?: string | null
          subscription_expires_at?: string | null
          support_email?: string | null
          support_facebook?: string | null
          support_phone?: string | null
          support_telegram?: string | null
          support_website?: string | null
          support_whatsapp?: string | null
          theme?: string
          update_url?: string | null
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
          role: Database["public"]["Enums"]["app_role"]
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
      create_activation_bundle: {
        Args: {
          _account: string
          _codes: Json
          _label: string
          _mode: string
          _password: string
          _source: string
          _tenant: string
          _username: string
        }
        Returns: string
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_tenant_member: { Args: { _tenant_id: string }; Returns: boolean }
      redeem_builtin_code: {
        Args: { _device: string; _hash: string; _slug: string }
        Returns: Json
      }
      tenant_activation_count: { Args: { _slug: string }; Returns: number }
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
      app_role: ["admin", "user"],
    },
  },
} as const
