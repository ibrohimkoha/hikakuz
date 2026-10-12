"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  X,
  Clock,
  Heart,
  Settings,
  Crown,
  Play,
  Trash2,
  ExternalLink,
  ShieldCheck,
  LogOut,
  Sliders,
  Sparkles,
  ChevronRight,
  Tv,
  Check,
  RefreshCw,
  Zap,
  Mic,
} from "lucide-react";
import { useAuth } from "@/context/auth-context";

export interface WatchHistoryItem {
  id: number;
  slug: string;
  title: string;
  poster_url: string;
  episode_number: number;
  currentTime: number;
  duration: number;
  updated_at: number;
}

export interface FavoriteAnimeItem {
  id: number;
  slug: string;
  title: string;
  poster_url: string;
  score?: number;
  genres?: string[];
}

export interface PlayerSettings {
  autoplayNext: boolean;
  defaultQuality: string;
  skipIntro: boolean;
}

interface UserPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export const UserPanel: React.FC<UserPanelProps> = ({ isOpen, onClose }) => {
  const { user, logout, setIsAuthModalOpen } = useAuth();
  const [activeTab, setActiveTab] = useState<"history" | "favorites" | "settings">("history");

  // Local state
  const [history, setHistory] = useState<WatchHistoryItem[]>([]);
  const [favorites, setFavorites] = useState<FavoriteAnimeItem[]>([]);
  const [playerSettings, setPlayerSettings] = useState<PlayerSettings>({
    autoplayNext: true,
    defaultQuality: "auto",
    skipIntro: true,
  });
  const [cacheCleared, setCacheCleared] = useState(false);

  // Load from localStorage on open
  useEffect(() => {
    if (!isOpen) return;

    // Load History
    try {
      const savedHistory = localStorage.getItem("hikaku_watch_history");
      if (savedHistory) {
        setHistory(JSON.parse(savedHistory));
      }
    } catch (e) {
      console.error("History parse error:", e);
    }

    // Load Favorites
    try {
      const savedFavs = localStorage.getItem("hikaku_favorites");
      if (savedFavs) {
        setFavorites(JSON.parse(savedFavs));
      }
    } catch (e) {
      console.error("Favorites parse error:", e);
    }

    // Load Settings
    try {
      const savedSettings = localStorage.getItem("hikaku_player_settings");
      if (savedSettings) {
        setPlayerSettings(JSON.parse(savedSettings));
      }
    } catch (e) {
      console.error("Settings parse error:", e);
    }
  }, [isOpen]);

  // Remove single history item
  const removeHistoryItem = (slug: string, ep: number) => {
    const updated = history.filter(
      (item) => !(item.slug === slug && item.episode_number === ep)
    );
    setHistory(updated);
    localStorage.setItem("hikaku_watch_history", JSON.stringify(updated));
  };

  // Clear all history
  const clearAllHistory = () => {
    if (confirm("Tomosha tarixini tozalashni xohlaysizmi?")) {
      setHistory([]);
      localStorage.removeItem("hikaku_watch_history");
    }
  };

  // Remove favorite item
  const removeFavorite = (id: number) => {
    const updated = favorites.filter((f) => f.id !== id);
    setFavorites(updated);
    localStorage.setItem("hikaku_favorites", JSON.stringify(updated));
  };

  // Save settings
  const updateSetting = <K extends keyof PlayerSettings>(
    key: K,
    value: PlayerSettings[K]
  ) => {
    const updated = { ...playerSettings, [key]: value };
    setPlayerSettings(updated);
    localStorage.setItem("hikaku_player_settings", JSON.stringify(updated));
  };

  // Clear Cache
  const handleClearCache = () => {
    setCacheCleared(true);
    setTimeout(() => {
      setCacheCleared(false);
    }, 2500);
  };

