"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Navbar } from "@/components/navbar";
import { BottomNav } from "@/components/bottom-nav";
import { AnimeCard } from "@/components/anime-card";
import {
  Mic,
  Users,
  Tv,
  Film,
  Crown,
  Sparkles,
  ChevronRight,
  ExternalLink,
  ShieldCheck,
  Flame,
  ArrowLeft,
  Settings,
  Heart,
  Loader2,
  Play,
  Clock,
  Send,
  CreditCard,
  X,
  Check,
  Copy,
  Share2,
  Instagram,
  Megaphone,
  AtSign,
  Briefcase,
} from "lucide-react";
import { useAuth } from "@/context/auth-context";
import { Anime, Episode } from "@/types/anime";

interface StudioInfo {
  id: number;
  name: string;
  slug: string;
  logo_url: string;
  description: string;
  episodes_count: number;
  animes_count: number;
  followers_count: number;
  vip_price: number;
  contact_url: string;
  created_at: string;
}

interface TeamMember {
  id: number;
  fandub_id: number;
  fandub_name?: string;
  telegram_id: number;
  role: string;
  created_at: string;
  username?: string;
  first_name?: string;
  photo_url?: string;
}

interface FandubCustomProfile {
  fandub_id: number;
  theme_color: string;
  banner_url: string;
  telegram_channel: string;
  telegram_admin: string;
  telegram_ads: string;
  instagram_url: string;
  announcement_text: string;
  announcement_active: boolean;
}

const THEME_MAP: Record<string, {
  border: string;
  glow: string;
  accent: string;
  badge: string;
  tabActive: string;
  headerGrad: string;
  buttonGrad: string;
}> = {
  amber: {
    border: "border-amber-500/40",
    glow: "shadow-[0_0_30px_rgba(245,158,11,0.2)]",
    accent: "text-amber-400",
    badge: "bg-amber-500/10 border-amber-500/30 text-amber-400",
    tabActive: "bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-[0_0_20px_rgba(245,158,11,0.4)]",
    headerGrad: "from-amber-600/30 via-rose-600/25 to-purple-600/30",
    buttonGrad: "from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black",
  },
  rose: {
    border: "border-rose-500/40",
    glow: "shadow-[0_0_30px_rgba(244,63,94,0.2)]",
    accent: "text-rose-400",
    badge: "bg-rose-500/10 border-rose-500/30 text-rose-400",
    tabActive: "bg-gradient-to-r from-rose-500 to-rose-600 text-white shadow-[0_0_20px_rgba(244,63,94,0.4)]",
    headerGrad: "from-rose-600/30 via-purple-600/25 to-orange-600/30",
    buttonGrad: "from-rose-500 to-rose-600 hover:from-rose-400 hover:to-rose-500 text-white",
  },
  purple: {
    border: "border-purple-500/40",
    glow: "shadow-[0_0_30px_rgba(168,85,247,0.2)]",
    accent: "text-purple-400",
    badge: "bg-purple-500/10 border-purple-500/30 text-purple-400",
    tabActive: "bg-gradient-to-r from-purple-500 to-indigo-600 text-white shadow-[0_0_20px_rgba(168,85,247,0.4)]",
    headerGrad: "from-purple-600/30 via-indigo-600/25 to-cyan-600/30",
    buttonGrad: "from-purple-500 to-indigo-600 hover:from-purple-400 hover:to-indigo-500 text-white",
  },
  cyan: {
    border: "border-cyan-500/40",
    glow: "shadow-[0_0_30px_rgba(6,182,212,0.2)]",
    accent: "text-cyan-400",
    badge: "bg-cyan-500/10 border-cyan-500/30 text-cyan-400",
    tabActive: "bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-[0_0_20px_rgba(6,182,212,0.4)]",
    headerGrad: "from-cyan-600/30 via-blue-600/25 to-indigo-600/30",
    buttonGrad: "from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white",
  },
  emerald: {
    border: "border-emerald-500/40",
    glow: "shadow-[0_0_30px_rgba(16,185,129,0.2)]",
    accent: "text-emerald-400",
    badge: "bg-emerald-500/10 border-emerald-500/30 text-emerald-400",
    tabActive: "bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-[0_0_20px_rgba(16,185,129,0.4)]",
    headerGrad: "from-emerald-600/30 via-teal-600/25 to-cyan-600/30",
    buttonGrad: "from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white",
  },
  orange: {
    border: "border-orange-500/40",
    glow: "shadow-[0_0_30px_rgba(249,115,22,0.2)]",
    accent: "text-orange-400",
    badge: "bg-orange-500/10 border-orange-500/30 text-orange-400",
    tabActive: "bg-gradient-to-r from-orange-500 to-amber-600 text-white shadow-[0_0_20px_rgba(249,115,22,0.4)]",
    headerGrad: "from-orange-600/30 via-rose-600/25 to-amber-600/30",
    buttonGrad: "from-orange-500 to-amber-600 hover:from-orange-400 hover:to-amber-500 text-white",
  },
};

