"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Navbar } from "@/components/navbar";
import { BottomNav } from "@/components/bottom-nav";
import { HeroCarousel } from "@/components/hero-carousel";
import { ContinueWatching } from "@/components/continue-watching";
import { AnimeCarousel } from "@/components/anime-carousel";
import { GenreChips } from "@/components/genre-chips";
import { Flame, Clock, Plus, Film, ChevronRight, Star, Sparkles } from "lucide-react";
import { Anime } from "@/types/anime";
import { useAuth } from "@/context/auth-context";

interface HomePageClientProps {
  initialAnimes: Anime[];
}

export function HomePageClient({ initialAnimes }: HomePageClientProps) {
  const { user } = useAuth();
  const [animes] = useState<Anime[]>(initialAnimes);
  const [selectedGenre, setSelectedGenre] = useState("all");

  const trendingList = animes.filter((a) => a.is_trending);
  const heroList = trendingList.length > 0 ? trendingList : animes;

  // Filtered by selected genre
  const filteredAnimes =
    selectedGenre === "all"
      ? animes
      : animes.filter((a) => {
          if (!a.genres || a.genres.length === 0) return false;
          return a.genres.some((g) =>
            g.toLowerCase().includes(selectedGenre.toLowerCase())
          );
        });

  // Top rated animes
  const topRatedList = [...animes].sort((a, b) => (b.score || 0) - (a.score || 0));

  return (
    <div className="min-h-screen bg-[#060911] text-slate-100 flex flex-col selection:bg-rose-600 selection:text-white w-full max-w-full overflow-x-hidden relative">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-20 sm:pt-24 pb-24 sm:pb-16 space-y-8 sm:space-y-12 overflow-hidden">
        {/* Continue Watching Section (client local storage) */}
        <ContinueWatching />

        {/* Top Hero Cinematic Spotlight */}
        {heroList.length > 0 ? (
          <HeroCarousel animes={heroList} />
        ) : (
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#121624] via-[#0d101c] to-[#070912] border border-white/10 p-8 sm:p-14 text-center space-y-5 shadow-2xl mb-12">
            <div className="w-16 h-16 rounded-2xl bg-rose-600/20 text-rose-500 mx-auto flex items-center justify-center border border-rose-500/30 shadow-neon">
              <Film className="w-8 h-8" />
            </div>
            <div className="space-y-2 max-w-xl mx-auto">
              <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
                Hikaku Anime Platformasiga Xush Kelibsiz!
              </h1>
              <p className="text-xs sm:text-sm text-slate-400">
                Platformada eng so&apos;nggi tarjima qilingan animelar, yuqori sifatli pleyer va professional ovozli epizodlar joylashtirilmoqda.
              </p>
            </div>
            {user?.is_admin && (
              <div className="pt-2">
                <Link
                  href="/admin"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-rose-600 to-rose-500 text-white font-bold text-xs shadow-neon hover:scale-105 transition-all"
                  aria-label="Admin panelga o'tish"
                >
                  <Plus className="w-4 h-4" /> Admin Panelga O&apos;tish & Anime Qo&apos;shish
                </Link>
              </div>
            )}
          </div>
        )}

        {/* Interactive Genre Chips Bar */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-rose-500" />
              <h2 className="text-xs sm:text-sm font-black text-slate-300 uppercase tracking-wider">
                Janrlar Bo&apos;yicha Saralash
              </h2>
            </div>
            {selectedGenre !== "all" && (
              <button
                onClick={() => setSelectedGenre("all")}
                className="text-[11px] font-bold text-rose-400 hover:underline"
                aria-label="Tanlangan janr filtrini tozalash"
              >
                Filtrni tozalash
              </button>
            )}
          </div>
          <GenreChips selectedGenre={selectedGenre} onSelectGenre={setSelectedGenre} />
        </section>

        {/* If Genre Filter Active: Show Filtered Results */}
        {selectedGenre !== "all" && (
          <section className="space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h2 className="text-lg sm:text-xl font-black text-white capitalize">
                {selectedGenre} Janridagi Animelar ({filteredAnimes.length})
              </h2>
            </div>
            {filteredAnimes.length > 0 ? (
              <AnimeCarousel animes={filteredAnimes} id="filtered-genre" />
            ) : (
              <p className="text-xs text-slate-400 py-6 text-center">
                Ushbu janrda hozircha animelar topilmadi.
              </p>
            )}
          </section>
        )}

        {/* Trending Section */}
        {animes.length > 0 && (
          <section id="trending" className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-gradient-to-br from-rose-600/30 to-rose-600/10 text-rose-500 border border-rose-500/30 shadow-neon">
                  <Flame className="w-5 h-5 fill-rose-500" />
                </div>
                <div>
                  <h2 className="text-lg sm:text-2xl font-black text-white tracking-tight">Trenddagi Animelar</h2>
                  <p className="text-xs text-slate-400 font-medium">Hozirda eng ko&apos;p tomosha qilinayotgan durdonalar</p>
                </div>
              </div>
              <Link
                href="/katalog"
                className="group flex items-center gap-1.5 text-xs font-bold text-slate-300 hover:text-rose-400 transition-colors"
                aria-label="Trenddagi barcha animelarni ko'rish"
              >
                Barchasi <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>

            <AnimeCarousel animes={trendingList.length > 0 ? trendingList : animes} id="trending" showRank={true} />
          </section>
        )}

        {/* Recent New Episodes Section */}
        {animes.length > 0 && (
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-gradient-to-br from-cyan-500/30 to-cyan-500/10 text-cyan-400 border border-cyan-500/30 shadow-[0_0_20px_rgba(6,182,212,0.3)]">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg sm:text-2xl font-black text-white tracking-tight">Yangi Qo&apos;shilgan Qismlar</h2>
                  <p className="text-xs text-slate-400 font-medium">Bu hafta joylangan yangi epizodlar</p>
                </div>
              </div>
              <Link
                href="/katalog?sort=newest"
                className="group flex items-center gap-1.5 text-xs font-bold text-slate-300 hover:text-cyan-400 transition-colors"
                aria-label="Yangi qo'shilgan barcha animelarni ko'rish"
              >
                Barchasi <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>

            <AnimeCarousel animes={animes} id="recent" />
          </section>
        )}

        {/* Top Rated Section */}
        {topRatedList.length > 0 && (
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-gradient-to-br from-amber-500/30 to-amber-500/10 text-amber-400 border border-amber-500/30 shadow-[0_0_20px_rgba(245,158,11,0.3)]">
                  <Star className="w-5 h-5 fill-amber-400" />
                </div>
                <div>
                  <h2 className="text-lg sm:text-2xl font-black text-white tracking-tight">Eng Yuqori Baholanganlar</h2>
                  <p className="text-xs text-slate-400 font-medium">Muxlislar tomonidan eng sevilgan animelar</p>
                </div>
              </div>
              <Link
                href="/katalog?sort=score"
                className="group flex items-center gap-1.5 text-xs font-bold text-slate-300 hover:text-amber-400 transition-colors"
                aria-label="Eng yuqori baholangan barcha animelarni ko'rish"
              >
                Barchasi <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>

            <AnimeCarousel animes={topRatedList} id="top-rated" />
          </section>
        )}
      </main>

      <BottomNav />
    </div>
  );
}
