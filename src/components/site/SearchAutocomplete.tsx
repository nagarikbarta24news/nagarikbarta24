import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Search as SearchIcon, X as XIcon, Loader2 } from "lucide-react";
import { searchArticles } from "@/lib/news.functions";

type ArticleHit = {
  id: string;
  title: string;
  slug: string;
  excerpt?: string | null;
  featured_image?: string | null;
  category?: { name?: string; slug?: string } | null;
};

/**
 * Instant search input with debounced autosuggest dropdown.
 * Works on the header (desktop) and on the /search results page.
 * Enter submits to /search?q=..., ↑/↓ navigates suggestions, Esc closes.
 */
export function SearchAutocomplete({
  className = "",
  placeholder = "খবর খুঁজুন…",
  defaultValue = "",
  autoFocus = false,
  onSelect,
}: {
  className?: string;
  placeholder?: string;
  defaultValue?: string;
  autoFocus?: boolean;
  onSelect?: () => void;
}) {
  const navigate = useNavigate();
  const [term, setTerm] = useState(defaultValue);
  const [debounced, setDebounced] = useState(defaultValue);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);

  // Debounce input by 200ms so we don't hammer the server on every keystroke.
  useEffect(() => {
    const id = setTimeout(() => setDebounced(term.trim()), 200);
    return () => clearTimeout(id);
  }, [term]);

  const enabled = debounced.length >= 2;
  const { data, isFetching } = useQuery({
    queryKey: ["search-suggest", debounced],
    queryFn: () => searchArticles({ data: { q: debounced, category: "" } }),
    enabled,
    staleTime: 60_000,
  });

  const hits = useMemo(() => {
    const list = (data?.articles ?? []) as unknown as ArticleHit[];
    return list.slice(0, 6);
  }, [data]);

  // Close on outside click.
  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const submitAll = () => {
    setOpen(false);
    onSelect?.();
    navigate({ to: "/search", search: { q: term.trim(), category: "" } });
  };

  const onKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setActive((i) => Math.min(hits.length - 1, i + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(-1, i - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const pick = hits[active];
      if (pick && pick.category?.slug) {
        setOpen(false);
        onSelect?.();
        navigate({
          to: "/$category/$slug",
          params: { category: pick.category.slug, slug: pick.slug },
        });
      } else {
        submitAll();
      }
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <div className="relative">
        <SearchIcon
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <input
          type="search"
          value={term}
          placeholder={placeholder}
          autoFocus={autoFocus}
          onChange={(e) => {
            setTerm(e.target.value);
            setOpen(true);
            setActive(-1);
          }}
          onFocus={() => enabled && setOpen(true)}
          onKeyDown={onKey}
          aria-label="খবর অনুসন্ধান"
          aria-autocomplete="list"
          aria-expanded={open}
          className="h-10 w-full rounded-full border border-border bg-background pl-9 pr-9 text-sm font-medium text-foreground shadow-sm outline-none transition focus:border-news-red focus:ring-2 focus:ring-news-red/20"
        />
        {term && (
          <button
            type="button"
            onClick={() => {
              setTerm("");
              setDebounced("");
              setOpen(false);
            }}
            aria-label="মুছুন"
            className="absolute right-2 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <XIcon className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {open && enabled && (
        <div
          role="listbox"
          className="absolute left-0 right-0 top-full z-50 mt-2 max-h-[70vh] overflow-y-auto rounded-xl border border-border bg-background shadow-2xl ring-1 ring-black/5 animate-fade-in"
        >
          {isFetching && hits.length === 0 && (
            <div className="flex items-center gap-2 px-4 py-3 text-sm text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> খোঁজা হচ্ছে…
            </div>
          )}

          {!isFetching && hits.length === 0 && (
            <div className="px-4 py-3 text-sm text-muted-foreground">কোনো ফলাফল পাওয়া যায়নি</div>
          )}

          {hits.length > 0 && (
            <ul className="py-1">
              {hits.map((h, i) => (
                <li key={h.id}>
                  <Link
                    to="/$category/$slug"
                    params={{
                      category: h.category?.slug ?? "national",
                      slug: h.slug,
                    }}
                    onClick={() => {
                      setOpen(false);
                      onSelect?.();
                    }}
                    role="option"
                    aria-selected={i === active}
                    className={`flex items-start gap-3 px-3 py-2.5 text-sm transition-colors ${
                      i === active ? "bg-muted" : "hover:bg-muted/60"
                    }`}
                  >
                    {h.featured_image && (
                      <img
                        src={h.featured_image}
                        alt=""
                        loading="lazy"
                        className="h-12 w-16 flex-shrink-0 rounded object-cover"
                      />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-2 font-semibold leading-snug text-foreground">
                        {h.title}
                      </p>
                      {h.category?.name && (
                        <p className="mt-0.5 text-[11px] font-semibold uppercase tracking-wider text-news-red">
                          {h.category.name}
                        </p>
                      )}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}

          <button
            type="button"
            onClick={submitAll}
            className="block w-full border-t border-border px-4 py-2.5 text-left text-sm font-semibold text-news-red hover:bg-muted"
          >
            "{term.trim()}" দিয়ে সব ফলাফল দেখুন →
          </button>
        </div>
      )}
    </div>
  );
}
