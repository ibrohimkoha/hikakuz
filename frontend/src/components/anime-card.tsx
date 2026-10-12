"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { Star, Play, Flame, Layers, Heart } from "lucide-react";
import { Anime } from "@/types/anime";

interface AnimeCardProps {
  anime: Anime;
  rankNumber?: number;
  customHref?: string;
}

export const AnimeCard: React.FC<AnimeCardProps> = ({ anime, rankNumber, customHref }) => {
  const [isFav, setIsFav] = useState(false);
  const [imgSrc, setImgSrc] = useState(anime.poster_url || "/placeholder.jpg");

  useEffect(() => {
    setImgSrc(anime.poster_url || "/placeholder.jpg");
  }, [anime.poster_url]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("hikaku_favorites");
      if (raw) {
        const list = JSON.parse(raw);
        setIsFav(list.some((item: any) => item.id === anime.id));
      }
    } catch (e) {
      console.error(e);
    }
  }, [anime.id]);

  const toggleFavorite = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      const raw = localStorage.getItem("hikaku_favorites");
      const list = raw ? JSON.parse(raw) : [];
      const nextVal = !isFav;
      setIsFav(nextVal);
      if (nextVal) {
        if (!list.some((item: any) => item.id === anime.id)) {
          list.unshift({
            id: anime.id,
            slug: anime.slug,
            title: anime.title_uz || anime.title_en || "Anime",
            poster_url: anime.poster_url,
            score: anime.score,
            genres: anime.genres,
          });
          localStorage.setItem("hikaku_favorites", JSON.stringify(list));
        }
      } else {
        const filtered = list.filter((item: any) => item.id !== anime.id);
        localStorage.setItem("hikaku_favorites", JSON.stringify(filtered));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const title = anime.title_uz || anime.title_en || "Anime";

  return (
    <Link
      href={customHref || `/watch/${anime.slug || anime.id}`}
      aria-label={`${title} animesini ko'rish`}
      className="group relative flex flex-col rounded-2xl bg-[#0c101c] border border-white/10 overflow-hidden hover:border-rose-500/70 hover:shadow-[0_0_30px_rgba(225,29,72,0.35)] transition-all duration-300 hover:-translate-y-1.5 active:scale-[0.98] select-none"
    >
      {/* Poster Image Container */}
      <div className="relative aspect-[3/4] w-full overflow-hidden bg-[#080b14]">
        <Image
          src={imgSrc}
          onError={() => { if (imgSrc !== "/placeholder.jpg") setImgSrc("/placeholder.jpg"); }}
          alt={title}
          fill
          sizes="(max-width: 640px) 160px, (max-width: 1024px) 200px, 240px"
          quality={70}
          className="object-cover transition-transform duration-500 group-hover:scale-108"
          loading="lazy"
        />

        {/* Ambient Overlay Gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0c101c] via-transparent to-black/40 opacity-70 group-hover:opacity-30 transition-opacity duration-300" />

        {/* Top Badges & Quick Favorite */}
        <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between z-20">
          <div className="flex items-center gap-1">
            {anime.score > 0 && (
              <span className="px-2 py-0.5 rounded-lg text-[10px] font-black bg-black/70 backdrop-blur-md text-amber-300 border border-amber-500/30 flex items-center gap-1 shadow-sm">
                <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                {anime.score.toFixed(1)}
              </span>
            )}
            {anime.is_trending && (
              <span className="px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider bg-gradient-to-r from-rose-600 to-rose-500 text-white shadow-neon flex items-center gap-0.5">
                <Flame className="w-2.5 h-2.5 fill-white" /> Hot
              </span>
            )}
          </div>

          {/* Instant Favorite Heart Button */}
          <button
            type="button"
            onClick={toggleFavorite}
            aria-label={isFav ? `${title} sevimlilardan o'chirish` : `${title} sevimlilarga qo'shish`}
            className={`w-7 h-7 rounded-xl flex items-center justify-center backdrop-blur-md border transition-all ${
              isFav
                ? "bg-rose-600 text-white border-rose-400 shadow-neon scale-110"
                : "bg-black/60 text-slate-300 hover:text-white hover:bg-black/80 border-white/20 hover:scale-110"
            }`}
          >
            <Heart className={`w-3.5 h-3.5 ${isFav ? "fill-white" : ""}`} />
          </button>
        </div>

        {/* Bottom Poster Tag (Episodes & Uzbek Dub) */}
        <div className="absolute bottom-2 left-2.5 right-2.5 flex items-center justify-between z-10">
          <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-[#060911]/85 backdrop-blur-md text-slate-200 border border-white/10 flex items-center gap-1">
            <Layers className="w-2.5 h-2.5 text-rose-400" />
            {anime.episodes_count ? `${anime.episodes_count} qism` : "Ongoing"}
          </span>
          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-rose-600/30 text-rose-200 border border-rose-500/30 backdrop-blur-md">
            O&apos;zbekcha
          </span>
        </div>

        {/* Crunchyroll Style Top Rank Number (if rankNumber provided) */}
        {typeof rankNumber === "number" && rankNumber > 0 && (
          <span
            className="absolute -bottom-3 -left-1 z-20 text-5xl sm:text-6xl font-black italic tracking-tighter select-none pointer-events-none drop-shadow-[0_4px_12px_rgba(0,0,0,0.9)]"
            style={{
              color: "#0c101c",
              WebkitTextStroke: "2.5px #f43f5e",
              textShadow: "0 0 25px rgba(244, 63, 94, 0.7)",
            }}
          >
            #{rankNumber}
          </span>
        )}

        {/* Play Icon Reveal on Hover */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 z-20 pointer-events-none">
          <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-rose-600 to-rose-500 text-white flex items-center justify-center shadow-[0_0_35px_rgba(225,29,72,0.9)] scale-75 group-hover:scale-100 transition-transform duration-300 border border-white/20">
            <Play className="w-5 h-5 fill-white ml-0.5" />
          </div>
        </div>
      </div>

      {/* Info Content */}
      <div className="flex flex-col p-3 space-y-1 bg-gradient-to-b from-[#0c101c] to-[#080c18]">
        <h3 className="font-bold text-xs sm:text-sm text-white line-clamp-1 group-hover:text-rose-400 transition-colors leading-snug">
          {anime.title_uz}
        </h3>

        {anime.title_en && (
          <p className="text-[11px] text-slate-400 line-clamp-1 font-medium">
            {anime.title_en}
          </p>
        )}

        {/* Micro Genres */}
        {anime.genres && anime.genres.length > 0 && (
          <div className="flex items-center gap-1 pt-1 overflow-hidden">
            {anime.genres.slice(0, 2).map((g, i) => (
              <span
                key={i}
                className="text-[9px] font-semibold text-rose-300/90 bg-rose-500/10 px-1.5 py-0.5 rounded border border-rose-500/20 whitespace-nowrap"
              >
                {g}
              </span>
            ))}
          </div>
        )}
      </div>
    </Link>
  );
};
