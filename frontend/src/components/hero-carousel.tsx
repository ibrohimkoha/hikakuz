"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, EffectFade, Pagination, Navigation, Parallax } from "swiper/modules";
import { Play, Star, Flame, Info, ChevronLeft, ChevronRight } from "lucide-react";
import { Anime } from "@/types/anime";

interface HeroCarouselProps {
  animes: Anime[];
}

export const HeroCarousel: React.FC<HeroCarouselProps> = ({ animes }) => {
  if (!animes || animes.length === 0) return null;

  return (
    <section 
      aria-label="Eng mashhur animelar karuseli" 
      className="relative w-full h-[48vh] sm:h-[68vh] min-h-[380px] sm:min-h-[540px] max-h-[460px] sm:max-h-[640px] overflow-hidden rounded-2xl sm:rounded-3xl mb-8 sm:mb-12 shadow-2xl border border-white/10 group bg-[#080b14] contain-layout"
    >
      <Swiper
        modules={[Autoplay, EffectFade, Pagination, Navigation, Parallax]}
        effect="fade"
        fadeEffect={{ crossFade: true }}
        speed={900}
        parallax={true}
        autoplay={{
          delay: 6000,
          disableOnInteraction: false,
        }}
        pagination={{
          clickable: true,
          dynamicBullets: true,
        }}
        navigation={{
          nextEl: ".swiper-next-hero",
          prevEl: ".swiper-prev-hero",
        }}
        loop={animes.length > 1}
        className="w-full h-full"
      >
        {animes.map((anime, index) => {
          const imgUrl = anime.banner_url || anime.poster_url || "/placeholder.jpg";
          const isLCP = index === 0;

          return (
            <SwiperSlide key={anime.id} className="relative w-full h-full overflow-hidden select-none">
              {/* Background Backdrop with Optimized Next.js Image */}
              <div
                className="absolute inset-0 overflow-hidden"
                data-swiper-parallax="-200"
              >
                <Image
                  src={imgUrl}
                  alt={anime.title_uz || "Anime banner"}
                  fill
                  priority={isLCP}
                  fetchPriority={isLCP ? "high" : "auto"}
                  loading={isLCP ? "eager" : "lazy"}
                  sizes="(max-width: 480px) 480px, (max-width: 640px) 640px, (max-width: 1024px) 100vw, 1200px"
                  quality={68}
                  className="object-cover object-center transition-transform duration-1000 scale-105 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-[#060911] via-[#060911]/90 sm:via-[#060911]/85 to-transparent z-10" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#060911] via-[#060911]/40 sm:via-transparent to-[#060911]/50 z-10" />
              </div>

              {/* Slide Content: Responsive Padding & Positioning */}
              <div className="relative z-20 w-full h-full flex flex-col justify-end p-5 sm:p-10 lg:p-14 pb-14 sm:pb-14 max-w-3xl space-y-3 sm:space-y-4">
                {/* Badge Row */}
                <div className="flex flex-wrap items-center gap-1.5 sm:gap-2.5" data-swiper-parallax="-250">
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-full text-[10px] sm:text-[11px] font-black tracking-wider uppercase bg-gradient-to-r from-rose-600 to-rose-500 text-white shadow-neon">
                    <Flame className="w-3 h-3 fill-white" /> #{index + 1} TREND
                  </span>

                  {anime.score > 0 && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-black bg-amber-500/20 text-amber-300 border border-amber-500/30 backdrop-blur-md">
                      <Star className="w-3 h-3 fill-amber-400 text-amber-400" /> {anime.score.toFixed(1)}
                    </span>
                  )}

                  <span className="px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-bold bg-white/10 text-slate-200 border border-white/10 backdrop-blur-md">
                    {anime.episodes_count ? `${anime.episodes_count} qism` : "Ongoing"}
                  </span>

                  {anime.status && (
                    <span className="px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 backdrop-blur-md hidden sm:inline-block">
                      {anime.status}
                    </span>
                  )}
                </div>

                {/* Titles */}
                <div className="space-y-1" data-swiper-parallax="-200">
                  <h1 className="text-xl sm:text-3xl lg:text-5xl font-black text-white tracking-tight leading-snug drop-shadow-md line-clamp-2">
                    {anime.title_uz}
                  </h1>
                  {anime.title_en && (
                    <p className="text-[11px] sm:text-xs font-bold text-rose-300/90 tracking-wide uppercase line-clamp-1">
                      {anime.title_en}
                    </p>
                  )}
                </div>

                {/* Synopsis */}
                {anime.synopsis && (
                  <p
                    className="text-xs sm:text-sm text-slate-300/90 line-clamp-2 sm:line-clamp-3 leading-relaxed max-w-2xl font-normal drop-shadow"
                    data-swiper-parallax="-100"
                  >
                    {anime.synopsis}
                  </p>
                )}

                {/* Genres Pills */}
                {anime.genres && anime.genres.length > 0 && (
                  <div className="flex flex-wrap gap-1 sm:gap-1.5 pt-0.5" data-swiper-parallax="-50">
                    {anime.genres.slice(0, 3).map((genre, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-0.5 rounded-lg text-[10px] sm:text-[11px] font-medium bg-white/5 border border-white/10 text-slate-300 backdrop-blur-sm"
                      >
                        {genre}
                      </span>
                    ))}
                  </div>
                )}

                {/* Action Buttons: Touch & Mobile Optimized */}
                <div className="flex items-center gap-2.5 pt-1.5" data-swiper-parallax="0">
                  <Link
                    href={`/watch/${anime.slug || anime.id}`}
                    aria-label={`Tomosha qilish: ${anime.title_uz}`}
                    className="group/btn relative inline-flex items-center justify-center gap-2 flex-1 sm:flex-initial px-5 sm:px-7 py-3 sm:py-3.5 rounded-xl sm:rounded-2xl bg-gradient-to-r from-rose-600 via-rose-500 to-rose-600 text-white font-black text-xs sm:text-sm shadow-[0_0_25px_rgba(225,29,72,0.4)] hover:scale-105 active:scale-95 transition-all duration-300"
                  >
                    <Play className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-white group-hover/btn:scale-110 transition-transform" />
                    <span>Tomosha qilish</span>
                  </Link>

                  <Link
                    href={`/watch/${anime.slug || anime.id}`}
                    aria-label={`Batafsil ma'lumot: ${anime.title_uz}`}
                    className="hidden sm:inline-flex items-center justify-center gap-1.5 px-4 sm:px-5 py-2.5 sm:py-3.5 rounded-xl sm:rounded-2xl bg-white/10 hover:bg-white/15 text-white font-bold text-xs sm:text-sm border border-white/15 backdrop-blur-md hover:scale-105 active:scale-95 transition-all duration-300"
                  >
                    <Info className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-300" />
                    <span>Batafsil</span>
                  </Link>
                </div>
              </div>
            </SwiperSlide>
          );
        })}
      </Swiper>

      {/* Desktop Navigation Arrows */}
      <button
        type="button"
        aria-label="Oldingi slayd"
        className="swiper-prev-hero absolute left-4 top-1/2 -translate-y-1/2 z-30 w-11 h-11 rounded-2xl bg-black/40 hover:bg-rose-600 text-white border border-white/15 backdrop-blur-lg items-center justify-center cursor-pointer opacity-0 group-hover:opacity-100 transition-all duration-300 hover:scale-110 shadow-xl hidden md:flex"
      >
        <ChevronLeft className="w-5 h-5" />
      </button>
      <button
        type="button"
        aria-label="Keyingi slayd"
        className="swiper-next-hero absolute right-4 top-1/2 -translate-y-1/2 z-30 w-11 h-11 rounded-2xl bg-black/40 hover:bg-rose-600 text-white border border-white/15 backdrop-blur-lg items-center justify-center cursor-pointer opacity-0 group-hover:opacity-100 transition-all duration-300 hover:scale-110 shadow-xl hidden md:flex"
      >
        <ChevronRight className="w-5 h-5" />
      </button>
    </section>
  );
};
