"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Search,
  X,
  Star,
  Film,
  Flame,
  Clock,
  ExternalLink,
  ChevronRight,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import { Anime } from "@/types/anime";
import { SkeletonSearch } from "@/components/skeletons";
import { useSearch } from "@/context/search-context";

interface SearchModalProps {
  isOpen?: boolean;
  onClose?: () => void;
}

const POPULAR_GENRES = [
  "Shounen",
  "Jangari",
  "Romantika",
  "Fantastika",
  "Isekai",
  "Drama",
  "Komediya",
  "Sarguzasht",
];

const SEARCH_HISTORY_KEY = "hikaku_recent_searches";

export const SearchModal: React.FC<SearchModalProps> = ({
  isOpen: propIsOpen,
  onClose: propOnClose,
}) => {
  const router = useRouter();
  const contextSearch = useSearch();

  // Support both context and explicit props
  const isOpen = propIsOpen !== undefined ? propIsOpen : contextSearch.isSearchOpen;
  const handleClose = () => {
    if (propOnClose) propOnClose();
    contextSearch.closeSearch();
  };

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Anime[]>([]);
  const [trendingPicks, setTrendingPicks] = useState<Anime[]>([]);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);

  const inputRef = useRef<HTMLInputElement | null>(null);

  // Load recent searches from localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem(SEARCH_HISTORY_KEY);
        if (saved) {
          setRecentSearches(JSON.parse(saved).slice(0, 6));
        }
      } catch (e) {
        console.error("Failed to load search history", e);
      }
    }
  }, [isOpen]);

  // Load trending picks for empty state
  useEffect(() => {
    if (isOpen && trendingPicks.length === 0) {
      fetch("/api/v1/anime/recent")
        .then((res) => res.json())
        .then((data) => {
          if (data.success && Array.isArray(data.data)) {
            setTrendingPicks(data.data.slice(0, 4));
          }
        })
        .catch((err) => console.error("Failed to load trending picks", err));
    }
  }, [isOpen, trendingPicks.length]);

  // Focus input on open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 60);
      setSelectedIndex(-1);
    } else {
      setQuery("");
      setResults([]);
      setSelectedIndex(-1);
    }
  }, [isOpen]);

  // Save a search term to history
  const saveSearchTerm = (term: string) => {
    const trimmed = term.trim();
    if (!trimmed) return;
    try {
      const updated = [trimmed, ...recentSearches.filter((s) => s.toLowerCase() !== trimmed.toLowerCase())].slice(0, 6);
      setRecentSearches(updated);
      localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(updated));
    } catch (e) {
      console.error(e);
    }
  };

  // Clear history
  const clearHistory = () => {
    try {
      localStorage.removeItem(SEARCH_HISTORY_KEY);
      setRecentSearches([]);
    } catch (e) {
      console.error(e);
    }
  };

  // Debounced search query
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setSelectedIndex(-1);
      return;
    }
    const timer = setTimeout(async () => {
      setIsLoading(true);
      try {
        const res = await fetch(`/api/v1/anime/search?q=${encodeURIComponent(query.trim())}`);
        const data = await res.json();
        if (data.success) {
          setResults(data.data || []);
          setSelectedIndex(-1);
        }
      } catch (err) {
        console.error("Search error:", err);
      } finally {
        setIsLoading(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [query]);

  // Keyboard navigation inside modal
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (results.length > 0) {
        setSelectedIndex((prev) => (prev < results.length - 1 ? prev + 1 : 0));
      }
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (results.length > 0) {
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : results.length - 1));
      }
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (selectedIndex >= 0 && selectedIndex < results.length) {
        const target = results[selectedIndex];
        saveSearchTerm(query || target.title_uz);
        handleClose();
        router.push(`/watch/${target.slug || target.id}`);
      } else if (query.trim()) {
        saveSearchTerm(query);
        handleClose();
        router.push(`/katalog?q=${encodeURIComponent(query.trim())}`);
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      handleClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      onClick={handleClose}
      className="fixed inset-0 z-50 flex items-start justify-center pt-10 sm:pt-20 px-3 sm:px-4 bg-[#030712]/80 backdrop-blur-xl animate-fade-in"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
        className="relative w-full max-w-2xl bg-[#090e1c]/95 border border-white/15 rounded-3xl shadow-[0_20px_70px_rgba(0,0,0,0.9),0_0_40px_rgba(225,29,72,0.15)] overflow-hidden flex flex-col max-h-[85vh] sm:max-h-[80vh]"
      >
        {/* Input Header */}
        <div className="flex items-center px-4 sm:px-5 py-3.5 sm:py-4 border-b border-white/10 bg-[#0f152a]/70 shrink-0 gap-3">
          <div className="w-8 h-8 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 shrink-0">
            <Search className="w-4 h-4" />
          </div>
          <input
            ref={inputRef}
            type="text"
            placeholder="Anime nomi, personaj yoki janr kiriting..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 bg-transparent text-white text-sm sm:text-base placeholder-slate-500 focus:outline-none min-w-0"
          />
          {query && (
            <button
              onClick={() => {
                setQuery("");
                setResults([]);
                inputRef.current?.focus();
              }}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
              title="Tozalash"
              aria-label="Qidiruv matnini tozalash"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={handleClose}
            className="hidden sm:flex items-center gap-1 text-[11px] font-mono bg-white/10 hover:bg-white/20 text-slate-300 px-2.5 py-1 rounded-lg border border-white/10 transition-colors"
            aria-label="Qidiruvni yopish (ESC tugmasi)"
          >
            <span>ESC</span>
          </button>
          <button
            onClick={handleClose}
            className="sm:hidden p-1.5 text-slate-400 hover:text-white"
            aria-label="Qidiruv darchasini yopish"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-3.5 sm:p-5 space-y-4 overscroll-contain">
          {isLoading ? (
            <SkeletonSearch />
          ) : results.length > 0 ? (
            /* Live Search Results */
            <div className="space-y-2">
              <div className="flex items-center justify-between px-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                <span>Topilgan animelar ({results.length})</span>
                <span className="text-rose-400 text-[10px] lowercase">Enter - ko&apos;rish</span>
              </div>
              <div className="space-y-1.5">
                {results.map((anime, idx) => {
                  const isSelected = selectedIndex === idx;
                  return (
                    <Link
                      key={anime.id}
                      href={`/watch/${anime.slug || anime.id}`}
                      onClick={() => {
                        saveSearchTerm(query || anime.title_uz);
                        handleClose();
                      }}
                      onMouseEnter={() => setSelectedIndex(idx)}
                      className={`flex items-center gap-3.5 p-2 sm:p-2.5 rounded-2xl border transition-all group ${
                        isSelected
                          ? "bg-rose-500/15 border-rose-500/50 shadow-[0_0_20px_rgba(225,29,72,0.2)]"
                          : "bg-white/[0.02] hover:bg-white/[0.06] border-white/5 hover:border-white/15"
                      }`}
                    >
                      {/* Poster */}
                      <div className="relative w-12 h-16 sm:w-13 sm:h-18 rounded-xl overflow-hidden bg-slate-900 shrink-0 border border-white/10">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={anime.poster_url || "/placeholder-anime.png"}
                          alt={anime.title_uz}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        {anime.score ? (
                          <div className="absolute top-1 right-1 bg-black/80 backdrop-blur-sm px-1 py-0.5 rounded text-[9px] font-black text-amber-400 flex items-center gap-0.5">
                            <Star className="w-2.5 h-2.5 fill-amber-400" />
                            <span>{anime.score.toFixed(1)}</span>
                          </div>
                        ) : null}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <h4 className={`text-xs sm:text-sm font-bold truncate transition-colors ${
                          isSelected ? "text-rose-400" : "text-white group-hover:text-rose-400"
                        }`}>
                          {anime.title_uz}
                        </h4>
                        <p className="text-[11px] text-slate-400 truncate mt-0.5">
                          {anime.title_en || anime.title_jp || "Hikaku Dub"}
                        </p>
                        <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-1.5 flex-wrap">
                          {anime.year && (
                            <span className="bg-white/5 px-1.5 py-0.5 rounded border border-white/5">
                              {anime.year}
                            </span>
                          )}
                          {anime.episodes_count ? (
                            <span className="bg-white/5 px-1.5 py-0.5 rounded border border-white/5">
                              {anime.episodes_count} qism
                            </span>
                          ) : null}
                          {anime.genres?.[0] && (
                            <span className="text-cyan-400 font-semibold">
                              {anime.genres[0]}
                            </span>
                          )}
                          {anime.status && (
                            <span className={`font-semibold ${
                              anime.status.toUpperCase() === "COMPLETED" ? "text-emerald-400" : "text-amber-400"
                            }`}>
                              {anime.status.toUpperCase() === "COMPLETED" ? "Tugallangan" : "Davom etmoqda"}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="shrink-0 pr-1 text-slate-500 group-hover:text-rose-400 transition-colors">
                        <ChevronRight className="w-4 h-4" />
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          ) : query ? (
            /* No Results Found */
            <div className="py-10 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto text-slate-400">
                <Search className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-bold text-white">Anime topilmadi</p>
                <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                  &ldquo;{query}&rdquo; bo&apos;yicha hech narsa topilmadi. Boshqa so&apos;z yoki janr bilan urinib ko&apos;ring.
                </p>
              </div>
              <Link
                href={`/katalog?q=${encodeURIComponent(query.trim())}`}
                onClick={handleClose}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-rose-400 hover:text-rose-300 bg-rose-500/10 border border-rose-500/30 px-3.5 py-1.5 rounded-xl transition-all"
              >
                <span>Katalogda qidirish</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          ) : (
            /* Empty State: Recent Searches, Popular Genres, Trending Picks */
            <div className="space-y-5 py-1">
              {/* Recent Searches */}
              {recentSearches.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 px-1">
                    <span className="flex items-center gap-1.5">
                      <Clock className="w-3 h-3 text-cyan-400" /> Oxirgi qidiruvlar
                    </span>
                    <button
                      onClick={clearHistory}
                      className="text-[10px] text-slate-500 hover:text-rose-400 transition-colors"
                      aria-label="Qidiruv tarixini tozalash"
                    >
                      Tozalash
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {recentSearches.map((term, i) => (
                      <button
                        key={i}
                        onClick={() => {
                          setQuery(term);
                          inputRef.current?.focus();
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-slate-300 hover:text-white transition-all"
                      >
                        <span>{term}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Popular Genres */}
              <div className="space-y-2">
                <div className="text-[11px] font-bold text-slate-400 px-1 flex items-center gap-1.5">
                  <Sparkles className="w-3 h-3 text-amber-400" /> Ommabop janrlar
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {POPULAR_GENRES.map((genre) => (
                    <button
                      key={genre}
                      onClick={() => {
                        setQuery(genre);
                        inputRef.current?.focus();
                      }}
                      className="px-3 py-1.5 rounded-xl bg-[#12182c] hover:bg-rose-500/20 border border-white/10 hover:border-rose-500/40 text-xs font-semibold text-slate-300 hover:text-rose-300 transition-all"
                    >
                      {genre}
                    </button>
                  ))}
                </div>
              </div>

              {/* Trending Picks */}
              {trendingPicks.length > 0 && (
                <div className="space-y-2.5 pt-1">
                  <div className="text-[11px] font-bold text-slate-400 px-1 flex items-center gap-1.5">
                    <Flame className="w-3.5 h-3.5 text-rose-500 fill-rose-500" /> Tavsiya etilgan trend animelar
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {trendingPicks.map((anime) => (
                      <Link
                        key={anime.id}
                        href={`/watch/${anime.slug || anime.id}`}
                        onClick={handleClose}
                        className="flex items-center gap-2.5 p-2 rounded-2xl bg-white/[0.03] hover:bg-white/[0.07] border border-white/5 hover:border-rose-500/40 transition-all group"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={anime.poster_url || "/placeholder-anime.png"}
                          alt={anime.title_uz}
                          className="w-10 h-14 object-cover rounded-xl bg-slate-900 shrink-0 border border-white/10"
                        />
                        <div className="flex-1 min-w-0">
                          <h5 className="text-xs font-bold text-white group-hover:text-rose-400 truncate transition-colors">
                            {anime.title_uz}
                          </h5>
                          <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-1">
                            {anime.score && (
                              <span className="flex items-center gap-0.5 text-amber-400 font-bold">
                                <Star className="w-2.5 h-2.5 fill-amber-400" />
                                {anime.score.toFixed(1)}
                              </span>
                            )}
                            {anime.genres?.[0] && (
                              <span className="text-slate-400 truncate">
                                {anime.genres[0]}
                              </span>
                            )}
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer (Instant Catalog Link & Key hints) */}
        <div className="px-4 py-2.5 sm:py-3 border-t border-white/10 bg-[#0c1122]/90 flex items-center justify-between text-xs shrink-0">
          {query.trim() ? (
            <Link
              href={`/katalog?q=${encodeURIComponent(query.trim())}`}
              onClick={() => {
                saveSearchTerm(query);
                handleClose();
              }}
              className="text-xs font-bold text-rose-400 hover:text-rose-300 flex items-center gap-1.5 transition-colors"
            >
              <span>Katalogda barcha natijalarni ko&apos;rish &ldquo;{query}&rdquo;</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          ) : (
            <span className="text-[11px] text-slate-400">
              Hikaku Anime aqlli qidiruv tizimi
            </span>
          )}

          <div className="hidden sm:flex items-center gap-2 text-[10px] text-slate-400 font-mono">
            <span><kbd className="bg-white/10 px-1.5 py-0.5 rounded text-slate-300">↑↓</kbd> navigatsiya</span>
            <span><kbd className="bg-white/10 px-1.5 py-0.5 rounded text-slate-300">↵</kbd> ochish</span>
            <span><kbd className="bg-white/10 px-1.5 py-0.5 rounded text-slate-300">esc</kbd> yopish</span>
          </div>
        </div>
      </div>
    </div>
  );
};
