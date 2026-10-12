"use client";

import React, { useState, useEffect } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation, FreeMode, Mousewheel } from "swiper/modules";
import { Play, Lock, Search, LayoutGrid, SlidersHorizontal, ChevronLeft, ChevronRight, Crown } from "lucide-react";
import { Episode } from "@/types/anime";

interface EpisodeSelectorProps {
  episodes: Episode[];
  activeEpisodeId: number;
  onSelectEpisode: (ep: Episode) => void;
  isVIPUser?: boolean;
}

export const EpisodeSelector: React.FC<EpisodeSelectorProps> = ({
  episodes,
  activeEpisodeId,
  onSelectEpisode,
  isVIPUser = false,
}) => {
  const [viewMode, setViewMode] = useState<"slider" | "grid">("slider");
  const [filterText, setFilterText] = useState("");
  const [swiperInstance, setSwiperInstance] = useState<any>(null);

  const filtered = episodes.filter(
    (ep) =>
      ep.episode_number.toString().includes(filterText) ||
      ep.title.toLowerCase().includes(filterText.toLowerCase())
  );

  // Auto-scroll swiper to active episode index
  useEffect(() => {
    if (swiperInstance && activeEpisodeId) {
      const activeIdx = filtered.findIndex((ep) => ep.id === activeEpisodeId);
      if (activeIdx >= 0) {
        swiperInstance.slideTo(Math.max(0, activeIdx - 1), 500);
      }
    }
  }, [activeEpisodeId, swiperInstance, filtered]);

  return (
    <div className="flex flex-col bg-[#0b0f19] border border-white/10 rounded-3xl p-4 sm:p-6 gap-4 shadow-xl">
      {/* Header with Title & View Mode Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-rose-600/20 text-rose-500 border border-rose-500/30">
            <Play className="w-4 h-4 fill-rose-500" />
          </div>
          <div>
            <h3 className="font-black text-base text-white tracking-tight">Epizodlar Ro&apos;yxati</h3>
            <p className="text-xs text-slate-400 font-medium">Jami {episodes.length} ta qism mavjud</p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {/* Quick Search */}
          <div className="relative w-40 sm:w-48">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Qism qidirish..."
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
              className="w-full bg-[#111726] border border-white/10 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500/50"
            />
          </div>

          {/* Mode Switcher */}
          <div className="flex items-center p-1 rounded-xl bg-[#111726] border border-white/10">
            <button
              onClick={() => setViewMode("slider")}
              title="Swiper Karusel rejimi"
              className={`p-1.5 rounded-lg transition-all ${
                viewMode === "slider"
                  ? "bg-rose-600 text-white shadow-neon"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setViewMode("grid")}
              title="Grid jadval rejimi"
              className={`p-1.5 rounded-lg transition-all ${
                viewMode === "grid"
                  ? "bg-rose-600 text-white shadow-neon"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Episode Content */}
      {viewMode === "slider" ? (
        <div className="relative group/ep py-1">
          <Swiper
            modules={[Navigation, FreeMode, Mousewheel]}
            slidesPerView="auto"
            spaceBetween={10}
            freeMode={{
              enabled: true,
              momentum: true,
              momentumRatio: 0.85,
            }}
            mousewheel={{
              forceToAxis: true,
            }}
            onSwiper={setSwiperInstance}
            navigation={{
              nextEl: ".swiper-next-ep",
              prevEl: ".swiper-prev-ep",
            }}
            className="w-full overflow-hidden py-2 max-w-full"
          >
            {filtered.map((ep) => {
              const isActive = ep.id === activeEpisodeId;
              const isLocked = false;

              return (
                <SwiperSlide key={ep.id} className="!w-auto">
                  <button
                    onClick={() => onSelectEpisode(ep)}
                    className={`group/btn relative flex flex-col items-start p-3 rounded-2xl border transition-all duration-300 w-36 sm:w-44 text-left active:scale-95 ${
                      isActive
                        ? "bg-gradient-to-br from-rose-600 to-rose-700 text-white border-rose-400 shadow-[0_0_20px_rgba(225,29,72,0.5)] scale-105 z-10"
                        : isLocked
                        ? "bg-[#101424] text-slate-400 border-white/5 hover:border-amber-500/40 hover:bg-[#141a2e]"
                        : "bg-[#101424] text-slate-200 border-white/10 hover:border-rose-500/40 hover:bg-[#151c30]"
                    }`}
                  >
                    {/* Top Row: Badge & Lock */}
                    <div className="w-full flex items-center justify-between mb-2">
                      <span
                        className={`text-[10px] font-black px-2 py-0.5 rounded-md ${
                          isActive
                            ? "bg-white/20 text-white"
                            : isLocked
                            ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                            : "bg-white/5 text-slate-400"
                        }`}
                      >
                        EP {ep.episode_number}
                      </span>

                      {isLocked ? (
                        <div className="flex items-center gap-1 text-[10px] text-amber-400 font-bold">
                          <Crown className="w-3 h-3 fill-amber-400" />
                          <Lock className="w-3 h-3" />
                        </div>
                      ) : isActive ? (
                        <div className="flex items-center gap-0.5">
                          <span className="w-1 h-3 bg-white rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                          <span className="w-1 h-4 bg-white rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                          <span className="w-1 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                        </div>
                      ) : (
                        <Play className="w-3 h-3 text-slate-500 group-hover/btn:text-rose-400 transition-colors" />
                      )}
                    </div>

                    {/* Title */}
                    <span className="font-bold text-xs line-clamp-1">
                      {ep.title && ep.title !== `${ep.episode_number}-qism`
                        ? ep.title
                        : `${ep.episode_number}-qism`}
                    </span>

                    {/* Subtitle / Status */}
                    <span className="text-[10px] text-slate-400 font-medium mt-0.5">
                      {isActive ? "Ijro etilmoqda" : isLocked ? "VIP Obuna talab" : "Tomosha qilish"}
                    </span>
                  </button>
                </SwiperSlide>
              );
            })}
          </Swiper>

          {/* Navigation Controls */}
          <button
            aria-label="Previous"
            className="swiper-prev-ep absolute left-1 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-[#0a0d18]/90 border border-white/20 text-white flex items-center justify-center opacity-0 group-hover/ep:opacity-100 transition-opacity hover:bg-rose-600 shadow-lg hidden md:flex"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            aria-label="Next"
            className="swiper-next-ep absolute right-1 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-[#0a0d18]/90 border border-white/20 text-white flex items-center justify-center opacity-0 group-hover/ep:opacity-100 transition-opacity hover:bg-rose-600 shadow-lg hidden md:flex"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      ) : (
        /* Grid Mode */
        <div className="grid grid-cols-5 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-2 max-h-[320px] overflow-y-auto pr-1">
          {filtered.map((ep) => {
            const isActive = ep.id === activeEpisodeId;
            const isLocked = false;

            return (
              <button
                key={ep.id}
                onClick={() => onSelectEpisode(ep)}
                className={`relative flex flex-col items-center justify-center py-2.5 px-1 rounded-xl border font-black text-xs transition-all duration-200 active:scale-95 ${
                  isActive
                    ? "bg-gradient-to-br from-rose-600 to-rose-700 text-white border-rose-400 shadow-neon scale-105"
                    : isLocked
                    ? "bg-[#101424] text-slate-400 border-white/5 hover:border-amber-500/40"
                    : "bg-[#101424] text-slate-200 border-white/10 hover:bg-[#151c30] hover:border-rose-500/40"
                }`}
              >
                {isLocked ? (
                  <Lock className="w-3.5 h-3.5 text-amber-400 mb-0.5" />
                ) : (
                  <span className="text-[10px] text-slate-400">EP</span>
                )}
                <span>{ep.episode_number}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