const getCleanTelegramUrl = (val: string) => {
  if (!val) return "";
  const clean = val.trim();
  if (clean.startsWith("http://") || clean.startsWith("https://")) return clean;
  return `https://t.me/${clean.replace("@", "")}`;
};

const getCleanInstagramUrl = (val: string) => {
  if (!val) return "";
  const clean = val.trim();
  if (clean.startsWith("http://") || clean.startsWith("https://")) return clean;
  return `https://instagram.com/${clean.replace("@", "")}`;
};

export default function FandubStudioHubPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params?.slug as string;
  const { user, setIsAuthModalOpen } = useAuth();

  const [studio, setStudio] = useState<StudioInfo | null>(null);
  const [customProfile, setCustomProfile] = useState<FandubCustomProfile | null>(null);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [animes, setAnimes] = useState<Anime[]>([]);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [isFollowing, setIsFollowing] = useState<boolean>(false);
  const [followersCount, setFollowersCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isFollowLoading, setIsFollowLoading] = useState<boolean>(false);

  const [activeTab, setActiveTab] = useState<"animes" | "episodes" | "team">("animes");
  const [isVIPModalOpen, setIsVIPModalOpen] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

  const theme = THEME_MAP[customProfile?.theme_color || "amber"] || THEME_MAP.amber;

  const getTgId = (): number => {
    if (user?.telegram_id) return user.telegram_id;
    if (user?.id && !user?.email) return user.id;
    return 0;
  };

  useEffect(() => {
    if (!slug) return;
    const fetchStudioDetails = async () => {
      setIsLoading(true);
      try {
        const tgId = getTgId();
        const res = await fetch(`/api/v1/fandub/public-detail?slug=${encodeURIComponent(slug)}&telegram_id=${tgId}`);
        const json = await res.json();
        if (json.success && json.data) {
          setStudio(json.data);
          if (json.custom_profile) setCustomProfile(json.custom_profile);
          setMembers(json.members || []);
          setAnimes(json.animes || []);
          setEpisodes(json.episodes || []);
          setIsFollowing(!!json.is_following);
          setFollowersCount(json.data.followers_count || 0);
        }
      } catch (err) {
        console.error("Failed to fetch fandub detail:", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchStudioDetails();
  }, [slug, user]);

  const handleToggleFollow = async () => {
    const tgId = getTgId();
    if (!tgId) {
      setIsAuthModalOpen(true);
      return;
    }
    if (!studio) return;

    setIsFollowLoading(true);
    try {
      const res = await fetch("/api/v1/fandub/follow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fandub_id: studio.id,
          telegram_id: tgId,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setIsFollowing(json.is_following);
        setFollowersCount(json.followers_count);
      }
    } catch (err) {
      console.error("Follow error:", err);
    } finally {
      setIsFollowLoading(false);
    }
  };

  const copyCard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#060911] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
          <p className="text-xs text-slate-400 font-semibold tracking-wider uppercase">
            Studiya ma&apos;lumotlari yuklanmoqda...
          </p>
        </div>
      </div>
    );
  }

  if (!studio) {
    return (
      <div className="min-h-screen bg-[#060911] text-slate-100 flex flex-col items-center justify-center p-6 space-y-4">
        <Mic className="w-16 h-16 text-slate-600" />
        <h1 className="text-xl font-black text-white">Studiya topilmadi</h1>
        <p className="text-xs text-slate-400">Bunday nomli dublyaj studiyasi mavjud emas yoki o&apos;chirilgan.</p>
        <Link
          href="/fandubs"
          className="px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold text-white transition-all"
        >
          ← Barcha studiyalarga qaytish
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#060911] text-slate-100 flex flex-col selection:bg-rose-500 selection:text-white">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-20 sm:pt-24 pb-24 space-y-8">
        {/* Back Link */}
        <div>
          <Link
            href="/fandubs"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Barcha Fandub Studiyalar</span>
          </Link>
        </div>

        {/* Studio Pin Announcement (Top Banner) */}
        {customProfile?.announcement_active && customProfile?.announcement_text && (
          <div className={`relative p-4 rounded-3xl bg-[#0a0f1e]/95 border ${theme.border} ${theme.glow} flex items-center justify-between gap-4 overflow-hidden backdrop-blur-xl animate-in fade-in slide-in-from-top-4`}>
            <div className="flex items-center gap-3.5 min-w-0">
              <div className={`w-10 h-10 rounded-2xl ${theme.badge} flex items-center justify-center shrink-0`}>
                <Megaphone className="w-5 h-5 animate-bounce" />
              </div>
              <div className="min-w-0">
                <span className={`text-[10px] font-black uppercase tracking-wider block ${theme.accent}`}>
                  📢 Studiya E&apos;loni
                </span>
                <p className="text-xs sm:text-sm font-bold text-white truncate sm:whitespace-normal">
                  {customProfile.announcement_text}
                </p>
              </div>
            </div>
            <div className="hidden sm:flex items-center gap-2 shrink-0">
              <span className="relative flex h-2.5 w-2.5">
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${theme.badge}`} />
                <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${theme.tabActive}`} />
              </span>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Aktiv</span>
            </div>
          </div>
        )}

        {/* Studio Hero Profile Header */}
        <div className={`relative rounded-3xl overflow-hidden bg-gradient-to-br from-[#12162a] via-[#0c1020] to-[#070914] border ${theme.border} ${theme.glow} shadow-2xl`}>
          {/* Banner Art / Decorative Glow */}
          <div className="h-36 sm:h-56 w-full relative overflow-hidden bg-black/40">
            {customProfile?.banner_url ? (
              <img
                src={customProfile.banner_url}
                alt={`${studio.name} Banner`}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className={`w-full h-full bg-gradient-to-r ${theme.headerGrad} relative overflow-hidden`}>
                <div className="absolute inset-0 backdrop-blur-xl bg-black/20" />
                <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 blur-3xl rounded-full" />
                <div className="absolute bottom-0 left-0 w-80 h-80 bg-black/30 blur-3xl rounded-full" />
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-[#090e1c] via-[#090e1c]/40 to-transparent" />
          </div>

          {/* Profile Details Bar */}
          <div className="p-4 sm:p-8 pt-0 relative z-10 flex flex-col sm:flex-row items-start sm:items-end justify-between gap-5 sm:gap-6 -mt-14 sm:-mt-20">
            {/* Left: Avatar + Title */}
            <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4 sm:gap-5">
              <div className={`relative w-20 h-20 sm:w-32 sm:h-32 rounded-2xl sm:rounded-3xl overflow-hidden bg-[#090e1c] border-2 ${theme.border} shadow-2xl p-1 shrink-0`}>
                {studio.logo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={studio.logo_url}
                    alt={studio.name}
                    className="w-full h-full object-cover rounded-2xl"
                  />
                ) : (
                  <div className={`w-full h-full flex items-center justify-center font-black text-3xl ${theme.accent}`}>
                    {studio.name.charAt(0)}
                  </div>
                )}
                <div className={`absolute -bottom-1 -right-1 p-1.5 rounded-full ${theme.tabActive}`}>
                  <ShieldCheck className="w-4 h-4 text-white" />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                    {studio.name}
                  </h1>
                  <Crown className={`w-5 h-5 shrink-0 ${theme.accent}`} />
                </div>
                <p className="text-xs sm:text-sm text-slate-300 max-w-xl leading-relaxed">
                  {studio.description || "O'zbek tilidagi eng sara animelarni professional ovoz bilan taqdim etuvchi jamoa."}
                </p>

                {/* Counters Row */}
                <div className="flex flex-wrap items-center gap-4 pt-0.5 text-xs text-slate-400">
                  <div className="flex items-center gap-1.5">
                    <Tv className="w-3.5 h-3.5 text-rose-400" />
                    <span className="font-bold text-white">{studio.episodes_count || 0}</span> ta qism
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Film className="w-3.5 h-3.5 text-cyan-400" />
                    <span className="font-bold text-white">{studio.animes_count || 0}</span> ta anime
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Users className={`w-3.5 h-3.5 ${theme.accent}`} />
                    <span className="font-bold text-white">{followersCount}</span> ta kuzatuvchi
                  </div>
                </div>

                {/* Dedicated Social & Contact Chips */}
                {(customProfile?.telegram_channel || customProfile?.telegram_admin || customProfile?.telegram_ads || customProfile?.instagram_url) && (
                  <div className="flex flex-wrap items-center gap-2 pt-2">
                    {customProfile?.telegram_channel && (
                      <a
                        href={getCleanTelegramUrl(customProfile.telegram_channel)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/30 text-sky-400 text-[11px] font-black transition-all hover:scale-105"
                      >
                        <Send className="w-3 h-3" />
                        <span>Kanal: {customProfile.telegram_channel.replace("https://t.me/", "")}</span>
                      </a>
                    )}
                    {customProfile?.telegram_admin && (
                      <a
                        href={getCleanTelegramUrl(customProfile.telegram_admin)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 text-indigo-400 text-[11px] font-black transition-all hover:scale-105"
                      >
                        <AtSign className="w-3 h-3" />
                        <span>Rahbar: {customProfile.telegram_admin.replace("https://t.me/", "")}</span>
                      </a>
                    )}
                    {customProfile?.telegram_ads && (
                      <a
                        href={getCleanTelegramUrl(customProfile.telegram_ads)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-400 text-[11px] font-black transition-all hover:scale-105"
                      >
                        <Briefcase className="w-3 h-3" />
                        <span>Reklama: {customProfile.telegram_ads.replace("https://t.me/", "")}</span>
                      </a>
                    )}
                    {customProfile?.instagram_url && (
                      <a
                        href={getCleanInstagramUrl(customProfile.instagram_url)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-400 text-[11px] font-black transition-all hover:scale-105"
                      >
                        <Instagram className="w-3 h-3" />
                        <span>Instagram: {customProfile.instagram_url.replace("https://instagram.com/", "").replace("/", "")}</span>
                      </a>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Right: Actions (Follow, VIP, Contact) */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full sm:w-auto">
              {/* Row 1 on mobile: Follow + Telegram */}
              <div className="flex items-center gap-2.5 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={handleToggleFollow}
                  disabled={isFollowLoading}
                  className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-5 py-2.5 rounded-2xl text-xs font-black transition-all ${
                    isFollowing
                      ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-sm"
                      : "bg-white/10 hover:bg-white/20 text-white border border-white/15"
                  }`}
                >
                  {isFollowLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : isFollowing ? (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Kuzatilmoqda</span>
                    </>
                  ) : (
                    <>
                      <Heart className="w-4 h-4 text-rose-500" />
                      <span>Kuzatish</span>
                    </>
                  )}
                </button>

                {studio.contact_url && (
                  <a
                    href={studio.contact_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2.5 rounded-2xl bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 border border-sky-500/30 transition-all flex items-center justify-center gap-1.5 text-xs font-bold shrink-0"
                    title="Telegram kanali yoki aloqa boti"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span className="sm:hidden">Telegram</span>
                  </a>
                )}
              </div>

              {/* Row 2 on mobile (Full Width), inlined on desktop: VIP CTA */}
              <button
                type="button"
                onClick={() => setIsVIPModalOpen(true)}
                className="w-full sm:w-auto flex items-center justify-between sm:justify-center gap-2.5 px-4 sm:px-5 py-2.5 rounded-2xl bg-gradient-to-r from-amber-500 to-rose-600 hover:from-amber-400 hover:to-rose-500 text-white text-xs font-black shadow-neon transition-all"
              >
                <div className="flex items-center gap-2">
                  <Crown className="w-4 h-4 text-amber-200 shrink-0" />
                  <span>VIP Obuna bo&apos;lish</span>
                </div>
                <span className="px-2 py-0.5 rounded-xl bg-black/25 text-[11px] font-bold text-amber-100 border border-white/15 whitespace-nowrap">
                  {(studio.vip_price || 10000).toLocaleString()} so&apos;m/oy
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 border-b border-white/10 pb-3 overflow-x-auto scrollbar-none">
          <button
            type="button"
            onClick={() => setActiveTab("animes")}
            className={`flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === "animes"
                ? `${theme.badge} shadow-sm`
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Film className="w-3.5 h-3.5" />
            <span className="sm:hidden">Animelar ({animes.length})</span>
            <span className="hidden sm:inline">Tarjima Qilingan Animelar ({animes.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("episodes")}
            className={`flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === "episodes"
                ? `${theme.badge} shadow-sm`
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Tv className="w-3.5 h-3.5" />
            <span className="sm:hidden">Qismlar ({episodes.length})</span>
            <span className="hidden sm:inline">So&apos;nggi Chiqqan Qismlar ({episodes.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("team")}
            className={`flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === "team"
                ? `${theme.badge} shadow-sm`
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span className="sm:hidden">Jamoa ({members.length})</span>
            <span className="hidden sm:inline">Jamoa A&apos;zolari ({members.length})</span>
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === "animes" && (
          <div>
            {animes.length === 0 ? (
              <div className="text-center py-16 px-4 rounded-3xl bg-[#0a0f1d]/50 border border-white/5 space-y-3">
                <Film className="w-12 h-12 text-slate-600 mx-auto" />
                <p className="text-sm text-slate-400 font-bold">Hozircha animelar yo&apos;q</p>
                <p className="text-xs text-slate-500">Ushbu studiya tez kunda o&apos;z tarjimalarini yuklaydi.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-5">
                {animes.map((anime) => (
                  <AnimeCard
                    key={anime.id}
                    anime={anime}
                    customHref={`/watch/${anime.slug || anime.id}?fandub=${encodeURIComponent(studio.slug)}&fandub_id=${studio.id}`}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "episodes" && (
          <div>
            {episodes.length === 0 ? (
              <div className="text-center py-16 px-4 rounded-3xl bg-[#0a0f1d]/50 border border-white/5 space-y-3">
                <Tv className="w-12 h-12 text-slate-600 mx-auto" />
                <p className="text-sm text-slate-400 font-bold">Hozircha qismlar yuklanmagan</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {episodes.map((ep) => (
                  <Link
                    key={ep.id}
                    href={`/watch/${ep.anime_id}?ep=${ep.episode_number}&fandub=${encodeURIComponent(studio.slug)}&fandub_id=${studio.id}`}
                    className={`group rounded-2xl bg-[#0a0f1d] border border-white/10 hover:${theme.border} p-3 transition-all hover:shadow-lg space-y-2.5`}
                  >
                    <div className="relative aspect-video rounded-xl overflow-hidden bg-black/40">
                      {ep.thumbnail_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={ep.thumbnail_url}
                          alt={ep.title || `${ep.episode_number}-qism`}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                      ) : (
                        <div className={`w-full h-full flex items-center justify-center bg-gradient-to-tr ${theme.headerGrad}`}>
                          <Play className="w-8 h-8 text-white/50" />
                        </div>
                      )}
                      <div className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded-md bg-black/80 backdrop-blur-md text-[10px] font-mono font-bold text-white flex items-center gap-1">
                        <Clock className="w-2.5 h-2.5" />
                        {Math.floor((ep.duration || 1440) / 60)} daq
                      </div>
                      {ep.is_vip && (
                        <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-amber-500 text-black text-[10px] font-black shadow-neon flex items-center gap-1">
                          <Crown className="w-2.5 h-2.5" /> VIP
                        </div>
                      )}
                    </div>

                    <div>
                      <h4 className={`text-xs font-black text-white group-hover:${theme.accent} transition-colors line-clamp-1`}>
                        {ep.title || `${ep.episode_number}-qism`}
                      </h4>
                      <p className="text-[10px] text-slate-400 line-clamp-1">
                        {ep.anime_title || "Anime"}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "team" && (
          <div>
            {members.length === 0 ? (
              <div className="text-center py-16 px-4 rounded-3xl bg-[#0a0f1d]/50 border border-white/5 space-y-3">
                <Users className="w-12 h-12 text-slate-600 mx-auto" />
                <p className="text-sm text-slate-400 font-bold">Jamoa a&apos;zolari ko&apos;rsatilmagan</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {members.map((member) => (
                  <div
                    key={member.id}
                    className={`flex items-center gap-3.5 p-4 rounded-2xl bg-[#0a0f1d] border ${theme.border} hover:border-white/20 transition-all`}
                  >
                    {member.photo_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={member.photo_url}
                        alt={member.first_name || "Dublyor"}
                        className="w-12 h-12 rounded-xl object-cover border border-white/10 shrink-0"
                      />
                    ) : (
                      <div className={`w-12 h-12 rounded-xl ${theme.badge} flex items-center justify-center font-black text-lg shrink-0`}>
                        {member.role === "ADMIN" || member.role === "OWNER" ? "👑" : "🎙️"}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <h4 className="text-xs font-black text-white truncate">
                          {member.first_name || `A'zo #${member.id}`}
                        </h4>
                        <span className={`text-[9px] px-2 py-0.5 rounded-full ${theme.badge} font-black uppercase tracking-wider shrink-0`}>
                          {member.role || "Dabler"}
                        </span>
                      </div>
                      {member.username ? (
                        <a
                          href={`https://t.me/${member.username}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[11px] text-sky-400 hover:text-sky-300 font-bold flex items-center gap-1 mt-0.5 transition-colors"
                        >
                          <Send className="w-2.5 h-2.5" />
                          <span>@{member.username}</span>
                        </a>
                      ) : (
                        <p className="text-[10px] text-slate-500 mt-0.5 font-mono">
                          ID: {member.telegram_id}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* VIP Subscription Modal */}
        {isVIPModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <div className="relative w-full max-w-md rounded-3xl bg-[#0d1222] border border-amber-500/30 p-6 sm:p-8 space-y-5 shadow-2xl">
              <button
                type="button"
                onClick={() => setIsVIPModalOpen(false)}
                className="absolute top-4 right-4 p-2 rounded-xl bg-white/5 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="text-center space-y-2">
                <div className="w-14 h-14 rounded-2xl bg-amber-500/20 text-amber-400 mx-auto flex items-center justify-center border border-amber-500/30 shadow-neon">
                  <Crown className="w-7 h-7" />
                </div>
                <h3 className="text-lg font-black text-white">
                  [{studio.name}] VIP Obunasi
                </h3>
                <p className="text-xs text-slate-300">
                  Dublyaj jamoasini to&apos;g&apos;ridan-to&apos;g&apos;ri qo&apos;llab-quvvatlang va yangi qismlarni
                  hech qanday cheklovlarsiz birinchilardan bo&apos;lib tomosha qiling!
                </p>
              </div>

              {/* Price Banner */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/20 to-rose-500/20 border border-amber-500/30 text-center space-y-1">
                <span className="text-[10px] text-amber-400 font-bold uppercase tracking-wider">
                  Oylik Obuna Narxi
                </span>
                <div className="text-2xl font-black text-white">
                  {(studio.vip_price || 10000).toLocaleString()} <span className="text-xs text-slate-400">so&apos;m/oy</span>
                </div>
              </div>

              {/* Direct Support Contact Link */}
              <div className="space-y-2">
                <a
                  href={studio.contact_url || "https://t.me/iskurama"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-gradient-to-r from-amber-500 to-rose-600 hover:from-amber-400 hover:to-rose-500 text-white text-xs font-black shadow-neon transition-all"
                >
                  <Send className="w-4 h-4" />
                  <span>💬 Fandub Adminga Yozish / VIP Olish</span>
                </a>

                <p className="text-[10px] text-slate-500 text-center leading-relaxed">
                  To&apos;lov chekini yuborganingizdan so&apos;ng, adminlar sizning profilingizga avtomatik tarzda VIP maqomini biriktirib berishadi.
                </p>
              </div>
            </div>
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  );
}
