"use client";

import React from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation, FreeMode, Mousewheel } from "swiper/modules";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Anime } from "@/types/anime";
import { AnimeCard } from "@/components/anime-card";

interface AnimeCarouselProps {
  animes: Anime[];
  id: string;
  showRank?: boolean;
}

export const AnimeCarousel: React.FC<AnimeCarouselProps> = ({ animes, id, showRank = false }) => {
  if (!animes || animes.length === 0) return null;

  return (
    <div className="relative w-full group overflow-hidden py-1">
      <Swiper
        modules={[Navigation, FreeMode, Mousewheel]}
        spaceBetween={10}
        slidesPerView={2.15}
        freeMode={{
          enabled: true,
          momentum: true,
          momentumRatio: 0.85,
        }}
        mousewheel={{
          forceToAxis: true,
        }}
        navigation={{
          nextEl: `.swiper-next-${id}`,
          prevEl: `.swiper-prev-${id}`,
        }}
        breakpoints={{
          320: { slidesPerView: 2.15, spaceBetween: 8 },
          375: { slidesPerView: 2.3, spaceBetween: 10 },
          480: { slidesPerView: 2.8, spaceBetween: 12 },
          640: { slidesPerView: 3.8, spaceBetween: 14 },
          768: { slidesPerView: 4.8, spaceBetween: 16 },
          1024: { slidesPerView: 5.8, spaceBetween: 18 },
          1280: { slidesPerView: 6.8, spaceBetween: 20 },
        }}
        className="w-full py-2"
      >
        {animes.map((anime, idx) => (
          <SwiperSlide key={anime.id} className="h-auto">
            <AnimeCard anime={anime} rankNumber={showRank ? idx + 1 : undefined} />
          </SwiperSlide>
        ))}
      </Swiper>

      {/* Floating Modern Navigation Arrows */}
      <button
        aria-label="Oldingi animelarni ko'rish"
        className={`swiper-prev-${id} absolute left-1 sm:left-2 top-1/2 -translate-y-1/2 z-20 w-10 h-10 items-center justify-center rounded-2xl bg-[#0a0d18]/90 backdrop-blur-md border border-white/15 text-white cursor-pointer opacity-0 group-hover:opacity-100 transition-all duration-300 hover:bg-rose-600 hover:scale-110 hover:border-rose-400 shadow-[0_4px_20px_rgba(0,0,0,0.6)] disabled:opacity-0 hidden md:flex`}
      >
        <ChevronLeft className="w-5 h-5" />
      </button>

      <button
        aria-label="Keyingi animelarni ko'rish"
        className={`swiper-next-${id} absolute right-1 sm:right-2 top-1/2 -translate-y-1/2 z-20 w-10 h-10 items-center justify-center rounded-2xl bg-[#0a0d18]/90 backdrop-blur-md border border-white/15 text-white cursor-pointer opacity-0 group-hover:opacity-100 transition-all duration-300 hover:bg-rose-600 hover:scale-110 hover:border-rose-400 shadow-[0_4px_20px_rgba(0,0,0,0.6)] disabled:opacity-0 hidden md:flex`}
      >
        <ChevronRight className="w-5 h-5" />
      </button>
    </div>
  );
};
