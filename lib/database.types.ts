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
      areas: {
        Row: {
          created_at: string | null
          id: number
          name: string
          parent_id: number | null
          slug: string | null
        }
        Insert: {
          created_at?: string | null
          id?: number
          name: string
          parent_id?: number | null
          slug?: string | null
        }
        Update: {
          created_at?: string | null
          id?: number
          name?: string
          parent_id?: number | null
          slug?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "areas_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "areas"
            referencedColumns: ["id"]
          },
        ]
      }
      bookmarks: {
        Row: {
          created_at: string
          id: string
          post_id: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          post_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bookmarks_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookmarks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      collections: {
        Row: {
          created_at: string
          id: number
          label: string | null
          origin_id: number | null
          origin_slug: string | null
          season: string | null
          slug: string | null
          title: string | null
          updated_at: string
          year: number | null
        }
        Insert: {
          created_at?: string
          id?: number
          label?: string | null
          origin_id?: number | null
          origin_slug?: string | null
          season?: string | null
          slug?: string | null
          title?: string | null
          updated_at?: string
          year?: number | null
        }
        Update: {
          created_at?: string
          id?: number
          label?: string | null
          origin_id?: number | null
          origin_slug?: string | null
          season?: string | null
          slug?: string | null
          title?: string | null
          updated_at?: string
          year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "collections_origin_id_fkey"
            columns: ["origin_id"]
            isOneToOne: false
            referencedRelation: "origins"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "collections_origin_slug_fkey"
            columns: ["origin_slug"]
            isOneToOne: false
            referencedRelation: "origins"
            referencedColumns: ["slug"]
          },
        ]
      }
      country_histories: {
        Row: {
          content: string | null
          country_id: number | null
          created_at: string
          id: number
          is_visible: boolean | null
          key: string | null
          lang: string | null
          order: number | null
          title: string | null
          type: string | null
          updated_at: string
        }
        Insert: {
          content?: string | null
          country_id?: number | null
          created_at?: string
          id?: number
          is_visible?: boolean | null
          key?: string | null
          lang?: string | null
          order?: number | null
          title?: string | null
          type?: string | null
          updated_at?: string
        }
        Update: {
          content?: string | null
          country_id?: number | null
          created_at?: string
          id?: number
          is_visible?: boolean | null
          key?: string | null
          lang?: string | null
          order?: number | null
          title?: string | null
          type?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      event_follows: {
        Row: {
          created_at: string
          event_slug: string | null
          id: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          event_slug?: string | null
          id?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          event_slug?: string | null
          id?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "event_follows_event_slug_fkey"
            columns: ["event_slug"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["slug"]
          },
          {
            foreignKeyName: "event_follows_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      event_histories: {
        Row: {
          content: string | null
          created_at: string
          event_id: number | null
          id: number
          is_visible: boolean
          key: string
          lang: string
          order: number | null
          title: string | null
          type: string
          updated_at: string
        }
        Insert: {
          content?: string | null
          created_at?: string
          event_id?: number | null
          id?: number
          is_visible?: boolean
          key: string
          lang: string
          order?: number | null
          title?: string | null
          type: string
          updated_at?: string
        }
        Update: {
          content?: string | null
          created_at?: string
          event_id?: number | null
          id?: number
          is_visible?: boolean
          key?: string
          lang?: string
          order?: number | null
          title?: string | null
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_histories_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          country_id: number
          created_at: string
          id: number
          lang: string | null
          name: string | null
          name_ja: string | null
          region_id: number
          search_keywords: string | null
          slug: string
          updated_at: string
        }
        Insert: {
          country_id: number
          created_at?: string
          id?: number
          lang?: string | null
          name?: string | null
          name_ja?: string | null
          region_id: number
          search_keywords?: string | null
          slug: string
          updated_at?: string
        }
        Update: {
          country_id?: number
          created_at?: string
          id?: number
          lang?: string | null
          name?: string | null
          name_ja?: string | null
          region_id?: number
          search_keywords?: string | null
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      follows: {
        Row: {
          created_at: string
          follower_id: string | null
          following_id: string | null
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          follower_id?: string | null
          following_id?: string | null
          id?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          follower_id?: string | null
          following_id?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "follows_follower_id_fkey"
            columns: ["follower_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "follows_following_id_fkey"
            columns: ["following_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      groups: {
        Row: {
          created_at: string
          id: number
          name: string
          name_ja: string | null
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: number
          name: string
          name_ja?: string | null
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: number
          name?: string
          name_ja?: string | null
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      likes: {
        Row: {
          created_at: string
          id: string
          post_id: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          post_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "likes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "likes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      origin_follows: {
        Row: {
          created_at: string
          id: string
          origin_slug: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          origin_slug?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          origin_slug?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "origin_follows_origin_slug_fkey"
            columns: ["origin_slug"]
            isOneToOne: false
            referencedRelation: "origins"
            referencedColumns: ["slug"]
          },
          {
            foreignKeyName: "origin_follows_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      origin_histories: {
        Row: {
          content: string | null
          created_at: string
          id: number
          is_visible: boolean
          key: string
          lang: string
          order: number | null
          origin_id: number | null
          title: string | null
          type: string
          updated_at: string
        }
        Insert: {
          content?: string | null
          created_at?: string
          id?: number
          is_visible?: boolean
          key: string
          lang: string
          order?: number | null
          origin_id?: number | null
          title?: string | null
          type: string
          updated_at?: string
        }
        Update: {
          content?: string | null
          created_at?: string
          id?: number
          is_visible?: boolean
          key?: string
          lang?: string
          order?: number | null
          origin_id?: number | null
          title?: string | null
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "origin_histories_origin_id_fkey"
            columns: ["origin_id"]
            isOneToOne: false
            referencedRelation: "origins"
            referencedColumns: ["id"]
          },
        ]
      }
      origins: {
        Row: {
          area_id: number | null
          country_id: number | null
          created_at: string
          founded_year: number | null
          group_slug: string | null
          id: number
          lang: string | null
          name: string
          name_ja: string | null
          region_id: number | null
          search_keywords: string | null
          slug: string
          type: string | null
          updated_at: string
        }
        Insert: {
          area_id?: number | null
          country_id?: number | null
          created_at?: string
          founded_year?: number | null
          group_slug?: string | null
          id?: number
          lang?: string | null
          name: string
          name_ja?: string | null
          region_id?: number | null
          search_keywords?: string | null
          slug: string
          type?: string | null
          updated_at?: string
        }
        Update: {
          area_id?: number | null
          country_id?: number | null
          created_at?: string
          founded_year?: number | null
          group_slug?: string | null
          id?: number
          lang?: string | null
          name?: string
          name_ja?: string | null
          region_id?: number | null
          search_keywords?: string | null
          slug?: string
          type?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "origins_area_id_fkey"
            columns: ["area_id"]
            isOneToOne: false
            referencedRelation: "areas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "origins_group_slug_fkey"
            columns: ["group_slug"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["slug"]
          },
        ]
      }
      post_tastes: {
        Row: {
          created_at: string
          description: string | null
          post_id: string
          taste_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          post_id: string
          taste_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          post_id?: string
          taste_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_tastes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_tastes_taste_id_fkey"
            columns: ["taste_id"]
            isOneToOne: false
            referencedRelation: "tastes"
            referencedColumns: ["id"]
          },
        ]
      }
      post_views: {
        Row: {
          created_at: string
          id: string
          post_id: string | null
          updated_at: string
          user_id: string | null
          viewed_at: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          post_id?: string | null
          updated_at?: string
          user_id?: string | null
          viewed_at?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string | null
          updated_at?: string
          user_id?: string | null
          viewed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "post_views_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_views_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      posts: {
        Row: {
          collection_slug: string | null
          created_at: string
          description: string | null
          event_slug: string | null
          id: string
          image_urls: string[] | null
          origin_id: number | null
          origin_slug: string | null
          season: string | null
          season_slug: string | null
          status: string | null
          title: string | null
          updated_at: string
          user_id: string | null
          year: number | null
        }
        Insert: {
          collection_slug?: string | null
          created_at?: string
          description?: string | null
          event_slug?: string | null
          id?: string
          image_urls?: string[] | null
          origin_id?: number | null
          origin_slug?: string | null
          season?: string | null
          season_slug?: string | null
          status?: string | null
          title?: string | null
          updated_at?: string
          user_id?: string | null
          year?: number | null
        }
        Update: {
          collection_slug?: string | null
          created_at?: string
          description?: string | null
          event_slug?: string | null
          id?: string
          image_urls?: string[] | null
          origin_id?: number | null
          origin_slug?: string | null
          season?: string | null
          season_slug?: string | null
          status?: string | null
          title?: string | null
          updated_at?: string
          user_id?: string | null
          year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "posts_event_slug_fkey"
            columns: ["event_slug"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["slug"]
          },
          {
            foreignKeyName: "posts_origin_id_fkey"
            columns: ["origin_id"]
            isOneToOne: false
            referencedRelation: "origins"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "posts_origin_slug_fkey"
            columns: ["origin_slug"]
            isOneToOne: false
            referencedRelation: "origins"
            referencedColumns: ["slug"]
          },
          {
            foreignKeyName: "posts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      region_histories: {
        Row: {
          content: string | null
          created_at: string
          id: number
          is_visible: boolean
          key: string | null
          lang: string | null
          order: number | null
          region_id: number | null
          title: string | null
          type: string | null
          updated_at: string
        }
        Insert: {
          content?: string | null
          created_at?: string
          id?: number
          is_visible?: boolean
          key?: string | null
          lang?: string | null
          order?: number | null
          region_id?: number | null
          title?: string | null
          type?: string | null
          updated_at?: string
        }
        Update: {
          content?: string | null
          created_at?: string
          id?: number
          is_visible?: boolean
          key?: string | null
          lang?: string | null
          order?: number | null
          region_id?: number | null
          title?: string | null
          type?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      site_contents: {
        Row: {
          content: string | null
          created_at: string
          id: string
          is_visible: boolean | null
          key: string | null
          lang: string | null
          order: number | null
          title: string | null
          type: string | null
          updated_at: string | null
        }
        Insert: {
          content?: string | null
          created_at?: string
          id?: string
          is_visible?: boolean | null
          key?: string | null
          lang?: string | null
          order?: number | null
          title?: string | null
          type?: string | null
          updated_at?: string | null
        }
        Update: {
          content?: string | null
          created_at?: string
          id?: string
          is_visible?: boolean | null
          key?: string | null
          lang?: string | null
          order?: number | null
          title?: string | null
          type?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      specs: {
        Row: {
          created_at: string
          description: string | null
          id: number
          name: string
          name_ja: string | null
          search_keywords: string | null
          slug: string
          type: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: number
          name: string
          name_ja?: string | null
          search_keywords?: string | null
          slug: string
          type?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: number
          name?: string
          name_ja?: string | null
          search_keywords?: string | null
          slug?: string
          type?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      tastes: {
        Row: {
          created_at: string
          id: string
          name: string
          name_ja: string | null
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          name_ja?: string | null
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          name_ja?: string | null
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      users: {
        Row: {
          avatar_url: string | null
          bio: string | null
          bio_en: string | null
          cover_url: string | null
          created_at: string
          deactivated_at: string | null
          deactivation_reason: string | null
          display_name: string | null
          display_name_en: string | null
          email: string | null
          id: string
          is_active: boolean
          membership_tier: string | null
          role: string | null
          updated_at: string
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          bio_en?: string | null
          cover_url?: string | null
          created_at?: string
          deactivated_at?: string | null
          deactivation_reason?: string | null
          display_name?: string | null
          display_name_en?: string | null
          email?: string | null
          id: string
          is_active?: boolean
          membership_tier?: string | null
          role?: string | null
          updated_at?: string
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          bio_en?: string | null
          cover_url?: string | null
          created_at?: string
          deactivated_at?: string | null
          deactivation_reason?: string | null
          display_name?: string | null
          display_name_en?: string | null
          email?: string | null
          id?: string
          is_active?: boolean
          membership_tier?: string | null
          role?: string | null
          updated_at?: string
          username?: string | null
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
