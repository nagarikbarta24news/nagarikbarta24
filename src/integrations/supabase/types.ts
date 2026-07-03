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
      articles: {
        Row: {
          author_id: string | null
          category_id: number | null
          content: string
          created_at: string
          editor_id: string | null
          excerpt: string | null
          featured_image: string
          greeting_message: string | null
          id: string
          image_caption: string | null
          ingested_at: string | null
          is_breaking: boolean
          is_featured: boolean
          published_at: string | null
          read_time_mins: number
          review_notes: string[] | null
          seo_description: string | null
          seo_keywords: string[] | null
          seo_title: string | null
          slug: string
          source_canonical_url: string | null
          source_name: string | null
          source_title_norm: string | null
          source_url: string | null
          status: Database["public"]["Enums"]["post_status"]
          subtitle: string | null
          title: string
          updated_at: string
          views_count: number
        }
        Insert: {
          author_id?: string | null
          category_id?: number | null
          content?: string
          created_at?: string
          editor_id?: string | null
          excerpt?: string | null
          featured_image?: string
          greeting_message?: string | null
          id?: string
          image_caption?: string | null
          ingested_at?: string | null
          is_breaking?: boolean
          is_featured?: boolean
          published_at?: string | null
          read_time_mins?: number
          review_notes?: string[] | null
          seo_description?: string | null
          seo_keywords?: string[] | null
          seo_title?: string | null
          slug: string
          source_canonical_url?: string | null
          source_name?: string | null
          source_title_norm?: string | null
          source_url?: string | null
          status?: Database["public"]["Enums"]["post_status"]
          subtitle?: string | null
          title: string
          updated_at?: string
          views_count?: number
        }
        Update: {
          author_id?: string | null
          category_id?: number | null
          content?: string
          created_at?: string
          editor_id?: string | null
          excerpt?: string | null
          featured_image?: string
          greeting_message?: string | null
          id?: string
          image_caption?: string | null
          ingested_at?: string | null
          is_breaking?: boolean
          is_featured?: boolean
          published_at?: string | null
          read_time_mins?: number
          review_notes?: string[] | null
          seo_description?: string | null
          seo_keywords?: string[] | null
          seo_title?: string | null
          slug?: string
          source_canonical_url?: string | null
          source_name?: string | null
          source_title_norm?: string | null
          source_url?: string | null
          status?: Database["public"]["Enums"]["post_status"]
          subtitle?: string | null
          title?: string
          updated_at?: string
          views_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "articles_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "articles_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "articles_editor_id_fkey"
            columns: ["editor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      blogs: {
        Row: {
          author_id: string
          content: string
          cover_image: string | null
          created_at: string
          excerpt: string | null
          id: string
          is_published: boolean
          slug: string
          title: string
          updated_at: string
        }
        Insert: {
          author_id: string
          content: string
          cover_image?: string | null
          created_at?: string
          excerpt?: string | null
          id?: string
          is_published?: boolean
          slug: string
          title: string
          updated_at?: string
        }
        Update: {
          author_id?: string
          content?: string
          cover_image?: string | null
          created_at?: string
          excerpt?: string | null
          id?: string
          is_published?: boolean
          slug?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          created_at: string
          id: number
          is_active: boolean
          name: string
          priority: number
          slug: string
        }
        Insert: {
          created_at?: string
          id?: number
          is_active?: boolean
          name: string
          priority?: number
          slug: string
        }
        Update: {
          created_at?: string
          id?: number
          is_active?: boolean
          name?: string
          priority?: number
          slug?: string
        }
        Relationships: []
      }
      comments: {
        Row: {
          article_id: string
          content: string
          created_at: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          article_id: string
          content: string
          created_at?: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          article_id?: string
          content?: string
          created_at?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comments_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "articles"
            referencedColumns: ["id"]
          },
        ]
      }
      indexing_runs: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          inspected: Json
          log: Json
          message: string
          sitemap_submitted: boolean
          verified: boolean
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          inspected?: Json
          log?: Json
          message?: string
          sitemap_submitted?: boolean
          verified?: boolean
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          inspected?: Json
          log?: Json
          message?: string
          sitemap_submitted?: boolean
          verified?: boolean
        }
        Relationships: []
      }
      ingestion_logs: {
        Row: {
          created_at: string
          id: string
          items_created: number
          items_found: number
          message: string | null
          source_id: number | null
          source_name: string | null
          status: string
        }
        Insert: {
          created_at?: string
          id?: string
          items_created?: number
          items_found?: number
          message?: string | null
          source_id?: number | null
          source_name?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          id?: string
          items_created?: number
          items_found?: number
          message?: string | null
          source_id?: number | null
          source_name?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "ingestion_logs_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "ingestion_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      ingestion_sources: {
        Row: {
          category_id: number | null
          created_at: string
          feed_type: string
          feed_url: string | null
          id: number
          is_active: boolean
          last_fetched_at: string | null
          section_url: string
          source_name: string
          updated_at: string
        }
        Insert: {
          category_id?: number | null
          created_at?: string
          feed_type?: string
          feed_url?: string | null
          id?: never
          is_active?: boolean
          last_fetched_at?: string | null
          section_url: string
          source_name: string
          updated_at?: string
        }
        Update: {
          category_id?: number | null
          created_at?: string
          feed_type?: string
          feed_url?: string | null
          id?: never
          is_active?: boolean
          last_fetched_at?: string | null
          section_url?: string
          source_name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ingestion_sources_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bangla_name: string
          bio: string | null
          created_at: string
          full_name: string
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          bangla_name?: string
          bio?: string | null
          created_at?: string
          full_name?: string
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          bangla_name?: string
          bio?: string | null
          created_at?: string
          full_name?: string
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      publish_events: {
        Row: {
          article_id: string | null
          created_at: string
          error: string | null
          headline: string | null
          id: string
          image_source: string
          image_url: string | null
          item_title: string | null
          outcome: string
          source_id: number | null
          source_name: string | null
          source_url: string | null
          translated: boolean
        }
        Insert: {
          article_id?: string | null
          created_at?: string
          error?: string | null
          headline?: string | null
          id?: string
          image_source?: string
          image_url?: string | null
          item_title?: string | null
          outcome?: string
          source_id?: number | null
          source_name?: string | null
          source_url?: string | null
          translated?: boolean
        }
        Update: {
          article_id?: string | null
          created_at?: string
          error?: string | null
          headline?: string | null
          id?: string
          image_source?: string
          image_url?: string | null
          item_title?: string | null
          outcome?: string
          source_id?: number | null
          source_name?: string | null
          source_url?: string | null
          translated?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "publish_events_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "articles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "publish_events_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "ingestion_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      site_settings: {
        Row: {
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          value?: Json
        }
        Update: {
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      subscribers: {
        Row: {
          created_at: string
          email: string
          id: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
        }
        Relationships: []
      }
      system_alerts: {
        Row: {
          created_at: string
          details: Json
          id: string
          level: string
          resolved: boolean
          source: string
          title: string
        }
        Insert: {
          created_at?: string
          details?: Json
          id?: string
          level?: string
          resolved?: boolean
          source: string
          title: string
        }
        Update: {
          created_at?: string
          details?: Json
          id?: string
          level?: string
          resolved?: boolean
          source?: string
          title?: string
        }
        Relationships: []
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
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      is_staff: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role:
        | "reader"
        | "reporter"
        | "editor"
        | "chief_editor"
        | "admin"
        | "super_admin"
      post_status:
        | "draft"
        | "pending_review"
        | "published"
        | "archived"
        | "scheduled"
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
      app_role: [
        "reader",
        "reporter",
        "editor",
        "chief_editor",
        "admin",
        "super_admin",
      ],
      post_status: [
        "draft",
        "pending_review",
        "published",
        "archived",
        "scheduled",
      ],
    },
  },
} as const
