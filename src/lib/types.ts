export type ArticleCategory = { name: string; slug: string } | null;

export type ArticleCard = {
  id: string;
  title: string;
  subtitle?: string | null;
  slug: string;
  excerpt?: string | null;
  featured_image: string;
  is_breaking?: boolean;
  is_featured?: boolean;
  read_time_mins?: number;
  published_at?: string | null;
  views_count?: number;
  category: ArticleCategory;
};