  // Format seconds to mm:ss
  const formatTime = (seconds: number) => {
    if (!seconds || isNaN(seconds)) return "00:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop overlay */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity duration-300"
      />

      {/* Slide-over Drawer / Mobile BottomSheet */}
      <div className="relative z-10 w-full max-w-md h-full bg-[#080b15]/95 border-l border-white/10 backdrop-blur-2xl shadow-2xl flex flex-col overflow-hidden text-slate-100">
        {/* Header with User Info & Close */}
        <div className="p-4 sm:p-5 border-b border-white/10 bg-gradient-to-b from-white/5 to-transparent flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            {user ? (
              <div className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {user.photo_url ? (
                  <img
                    src={user.photo_url}
                    alt={user.first_name}
                    className="w-11 h-11 rounded-2xl object-cover border-2 border-rose-500/50 shadow-neon"
                  />
                ) : (
                  <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-rose-600 to-amber-500 text-white flex items-center justify-center font-black text-lg shadow-neon">
                    {user.first_name?.[0] || "U"}
                  </div>
                )}
                {user.is_vip && (
                  <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-amber-500 text-black flex items-center justify-center shadow">
                    <Crown className="w-3 h-3 fill-black" />
                  </div>
                )}
              </div>
            ) : (
              <div className="w-11 h-11 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-400">
                <Tv className="w-5 h-5" />
              </div>
            )}

            <div>
              {user ? (
                <>
                  <h3 className="text-sm font-black text-white flex items-center gap-1.5 leading-tight">
                    {user.first_name} {user.last_name || ""}
                  </h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    {user.is_vip ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-black text-amber-300 bg-amber-500/20 px-2 py-0.5 rounded-full border border-amber-500/30">
                        <Crown className="w-2.5 h-2.5 fill-amber-300" /> VIP Obunachi
                      </span>
                    ) : (
                      <span className="text-[11px] text-slate-400">Oddiy Foydalanuvchi</span>
                    )}
                    {user.fandub && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-black text-indigo-300 bg-indigo-500/20 px-2 py-0.5 rounded-full border border-indigo-500/30">
                        <Mic className="w-2.5 h-2.5 text-indigo-400" /> {user.fandub.name}
                      </span>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <h3 className="text-sm font-black text-white">Hikaku Foydalanuvchisi</h3>
                  <button
                    onClick={() => {
                      onClose();
                      setIsAuthModalOpen(true);
                    }}
                    className="text-xs font-bold text-rose-400 hover:underline mt-0.5 block"
                  >
                    Tizimga kirish ➔
                  </button>
                </>
              )}
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>


        {/* Tab Navigation */}
        <div className="flex items-center border-b border-white/10 px-2 py-1.5 bg-[#0b0e1b] shrink-0">
          <button
            onClick={() => setActiveTab("history")}
            className={`flex-1 py-2 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all ${
              activeTab === "history"
                ? "bg-white/10 text-white shadow-inner"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Clock className="w-3.5 h-3.5 text-cyan-400" />
            <span>Tarix</span>
            {history.length > 0 && (
              <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 font-bold">
                {history.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab("favorites")}
            className={`flex-1 py-2 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all ${
              activeTab === "favorites"
                ? "bg-white/10 text-white shadow-inner"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500" />
            <span>Sevimlilar</span>
            {favorites.length > 0 && (
              <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 font-bold">
                {favorites.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab("settings")}
            className={`flex-1 py-2 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all ${
              activeTab === "settings"
                ? "bg-white/10 text-white shadow-inner"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Settings className="w-3.5 h-3.5 text-amber-400" />
            <span>Sozlamalar</span>
          </button>
        </div>

        {/* Tab Contents (Scrollable) */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* TAB 1: WATCH HISTORY */}
          {activeTab === "history" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400">
                  Oxirgi ko&apos;rilgan qismlar
                </span>
                {history.length > 0 && (
                  <button
                    onClick={clearAllHistory}
                    className="text-[11px] text-rose-400 hover:text-rose-300 flex items-center gap-1 transition-colors"
                  >
                    <Trash2 className="w-3 h-3" /> Tarixni tozalash
                  </button>
                )}
              </div>

              {history.length === 0 ? (
                <div className="py-16 text-center space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto text-slate-500">
                    <Clock className="w-6 h-6" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-slate-300">
                      Hozircha tomosha tarixi mavjud emas
                    </p>
                    <p className="text-[11px] text-slate-500">
                      Siz ko&apos;rgan barcha animelar va qismlar shu yerda saqlanib boradi
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {history.map((item) => {
                    const percent = item.duration
                      ? Math.min(100, Math.round((item.currentTime / item.duration) * 100))
                      : 0;

                    return (
                      <div
                        key={`${item.slug}-${item.episode_number}`}
                        className="group relative flex items-center gap-3 p-2.5 rounded-2xl bg-white/5 border border-white/10 hover:border-cyan-500/40 hover:bg-white/10 transition-all shadow-md"
                      >
                        {/* Poster Thumbnail */}
                        <div className="relative w-14 h-20 rounded-xl overflow-hidden shrink-0 bg-slate-900 border border-white/10">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={item.poster_url || "/placeholder.jpg"}
                            alt={item.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                          <span className="absolute bottom-1 left-1 text-[9px] font-black text-cyan-300 bg-black/60 px-1 rounded">
                            {item.episode_number}-qism
                          </span>
                        </div>

                        {/* Details */}
                        <div className="flex-1 min-w-0 space-y-1.5">
                          <h4 className="text-xs font-bold text-white truncate group-hover:text-cyan-300 transition-colors">
                            {item.title}
                          </h4>
                          <div className="flex items-center justify-between text-[10px] text-slate-400">
                            <span>
                              {formatTime(item.currentTime)} / {formatTime(item.duration)}
                            </span>
                            <span className="text-cyan-400 font-bold">{percent}%</span>
                          </div>

                          {/* Progress bar */}
                          <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full transition-all"
                              style={{ width: `${percent}%` }}
                            />
                          </div>

                          {/* Actions */}
                          <div className="flex items-center justify-between pt-1">
                            <Link
                              href={`/watch/${item.slug}?ep=${item.episode_number}&t=${Math.floor(
                                item.currentTime
                              )}`}
                              onClick={onClose}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 text-[10px] font-bold border border-cyan-500/30 transition-colors"
                            >
                              <Play className="w-2.5 h-2.5 fill-cyan-300" /> Davom ettirish
                            </Link>

                            <button
                              onClick={() => removeHistoryItem(item.slug, item.episode_number)}
                              className="text-slate-500 hover:text-rose-400 p-1 rounded-lg hover:bg-white/5 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: FAVORITES */}
          {activeTab === "favorites" && (
            <div className="space-y-3">
              <span className="text-xs font-bold text-slate-400 block">
                Saqlab qo&apos;yilgan sevimli animelar
              </span>

              {favorites.length === 0 ? (
                <div className="py-16 text-center space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto text-slate-500">
                    <Heart className="w-6 h-6 text-rose-500" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-slate-300">
                      Hali sevimli animelar qo&apos;shilmagan
                    </p>
                    <p className="text-[11px] text-slate-500">
                      Istalgan anime sahifasidagi yurakcha ❤️ tugmasini bosib saqlab qo&apos;yishingiz mumkin
                    </p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-2.5">
                  {favorites.map((fav) => (
                    <div
                      key={fav.id}
                      className="group flex items-center gap-3 p-2.5 rounded-2xl bg-white/5 border border-white/10 hover:border-rose-500/40 hover:bg-white/10 transition-all shadow-md"
                    >
                      <div className="w-12 h-16 rounded-xl overflow-hidden shrink-0 bg-slate-900 border border-white/10">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={fav.poster_url || "/placeholder.jpg"}
                          alt={fav.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                      </div>

                      <div className="flex-1 min-w-0 space-y-1">
                        <h4 className="text-xs font-bold text-white truncate group-hover:text-rose-400 transition-colors">
                          {fav.title}
                        </h4>
                        <div className="flex items-center gap-2 text-[10px] text-slate-400">
                          {fav.score && (
                            <span className="text-amber-400 font-bold">★ {fav.score}</span>
                          )}
                          {fav.genres && fav.genres.length > 0 && (
                            <span className="truncate max-w-[120px]">
                              {fav.genres.slice(0, 2).join(", ")}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center justify-between pt-0.5">
                          <Link
                            href={`/watch/${fav.slug}`}
                            onClick={onClose}
                            className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-400 hover:text-rose-300"
                          >
                            <Play className="w-2.5 h-2.5 fill-rose-400" /> Tomosha qilish
                          </Link>

                          <button
                            onClick={() => removeFavorite(fav.id)}
                            className="text-slate-500 hover:text-rose-400 p-1 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: SETTINGS & PREFERENCES */}
          {activeTab === "settings" && (
            <div className="space-y-4">
              {/* Autoplay Next */}
              <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-white">Avtomatik Keyingi Qism</h4>
                    <p className="text-[11px] text-slate-400">
                      Epizod tugagach 5 soniyada keyingisiga o&apos;tish
                    </p>
                  </div>
                  <button
                    onClick={() => updateSetting("autoplayNext", !playerSettings.autoplayNext)}
                    className={`w-11 h-6 rounded-full transition-colors relative flex items-center p-0.5 ${
                      playerSettings.autoplayNext ? "bg-rose-600" : "bg-white/20"
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded-full bg-white transition-transform ${
                        playerSettings.autoplayNext ? "translate-x-5" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* Default Quality */}
              <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 space-y-2">
                <h4 className="text-xs font-bold text-white">Birlamchi Video Sifati</h4>
                <p className="text-[11px] text-slate-400">
                  Video pleyer ochilganda standart sifat
                </p>
                <div className="grid grid-cols-4 gap-1.5 pt-1">
                  {[
                    { key: "auto", label: "Avto" },
                    { key: "1080p", label: "1080p" },
                    { key: "720p", label: "720p" },
                    { key: "480p", label: "480p" },
                  ].map((q) => (
                    <button
                      key={q.key}
                      onClick={() => updateSetting("defaultQuality", q.key)}
                      className={`py-1.5 rounded-xl text-xs font-bold transition-all ${
                        playerSettings.defaultQuality === q.key
                          ? "bg-rose-600 text-white shadow-neon"
                          : "bg-white/5 text-slate-400 hover:text-white hover:bg-white/10"
                      }`}
                    >
                      {q.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Skip Intro */}
              <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-white">Intro O&apos;tkazish Tugmasi</h4>
                    <p className="text-[11px] text-slate-400">
                      Pleyer ekranida 85 soniyalik ochilishni o&apos;tkazish
                    </p>
                  </div>
                  <button
                    onClick={() => updateSetting("skipIntro", !playerSettings.skipIntro)}
                    className={`w-11 h-6 rounded-full transition-colors relative flex items-center p-0.5 ${
                      playerSettings.skipIntro ? "bg-rose-600" : "bg-white/20"
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded-full bg-white transition-transform ${
                        playerSettings.skipIntro ? "translate-x-5" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* Cache Cleaning */}
              <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-white">Ilova Keshini Tozalash</h4>
                    <p className="text-[11px] text-slate-400">
                      Vaqtinchalik yuklangan ma&apos;lumotlarni yangilash
                    </p>
                  </div>
                  <button
                    onClick={handleClearCache}
                    className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-bold text-slate-300 flex items-center gap-1.5 transition-colors"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${cacheCleared ? "animate-spin text-emerald-400" : ""}`} />
                    <span>{cacheCleared ? "Tozalandi!" : "Tozalash"}</span>
                  </button>
                </div>
              </div>

              {/* Fandub Studio Quick Access */}
              {(user?.fandub || user?.is_admin) && (
                <div className="p-3.5 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Mic className="w-4 h-4 text-indigo-400" />
                    <div>
                      <h4 className="text-xs font-bold text-white">{user?.fandub?.name || "Fandub Studiyasi"}</h4>
                      <p className="text-[10px] text-indigo-300">
                        {user?.fandub ? `Fandub Dublyaj Studiyasi (${user.fandub.role})` : "Fandub Boshqaruv Markazi"}
                      </p>
                    </div>
                  </div>
                  <Link
                    href="/fandub"
                    onClick={onClose}
                    className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-neon transition-all"
                  >
                    Studiya ➔
                  </Link>
                </div>
              )}

              {/* Admin Panel Quick Access */}
              {user?.is_admin && (
                <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-rose-500" />
                    <div>
                      <h4 className="text-xs font-bold text-white">Admin Studio</h4>
                      <p className="text-[10px] text-rose-300">Anime va epizodlarni boshqarish</p>
                    </div>
                  </div>
                  <Link
                    href="/admin"
                    onClick={onClose}
                    className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-neon transition-all"
                  >
                    O&apos;tish
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer: Logout */}
        {user && (
          <div className="p-4 border-t border-white/10 bg-[#070912] shrink-0">
            <button
              onClick={() => {
                logout();
                onClose();
              }}
              className="w-full py-2.5 rounded-xl bg-white/5 border border-white/10 hover:bg-rose-500/20 hover:border-rose-500/40 text-slate-300 hover:text-rose-400 text-xs font-bold flex items-center justify-center gap-2 transition-colors"
            >
              <LogOut className="w-4 h-4" /> Hisobdan chiqish
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
