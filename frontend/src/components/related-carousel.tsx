"use client";

import React, { useRef } from "react";
import { AnimeCard } from "@/components/anime-card";
import { Sparkles, ChevronLeft, ChevronRight } from "lucide-react";
import { Anime } from "@/types/anime";

interface RelatedCarouselProps {
  animes: Anime[];
  title?: string;
  subtitle?: string;
}

export const RelatedCarousel: React.FC<RelatedCarouselProps> = ({
  animes,
  title = "Shunga O'xshash Tavsiyalar",
  subtitle = "Janrlar va reyting bo'yicha sizga yoqishi mumkin bo'lgan animelar",
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  if (!animes || animes.length === 0) return null;

  const scroll = (direction: "left" | "right") => {
    if (scrollRef.current) {
      const scrollAmount = direction === "left" ? -280 : 280;
      scrollRef.current.scrollBy({ left: scrollAmount, behavior: "smooth" });
    }
  };

  return (
    <section className="relative w-full max-w-full my-6 sm:my-10 space-y-3 sm:space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between px-1">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <span className="w-2 h-5 sm:w-2.5 sm:h-6 rounded-full bg-gradient-to-b from-purple-500 to-rose-500 shadow-neon" />
            <h2 className="text-sm sm:text-lg font-black text-white flex items-center gap-1.5 sm:gap-2">
              <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-purple-400" />
              <span>{title}</span>
            </h2>
          </div>
          <p className="text-[10px] sm:text-xs text-slate-400 pl-3 sm:pl-4 line-clamp-1">{subtitle}</p>
        </div>

        {/* Custom Nav Arrows */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => scroll("left")}
            className="p-1.5 sm:p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-400 hover:text-white transition-all active:scale-95"
            aria-label="Oldingi"
          >
            <ChevronLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </button>
          <button
            onClick={() => scroll("right")}
            className="p-1.5 sm:p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-400 hover:text-white transition-all active:scale-95"
            aria-label="Keyingi"
          >
            <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </button>
        </div>
      </div>

      {/* Smooth Touch & Snap Horizontal Scroll Container */}
      <div
        ref={scrollRef}
        className="flex items-stretch gap-2.5 sm:gap-4 overflow-x-auto scrollbar-none pb-2 pt-1 px-1 -mx-1 snap-x snap-mandatory scroll-smooth"
      >
        {animes.map((anime) => (
          <div
            key={anime.id}
            className="w-[135px] sm:w-[165px] md:w-[195px] shrink-0 snap-start"
          >
            <AnimeCard anime={anime} />
          </div>
        ))}
      </div>
    </section>
  );
};
