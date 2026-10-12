"use client";

import React, { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Navbar } from "@/components/navbar";
import { BottomNav } from "@/components/bottom-nav";
import { AnimeCard } from "@/components/anime-card";
import { SkeletonCard } from "@/components/skeletons";
import {
  Filter,
  Search,
  RotateCcw,
  Sparkles,
  Flame,
  Star,
  Clock,
  Layers,
  ChevronDown,
  Loader2,
} from "lucide-react";
import { Anime } from "@/types/anime";

const GENRES = [
  "Barchasi",
  "Shounen",
  "Jangari",
  "Romantika",
  "Komediya",
  "Drama",
  "Fantastika",
  "Sarguzasht",
  "Sehr-jodu",
  "Isekai",
  "Detektiv",
  "Psixologik",
  "Kundalik hayot",
];

const YEARS = ["Barchasi", "2025", "2024", "2023", "2022", "2021", "2020"];

const STATUSES = [
  { label: "Barchasi", value: "all" },
  { label: "Ongoing", value: "ongoing" },
  { label: "Completed", value: "completed" },
];

const SORTS = [
  { label: "Eng ommabop", value: "popular", icon: Flame },
  { label: "Yuqori reyting", value: "score", icon: Star },
  { label: "Yangi qo'shilgan", value: "newest", icon: Clock },
  { label: "Alifbo bo'yicha", value: "title", icon: Layers },
];

