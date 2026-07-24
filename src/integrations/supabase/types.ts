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
          caption: string | null
          category_id: number | null
          content: string
          created_at: string
          editor_id: string | null
          excerpt: string | null
          fb_error: string | null
          fb_post_id: string | null
          fb_posted_at: string | null
          featured_image: string
          greeting_message: string | null
          id: string
          image_caption: string | null
          image_credit: string | null
          image_license: string | null
          image_photographer: string | null
          ingested_at: string | null
          is_breaking: boolean
          is_featured: boolean
          og_image: string | null
          publish_run_id: string | null
          published_at: string | null
          read_time_mins: number
          read_time_minutes: number | null
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
          view_count: number | null
          views_count: number
        }
        Insert: {
          author_id?: string | null
          caption?: string | null
          category_id?: number | null
          content?: string
          created_at?: string
          editor_id?: string | null
          excerpt?: string | null
          fb_error?: string | null
          fb_post_id?: string | null
          fb_posted_at?: string | null
          featured_image?: string
          greeting_message?: string | null
          id?: string
          image_caption?: string | null
          image_credit?: string | null
          image_license?: string | null
          image_photographer?: string | null
          ingested_at?: string | null
          is_breaking?: boolean
          is_featured?: boolean
          og_image?: string | null
          publish_run_id?: string | null
          published_at?: string | null
          read_time_mins?: number
          read_time_minutes?: number | null
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
          view_count?: number | null
          views_count?: number
        }
        Update: {
          author_id?: string | null
          caption?: string | null
          category_id?: number | null
          content?: string
          created_at?: string
          editor_id?: string | null
          excerpt?: string | null
          fb_error?: string | null
          fb_post_id?: string | null
          fb_posted_at?: string | null
          featured_image?: string
          greeting_message?: string | null
          id?: string
          image_caption?: string | null
          image_credit?: string | null
          image_license?: string | null
          image_photographer?: string | null
          ingested_at?: string | null
          is_breaking?: boolean
          is_featured?: boolean
          og_image?: string | null
          publish_run_id?: string | null
          published_at?: string | null
          read_time_mins?: number
          read_time_minutes?: number | null
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
          view_count?: number | null
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
          {
            foreignKeyName: "articles_publish_run_id_fkey"
            columns: ["publish_run_id"]
            isOneToOne: false
            referencedRelation: "publish_runs"
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
          display_order: number | null
          id: number
          is_active: boolean
          name: string
          priority: number
          slug: string
        }
        Insert: {
          created_at?: string
          display_order?: number | null
          id?: number
          is_active?: boolean
          name: string
          priority?: number
          slug: string
        }
        Update: {
          created_at?: string
          display_order?: number | null
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
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      gsc_api_logs: {
        Row: {
          attempt: number
          created_at: string
          created_by: string | null
          duration_ms: number | null
          endpoint: string
          error: string | null
          id: string
          meta: Json
          method: string
          ok: boolean
          status: number | null
          step: string
        }
        Insert: {
          attempt?: number
          created_at?: string
          created_by?: string | null
          duration_ms?: number | null
          endpoint: string
          error?: string | null
          id?: string
          meta?: Json
          method?: string
          ok?: boolean
          status?: number | null
          step: string
        }
        Update: {
          attempt?: number
          created_at?: string
          created_by?: string | null
          duration_ms?: number | null
          endpoint?: string
          error?: string | null
          id?: string
          meta?: Json
          method?: string
          ok?: boolean
          status?: number | null
          step?: string
        }
        Relationships: []
      }
      gsc_url_status: {
        Row: {
          coverage: string | null
          created_at: string
          kind: string
          label: string | null
          last_checked_at: string | null
          last_error: string | null
          updated_at: string
          url: string
          verdict: string | null
        }
        Insert: {
          coverage?: string | null
          created_at?: string
          kind?: string
          label?: string | null
          last_checked_at?: string | null
          last_error?: string | null
          updated_at?: string
          url: string
          verdict?: string | null
        }
        Update: {
          coverage?: string | null
          created_at?: string
          kind?: string
          label?: string | null
          last_checked_at?: string | null
          last_error?: string | null
          updated_at?: string
          url?: string
          verdict?: string | null
        }
        Relationships: []
      }
      import_review_queue: {
        Row: {
          created_at: string
          headline: string
          id: string
          image_url: string
          payload: Json
          published_slug: string | null
          review_note: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          source: string
          source_article_id: string | null
          source_name: string
          source_url: string
          status: string
          submitted_by: string | null
          summary: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          headline: string
          id?: string
          image_url?: string
          payload: Json
          published_slug?: string | null
          review_note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          source: string
          source_article_id?: string | null
          source_name?: string
          source_url?: string
          status?: string
          submitted_by?: string | null
          summary?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          headline?: string
          id?: string
          image_url?: string
          payload?: Json
          published_slug?: string | null
          review_note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          source?: string
          source_article_id?: string | null
          source_name?: string
          source_url?: string
          status?: string
          submitted_by?: string | null
          summary?: string
          updated_at?: string
        }
        Relationships: []
      }
      inbound_emails: {
        Row: {
          attachments: Json | null
          body_url: string | null
          email_date: string | null
          event: string
          event_id: string
          from_address: string | null
          id: string
          last_error: string | null
          last_replayed_at: string | null
          last_replayed_by: string | null
          mailbox_address: string | null
          message_id: string | null
          plain_body: string | null
          plain_html: string | null
          processed_at: string | null
          processing_status: string
          raw_payload: Json
          received_at: string
          retry_count: number
          subject: string | null
          to_addresses: Json | null
        }
        Insert: {
          attachments?: Json | null
          body_url?: string | null
          email_date?: string | null
          event: string
          event_id: string
          from_address?: string | null
          id?: string
          last_error?: string | null
          last_replayed_at?: string | null
          last_replayed_by?: string | null
          mailbox_address?: string | null
          message_id?: string | null
          plain_body?: string | null
          plain_html?: string | null
          processed_at?: string | null
          processing_status?: string
          raw_payload: Json
          received_at?: string
          retry_count?: number
          subject?: string | null
          to_addresses?: Json | null
        }
        Update: {
          attachments?: Json | null
          body_url?: string | null
          email_date?: string | null
          event?: string
          event_id?: string
          from_address?: string | null
          id?: string
          last_error?: string | null
          last_replayed_at?: string | null
          last_replayed_by?: string | null
          mailbox_address?: string | null
          message_id?: string | null
          plain_body?: string | null
          plain_html?: string | null
          processed_at?: string | null
          processing_status?: string
          raw_payload?: Json
          received_at?: string
          retry_count?: number
          subject?: string | null
          to_addresses?: Json | null
        }
        Relationships: []
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
      newsdata_sync_rules: {
        Row: {
          category_id: number | null
          country: string
          created_at: string
          created_by: string | null
          enabled: boolean
          id: string
          label: string
          language: string
          last_result: Json | null
          last_run_at: string | null
          newsdata_category: string
          query: string
          size: number
          timeframe: string
          updated_at: string
        }
        Insert: {
          category_id?: number | null
          country?: string
          created_at?: string
          created_by?: string | null
          enabled?: boolean
          id?: string
          label: string
          language?: string
          last_result?: Json | null
          last_run_at?: string | null
          newsdata_category?: string
          query?: string
          size?: number
          timeframe?: string
          updated_at?: string
        }
        Update: {
          category_id?: number | null
          country?: string
          created_at?: string
          created_by?: string | null
          enabled?: boolean
          id?: string
          label?: string
          language?: string
          last_result?: Json | null
          last_run_at?: string | null
          newsdata_category?: string
          query?: string
          size?: number
          timeframe?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "newsdata_sync_rules_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      newsletter_issues: {
        Row: {
          article_ids: string[] | null
          body_html: string
          created_at: string
          id: string
          sent_at: string | null
          sent_count: number | null
          status: string
          subject: string
          updated_at: string
        }
        Insert: {
          article_ids?: string[] | null
          body_html?: string
          created_at?: string
          id?: string
          sent_at?: string | null
          sent_count?: number | null
          status?: string
          subject: string
          updated_at?: string
        }
        Update: {
          article_ids?: string[] | null
          body_html?: string
          created_at?: string
          id?: string
          sent_at?: string | null
          sent_count?: number | null
          status?: string
          subject?: string
          updated_at?: string
        }
        Relationships: []
      }
      newsletter_subscribers: {
        Row: {
          confirmation_token: string
          confirmed_at: string | null
          created_at: string
          email: string
          id: string
          status: string
          unsubscribe_token: string
          updated_at: string
        }
        Insert: {
          confirmation_token?: string
          confirmed_at?: string | null
          created_at?: string
          email: string
          id?: string
          status?: string
          unsubscribe_token?: string
          updated_at?: string
        }
        Update: {
          confirmation_token?: string
          confirmed_at?: string | null
          created_at?: string
          email?: string
          id?: string
          status?: string
          unsubscribe_token?: string
          updated_at?: string
        }
        Relationships: []
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
      publish_runs: {
        Row: {
          article_ids: string[]
          error_summary: string | null
          finished_at: string | null
          id: string
          items_created: number
          items_found: number
          notes: string | null
          run_type: string
          sources_ok: number
          sources_total: number
          started_at: string
          status: string
          triggered_by: string | null
        }
        Insert: {
          article_ids?: string[]
          error_summary?: string | null
          finished_at?: string | null
          id?: string
          items_created?: number
          items_found?: number
          notes?: string | null
          run_type: string
          sources_ok?: number
          sources_total?: number
          started_at?: string
          status?: string
          triggered_by?: string | null
        }
        Update: {
          article_ids?: string[]
          error_summary?: string | null
          finished_at?: string | null
          id?: string
          items_created?: number
          items_found?: number
          notes?: string | null
          run_type?: string
          sources_ok?: number
          sources_total?: number
          started_at?: string
          status?: string
          triggered_by?: string | null
        }
        Relationships: []
      }
      rls_audit_log: {
        Row: {
          actor_role: string | null
          actor_user_id: string | null
          command_tag: string | null
          created_at: string
          details: Json
          event_type: string
          id: string
          policy_name: string | null
          request_ip: string | null
          request_path: string | null
          table_name: string | null
        }
        Insert: {
          actor_role?: string | null
          actor_user_id?: string | null
          command_tag?: string | null
          created_at?: string
          details?: Json
          event_type: string
          id?: string
          policy_name?: string | null
          request_ip?: string | null
          request_path?: string | null
          table_name?: string | null
        }
        Update: {
          actor_role?: string | null
          actor_user_id?: string | null
          command_tag?: string | null
          created_at?: string
          details?: Json
          event_type?: string
          id?: string
          policy_name?: string | null
          request_ip?: string | null
          request_path?: string | null
          table_name?: string | null
        }
        Relationships: []
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
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
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
      tag_rules: {
        Row: {
          active: boolean
          category_slug: string | null
          created_at: string
          id: string
          match_type: string
          name: string
          pattern: string
          tags: string[]
          updated_at: string
          weight: number
        }
        Insert: {
          active?: boolean
          category_slug?: string | null
          created_at?: string
          id?: string
          match_type?: string
          name: string
          pattern: string
          tags?: string[]
          updated_at?: string
          weight?: number
        }
        Update: {
          active?: boolean
          category_slug?: string | null
          created_at?: string
          id?: string
          match_type?: string
          name?: string
          pattern?: string
          tags?: string[]
          updated_at?: string
          weight?: number
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
      confirm_newsletter_subscription: {
        Args: { _token: string }
        Returns: boolean
      }
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      email_queue_dispatch: { Args: never; Returns: undefined }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      get_public_comments: {
        Args: { _article_id: string }
        Returns: {
          author_name: string
          content: string
          created_at: string
          id: string
          is_mine: boolean
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      is_staff: { Args: { _user_id: string }; Returns: boolean }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
      unsubscribe_newsletter: { Args: { _token: string }; Returns: boolean }
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
