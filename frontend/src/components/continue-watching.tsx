"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Play, X, Clock } from "lucide-react";

interface WatchHistoryItem {
  id: number;
  slug: string;
  title: string;
  poster_url: string;
  episode_number: number;
  currentTime: number;
  duration: number;
  updated_at: number;
}

export const ContinueWatching: React.FC = () => {
  const [items, setItems] = useState<WatchHistoryItem[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    try {
      const raw = localStorage.getItem("hikaku_watch_history");
      if (raw) {
        const list: WatchHistoryItem[] = JSON.parse(raw);
        const valid = list.filter((i) => i && i.slug && i.currentTime > 10);
        setItems(valid.slice(0, 3));
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  const handleRemove = (slug: string, epNum: number, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      const raw = localStorage.getItem("hikaku_watch_history");
      if (raw) {
        const list: WatchHistoryItem[] = JSON.parse(raw);
        const filtered = list.filter((i) => !(i.slug === slug && i.episode_number === epNum));
        localStorage.setItem("hikaku_watch_history", JSON.stringify(filtered));
        setItems(filtered.slice(0, 3));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const formatTime = (seconds: number) => {
    if (!seconds || isNaN(seconds)) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  if (!mounted || items.length === 0) return null;

  return (
    <section className="mb-8 animate-fade-in">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-2 h-5 rounded-full bg-rose-500 shadow-neon" />
          <h2 className="text-sm sm:text-base font-black text-white flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-rose-500" /> Tomoshani Davom Ettiring
          </h2>
        </div>
        <span className="text-[11px] text-slate-400 font-medium">To&apos;xtagan joyingizdan bir zumda</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {items.map((item) => {
          const progressPercent =
            item.duration > 0
              ? Math.min(100, Math.round((item.currentTime / item.duration) * 100))
              : 0;
          return (
            <Link
              key={`${item.slug}-${item.episode_number}`}
              href={`/watch/${item.slug || item.id}`}
              className="group relative flex items-center gap-3.5 p-3 rounded-2xl bg-[#0a0f1d]/90 hover:bg-[#0e1428] border border-white/10 hover:border-rose-500/40 shadow-lg hover:shadow-[0_0_25px_rgba(225,29,72,0.25)] transition-all duration-300"
              aria-label={`${item.title} ${item.episode_number}-qismini davom ettirish`}
            >
              <div className="relative w-16 h-20 rounded-xl overflow-hidden shrink-0 bg-black/40 border border-white/10">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={item.poster_url || "/placeholder.jpg"}
                  alt={item.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center group-hover:bg-black/20 transition-colors">
                  <div className="w-7 h-7 rounded-full bg-rose-600/90 text-white flex items-center justify-center shadow-neon group-hover:scale-110 transition-transform">
                    <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                  </div>
                </div>
              </div>

              <div className="flex-1 min-w-0 pr-6">
                <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-rose-500/20 text-rose-400 border border-rose-500/30 mb-1">
                  {item.episode_number}-Qism
                </span>
                <h3 className="text-xs sm:text-sm font-bold text-white line-clamp-1 group-hover:text-rose-400 transition-colors">
                  {item.title}
                </h3>
                <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1 mb-1.5">
                  <span>{formatTime(item.currentTime)} / {formatTime(item.duration)}</span>
                  <span className="font-bold text-rose-400">{progressPercent}%</span>
                </div>

                <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-rose-500 to-pink-500 transition-all duration-500"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>

              <button
                onClick={(e) => handleRemove(item.slug, item.episode_number, e)}
                className="absolute top-2.5 right-2.5 p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                title="Tarixdan o'chirish"
                aria-label={`${item.title}ni tarixdan o'chirish`}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </Link>
          );
        })}
      </div>
    </section>
  );
};