function CatalogContent() {
  const searchParams = useSearchParams();

  // Filter States
  const [selectedGenre, setSelectedGenre] = useState<string>("Barchasi");
  const [selectedYear, setSelectedYear] = useState<string>("Barchasi");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [selectedSort, setSelectedSort] = useState<string>("popular");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [showArchive, setShowArchive] = useState<boolean>(false);

  const [animes, setAnimes] = useState<Anime[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);

  // Initialize from URL params if present
  useEffect(() => {
    const genreParam = searchParams.get("genre");
    if (genreParam) {
      setSelectedGenre(genreParam);
    }
    const sortParam = searchParams.get("sort");
    if (sortParam) {
      if (sortParam === "recent") setSelectedSort("newest");
      else if (sortParam === "rating") setSelectedSort("score");
      else setSelectedSort(sortParam);
    }
    const qParam = searchParams.get("q");
    if (qParam) {
      setSearchQuery(qParam);
    }
    const archiveParam = searchParams.get("archive");
    if (archiveParam === "true" || archiveParam === "1") {
      setShowArchive(true);
    }
  }, [searchParams]);

  // Fetch catalog data
  const fetchCatalog = useCallback(async (pageNum: number = 1, append: boolean = false) => {
    if (append) {
      setIsLoadingMore(true);
    } else {
      setIsLoading(true);
    }
    try {
      const params = new URLSearchParams();
      if (selectedGenre && selectedGenre !== "Barchasi") {
        params.set("genre", selectedGenre.toLowerCase());
      }
      if (selectedYear && selectedYear !== "Barchasi") {
        params.set("year", selectedYear);
      }
      if (selectedStatus && selectedStatus !== "all") {
        params.set("status", selectedStatus);
      }
      if (selectedSort) {
        params.set("sort", selectedSort);
      }
      if (searchQuery.trim()) {
        params.set("q", searchQuery.trim());
      }
      if (showArchive) {
        params.set("archive", "true");
      }
      params.set("page", pageNum.toString());
      params.set("limit", "24");

      const res = await fetch(`/api/v1/anime/catalog?${params.toString()}`);
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        if (append) {
          setAnimes((prev) => [...prev, ...json.data]);
        } else {
          setAnimes(json.data);
        }
        setTotalCount(json.total || 0);
        setCurrentPage(json.page || pageNum);
        setTotalPages(json.total_pages || 1);
      } else {
        if (!append) {
          setAnimes([]);
          setTotalCount(0);
        }
      }
    } catch (err) {
      console.error("Failed to load catalog:", err);
      if (!append) {
        setAnimes([]);
        setTotalCount(0);
      }
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  }, [selectedGenre, selectedYear, selectedStatus, selectedSort, searchQuery, showArchive]);

  useEffect(() => {
    setCurrentPage(1);
    fetchCatalog(1, false);
  }, [fetchCatalog]);

  const handleLoadMore = () => {
    if (currentPage < totalPages && !isLoadingMore) {
      const nextPage = currentPage + 1;
      fetchCatalog(nextPage, true);
    }
  };

  const handleResetFilters = () => {
    setSelectedGenre("Barchasi");
    setSelectedYear("Barchasi");
    setSelectedStatus("all");
    setSelectedSort("popular");
    setSearchQuery("");
  };

  const isFiltered =
    selectedGenre !== "Barchasi" ||
    selectedYear !== "Barchasi" ||
    selectedStatus !== "all" ||
    selectedSort !== "popular" ||
    searchQuery.trim() !== "";

  return (
    <div className="min-h-screen bg-[#060911] text-slate-100 flex flex-col selection:bg-rose-500 selection:text-white">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-24 sm:pt-28 pb-20 space-y-6">
        {/* Header Title */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-white/10">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-6 rounded-full bg-gradient-to-b from-rose-500 to-pink-600 shadow-neon" />
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-black text-white tracking-tight">
                Anime Katalogi
              </h1>
            </div>
            <p className="text-xs text-slate-400">
              Barcha animelarni qulay filtrlash, janrlar va reyting bo&apos;yicha saralash
            </p>
          </div>

          {/* Quick Search Input */}
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Katalogdan qidirish..."
              className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-[#090e1c] border border-white/10 focus:border-rose-500/50 text-xs text-white placeholder-slate-500 outline-none transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-500 hover:text-white"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Filter Toolbar (Cyber-Glass Box) */}
        <div className="p-4 sm:p-5 rounded-3xl bg-[#090e1c]/90 border border-white/10 backdrop-blur-2xl shadow-xl space-y-4">
          {/* Top Row: Genres Horizontal Pills */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-cyan-400" /> Janrlar:
              </span>
              {isFiltered && (
                <button
                  onClick={handleResetFilters}
                  className="text-[11px] font-bold text-rose-400 hover:text-rose-300 flex items-center gap-1 transition-colors"
                >
                  <RotateCcw className="w-3 h-3" /> Tozalash
                </button>
              )}
            </div>

            <div className="flex gap-1.5 sm:gap-2 overflow-x-auto sm:flex-wrap pb-1.5 sm:pb-0 scrollbar-none">
              {GENRES.map((genre) => {
                const active = selectedGenre.toLowerCase() === genre.toLowerCase();
                return (
                  <button
                    key={genre}
                    onClick={() => setSelectedGenre(genre)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      active
                        ? "bg-rose-600 text-white shadow-[0_0_15px_rgba(225,29,72,0.4)] scale-105"
                        : "bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10"
                    }`}
                  >
                    {genre}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Bottom Row: Selectors (Year, Status, Sort) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2 border-t border-white/5">
            {/* Year Selector */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Yil
              </label>
              <div className="relative">
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value)}
                  className="w-full appearance-none px-3 py-2 rounded-xl bg-[#04060b] border border-white/10 text-xs text-slate-200 font-semibold focus:border-rose-500/50 outline-none pr-8 cursor-pointer"
                >
                  {YEARS.map((y) => (
                    <option key={y} value={y} className="bg-[#090e1c] text-white">
                      {y === "Barchasi" ? "Barcha Yillar" : y}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500 pointer-events-none" />
              </div>
            </div>

            {/* Status Selector */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Holati
              </label>
              <div className="relative">
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="w-full appearance-none px-3 py-2 rounded-xl bg-[#04060b] border border-white/10 text-xs text-slate-200 font-semibold focus:border-rose-500/50 outline-none pr-8 cursor-pointer"
                >
                  {STATUSES.map((s) => (
                    <option key={s.value} value={s.value} className="bg-[#090e1c] text-white">
                      {s.label}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500 pointer-events-none" />
              </div>
            </div>

            {/* Sort Selector */}
            <div className="space-y-1 col-span-2 sm:col-span-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Saralash
              </label>
              <div className="flex items-center gap-1.5">
                {SORTS.map((st) => {
                  const active = selectedSort === st.value;
                  const Icon = st.icon;
                  return (
                    <button
                      key={st.value}
                      onClick={() => setSelectedSort(st.value)}
                      className={`flex-1 flex items-center justify-center gap-1 px-2.5 py-2 rounded-xl text-xs font-bold transition-all ${
                        active
                          ? "bg-white/15 text-white border border-rose-500/40 shadow-sm"
                          : "bg-[#04060b] text-slate-400 hover:text-white border border-white/10"
                      }`}
                    >
                      <Icon className={`w-3 h-3 ${active ? "text-rose-400" : ""}`} />
                      <span className="truncate">{st.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Results Counter & Archive Toggle */}
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400 px-1">
          <div className="flex items-center gap-2">
            <span>
              Topilgan animelar: <strong className="text-white font-bold">{totalCount}</strong> ta
            </span>
            {isFiltered && (
              <span className="text-[11px] text-rose-400 font-semibold">• Filtrlar faol</span>
            )}
          </div>

          {/* Mode Switcher: Qismli vs Arxiv */}
          <div className="inline-flex items-center p-1 rounded-xl bg-[#04060b] border border-white/10 shadow-inner">
            <button
              type="button"
              onClick={() => {
                setShowArchive(false);
                setCurrentPage(1);
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                !showArchive
                  ? "bg-gradient-to-r from-rose-600 to-rose-500 text-white shadow-neon"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Flame className="w-3.5 h-3.5" />
              <span>Faqat Qismi Borlar</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setShowArchive(true);
                setCurrentPage(1);
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                showArchive
                  ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Barcha Animelar (Arxiv)</span>
            </button>
          </div>
        </div>

        {/* Anime Grid */}
        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-5">
            {[...Array(10)].map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : animes.length > 0 ? (
          <div className="space-y-6">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-5 animate-fade-in">
              {animes.map((anime) => (
                <AnimeCard key={anime.id} anime={anime} />
              ))}
            </div>

            {animes.length < totalCount && (
              <div className="flex flex-col items-center justify-center pt-4 pb-2 space-y-2">
                <button
                  type="button"
                  onClick={handleLoadMore}
                  disabled={isLoadingMore}
                  className="inline-flex items-center gap-2 px-8 py-3.5 rounded-2xl bg-gradient-to-r from-rose-600 via-pink-600 to-rose-600 text-white font-bold text-xs sm:text-sm shadow-[0_0_25px_rgba(225,29,72,0.35)] hover:shadow-[0_0_35px_rgba(225,29,72,0.5)] transition-all hover:scale-105 active:scale-95 disabled:opacity-50 cursor-pointer"
                >
                  {isLoadingMore ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Yuklanmoqda...</span>
                    </>
                  ) : (
                    <>
                      <ChevronDown className="w-4 h-4" />
                      <span>Yana 24 ta anime yuklash</span>
                    </>
                  )}
                </button>
                <p className="text-[11px] text-slate-400 font-medium">
                  Ko&apos;rsatildi: <span className="text-white font-bold">{animes.length}</span> / {totalCount} ta anime
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-20 px-4 rounded-3xl bg-[#090e1c]/50 border border-white/5 space-y-4">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-white/5 flex items-center justify-center text-slate-500 border border-white/10">
              <Filter className="w-7 h-7 text-slate-400" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-white">Mos anime topilmadi</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Tanlangan filtrlarga mos keluvchi animelar mavjud emas. Filtrlarni tozalab ko&apos;ring.
              </p>
            </div>
            <button
              onClick={handleResetFilters}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-pink-600 text-white font-bold text-xs shadow-neon transition-all active:scale-95"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Filtrlarni Tozalash
            </button>
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  );
}

export default function CatalogPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#060911]" />}>
      <CatalogContent />
    </Suspense>
  );
}
