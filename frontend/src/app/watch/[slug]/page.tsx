"use client";

import React, { useState, useEffect, use, useRef, useMemo } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Navbar } from "@/components/navbar";
import { BottomNav } from "@/components/bottom-nav";
import dynamic from "next/dynamic";
import { EpisodeSelector } from "@/components/episode-selector";

const VideoPlayer = dynamic(
  () => import("@/components/video-player").then((mod) => mod.VideoPlayer),
  {
    ssr: false,
    loading: () => (
      <div className="w-full aspect-video bg-black/70 rounded-2xl flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    ),
  }
);
import { SkeletonWatch } from "@/components/skeletons";
import { RelatedCarousel } from "@/components/related-carousel";
import {
  Crown,
  Play,
  Heart,
  Share2,
  Sparkles,
  Star,
  MessageSquare,
  Mic,
  Send,
  Check,
  FastForward,
  ShieldCheck,
  Film,
  Clock,
  Moon,
  Lightbulb,
  Calendar,
  Tv,
  Users,
  Bookmark,
  Eye,
  ChevronLeft,
  X,
  Search,
  LayoutGrid,
  RefreshCw,
  ExternalLink,
} from "lucide-react";
import { Anime, Episode } from "@/types/anime";
import { useAuth } from "@/context/auth-context";

interface FandubItem {
  id: number;
  name: string;
  slug: string;
  logo_url?: string;
}

interface WatchPageProps {
  params: Promise<{ slug: string }>;
}

export default function WatchPage({ params }: WatchPageProps) {
  const { slug } = use(params);
  const { user, setIsAuthModalOpen } = useAuth();
  const searchParams = useSearchParams();
  const epParam = searchParams.get("ep");
  const fandubParam = searchParams.get("fandub");
  const fandubIdParam = searchParams.get("fandub_id");
  const timeParam = searchParams.get("t");
  const initialTime = timeParam ? parseFloat(timeParam) : undefined;
  const lastHistorySaveRef = useRef(0);

  const [anime, setAnime] = useState<Anime | null>(null);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [fandubs, setFandubs] = useState<FandubItem[]>([]);
  const [selectedFandubId, setSelectedFandubId] = useState<number>(1);

  const filteredEpisodes = useMemo(() => {
    if (!selectedFandubId || selectedFandubId === 0) return episodes;
    const matching = episodes.filter((e) => (e.fandub_id || 1) === selectedFandubId);
    return matching.length > 0 ? matching : episodes;
  }, [episodes, selectedFandubId]);

  const selectedFandub = useMemo(() => {
    return fandubs.find((f) => f.id === selectedFandubId) || null;
  }, [fandubs, selectedFandubId]);

  const handleSwitchFandub = (newFandubId: number) => {
    setSelectedFandubId(newFandubId);
    if (newFandubId === 0) return; // All voices mode
    const currentEpNum = currentEpisode?.episode_number || 1;
    // Smart switch: if same episode number exists in new fandub, preserve it
    const sameEp = episodes.find((e) => (e.fandub_id || 1) === newFandubId && e.episode_number === currentEpNum);
    if (sameEp) {
      setCurrentEpisode(sameEp);
    } else {
      const firstEp = episodes.find((e) => (e.fandub_id || 1) === newFandubId);
      if (firstEp) {
        setCurrentEpisode(firstEp);
      }
    }
  };
  const [relatedAnimes, setRelatedAnimes] = useState<Anime[]>([]);
  const [currentEpisode, setCurrentEpisode] = useState<Episode | null>(null);
  const [signedStreamUrl, setSignedStreamUrl] = useState<string>("");
  const [isVIPBlocked, setIsVIPBlocked] = useState(false);
  const [fandubVIPInfo, setFandubVIPInfo] = useState<{
    fandub_name: string;
    contact_url: string;
    vip_price: number;
    error?: string;
  } | null>(null);
  const [isFavorite, setIsFavorite] = useState(false);
  const [shared, setShared] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const [claimPolling, setClaimPolling] = useState(false);
  const [claimToken, setClaimToken] = useState<string | null>(null);

  // Responsive Layout state
  const [isEpisodesModalOpen, setIsEpisodesModalOpen] = useState(false);
  const [episodeFilterText, setEpisodeFilterText] = useState("");

  // Comments State
  const [comments, setComments] = useState<any[]>([]);
  const [commentText, setCommentText] = useState("");
  const [commentRating, setCommentRating] = useState(10);
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);

  // Auto-next countdown
  const [countdown, setCountdown] = useState<number | null>(null);
  const [nextEpisodeTarget, setNextEpisodeTarget] = useState<Episode | null>(null);
  const autoNextTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Cinema / Theater Mode State
  const [isCinemaMode, setIsCinemaMode] = useState(false);

  // Watch Status & Rating State (Tensei Style)
  const [userWatchStatus, setUserWatchStatus] = useState<"watching" | "planned" | "completed" | null>(null);
  const [userGivenRating, setUserGivenRating] = useState<number | null>(null);
  const [statusToast, setStatusToast] = useState<string | null>(null);
  const [isSynopsisExpanded, setIsSynopsisExpanded] = useState(false);

  useEffect(() => {
    if (!slug) return;
    const savedStatus = localStorage.getItem(`status_${slug}`) as any;
    if (savedStatus) setUserWatchStatus(savedStatus);
    const savedRating = localStorage.getItem(`rate_${slug}`);
    if (savedRating) setUserGivenRating(parseInt(savedRating));
  }, [slug]);

  const handleUpdateStatus = (status: "watching" | "planned" | "completed") => {
    const newStatus = userWatchStatus === status ? null : status;
    setUserWatchStatus(newStatus);
    if (newStatus) {
      localStorage.setItem(`status_${slug}`, newStatus);
      const labels = {
        watching: "👁️ 'Ko'rilmoqda' ro'yxatiga qo'shildi",
        planned: "🔖 'Rejada' ro'yxatiga qo'shildi",
        completed: "✓ 'Ko'rildi' deb belgilandi",
      };
      setStatusToast(labels[newStatus]);
    } else {
      localStorage.removeItem(`status_${slug}`);
      setStatusToast("Ro'yxatdan olib tashlandi");
    }
    setTimeout(() => setStatusToast(null), 3000);
  };

  const handleUserRate = (score: number) => {
    setUserGivenRating(score);
    localStorage.setItem(`rate_${slug}`, score.toString());
    setStatusToast(`⭐ Siz ushbu animeni ${score}/10 ball bilan baholadingiz!`);
    setTimeout(() => setStatusToast(null), 3000);
  };

  const handleScrollToPlayer = () => {
    const el = document.getElementById("player-section");
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isCinemaMode) {
        setIsCinemaMode(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isCinemaMode]);

  // Poll for VIP claim status if active
  useEffect(() => {
    if (!claimPolling || !claimToken) return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/v1/anime/claim-vip/status?token=${claimToken}`);
        const data = await res.json();
        if (data.is_verified) {
          setClaimPolling(false);
          setIsVIPBlocked(false);
          if (currentEpisode) {
            const tgParam = user?.telegram_id ? `&telegram_id=${user.telegram_id}` : "";
            const emailParam = user?.email ? `&email=${encodeURIComponent(user.email)}` : "";
            const tokenRes = await fetch(`/api/v1/stream/token?episode_id=${currentEpisode.id || currentEpisode.episode_number}${tgParam}${emailParam}`);
            const tokenData = await tokenRes.json();
            if (tokenData.success && tokenData.stream_url) {
              setSignedStreamUrl(tokenData.stream_url);
            }
          }
        }
      } catch (err) {
        console.error(err);
      }
    }, 2500);

    return () => clearInterval(interval);
  }, [claimPolling, claimToken, currentEpisode, user]);

  const handleStartClaimVIP = async () => {
    try {
      const res = await fetch("/api/v1/anime/claim-vip/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: user?.email || "" }),
      });
      const data = await res.json();
      if (data.token) {
        setClaimToken(data.token);
        setClaimPolling(true);
      }
      if (data.bot_url) {
        window.open(data.bot_url, "_blank");
      }
    } catch (e) {
      console.error(e);
      window.open("https://t.me/hikakuzbot?start=claimvip", "_blank");
    }
  };

  // Fetch Anime & Episodes & Comments
  useEffect(() => {
    fetch(`/api/v1/anime/detail?slug=${slug}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setAnime(data.anime);
          setEpisodes(data.episodes || []);
          if (data.fandubs && data.fandubs.length > 0) {
            setFandubs(data.fandubs);
            let targetFandub = data.fandubs[0];
            if (fandubIdParam) {
              const parsedId = parseInt(fandubIdParam);
              const found = data.fandubs.find((f: FandubItem) => f.id === parsedId);
              if (found) targetFandub = found;
            } else if (fandubParam) {
              const found = data.fandubs.find((f: FandubItem) => f.slug === fandubParam || f.name.toLowerCase() === fandubParam.toLowerCase());
              if (found) targetFandub = found;
            }
            setSelectedFandubId(targetFandub.id);

            if (data.episodes?.length > 0) {
              if (epParam) {
                const target = data.episodes.find((e: Episode) => (e.fandub_id || 1) === targetFandub.id && e.episode_number === parseInt(epParam))
                  || data.episodes.find((e: Episode) => e.episode_number === parseInt(epParam));
                setCurrentEpisode(target || data.episodes[0]);
              } else {
                const firstForFandub = data.episodes.find((e: Episode) => (e.fandub_id || 1) === targetFandub.id);
                setCurrentEpisode(firstForFandub || data.episodes[0]);
              }
            }
          } else if (data.episodes?.length > 0) {
            if (epParam) {
              const target = data.episodes.find((e: Episode) => e.episode_number === parseInt(epParam));
              setCurrentEpisode(target || data.episodes[0]);
            } else {
              setCurrentEpisode(data.episodes[0]);
            }
          }
        }
      })
      .catch((e) => console.log(e))
      .finally(() => setIsLoading(false));

    fetch(`/api/v1/anime/comments?slug=${slug}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.data) {
          setComments(data.data);
        }
      })
      .catch((e) => console.log(e));

    const savedFav = localStorage.getItem(`fav_${slug}`);
    if (savedFav === "true") setIsFavorite(true);
  }, [slug, epParam]);

  const checkEpisodeAccess = async (ep: Episode) => {
    if (!ep) return;
    const getDirectStreamUrl = (targetEp: Episode) => {
      const b2Key = (targetEp as any).b2_key;
      if (b2Key && typeof b2Key === "string" && b2Key.length > 0) {
        if (b2Key.startsWith("http://") || b2Key.startsWith("https://")) return b2Key;
        return `https://cdn.hikaku.uz/${b2Key.replace(/^\/+/, "")}`;
      }
      return targetEp.stream_url || `/stream/episode/${targetEp.id || targetEp.episode_number}.m3u8`;
    };

    if (!ep.is_vip_only) {
      setIsVIPBlocked(false);
      setFandubVIPInfo(null);
      setSignedStreamUrl(getDirectStreamUrl(ep));
      return;
    }

    const tgId = Number(user?.telegram_id || user?.id || 0);
    // Superadmin / founder / admin bypass
    if (tgId === 5415350162 || tgId === 6149114216 || user?.is_admin) {
      setIsVIPBlocked(false);
      setFandubVIPInfo(null);
      setSignedStreamUrl(getDirectStreamUrl(ep));
      return;
    }

    try {
      const res = await fetch(`/api/v1/stream/token?episode_id=${ep.id}&telegram_id=${tgId}&email=${encodeURIComponent(user?.email || '')}`);
      const data = await res.json();
      if (!res.ok || data.is_vip_required) {
        setFandubVIPInfo({
          fandub_name: data.fandub_name || "Fandub",
          contact_url: data.contact_url || "https://t.me/iskurama",
          vip_price: data.vip_price || 10000,
          error: data.error,
        });
        setIsVIPBlocked(true);
      } else {
        setIsVIPBlocked(false);
        setFandubVIPInfo(null);
        const streamUrl = getDirectStreamUrl(ep);
        setSignedStreamUrl(streamUrl);
      }
    } catch (e) {
      console.error("Stream access check error:", e);
      const streamUrl = getDirectStreamUrl(ep);
      setSignedStreamUrl(streamUrl);
    }
  };

  useEffect(() => {
    if (!currentEpisode) return;
    checkEpisodeAccess(currentEpisode);
  }, [currentEpisode, user]);

  const cancelAutoNext = () => {
    if (autoNextTimerRef.current) {
      clearInterval(autoNextTimerRef.current);
      autoNextTimerRef.current = null;
    }
    setCountdown(null);
    setNextEpisodeTarget(null);
  };

  const playNextNow = () => {
    if (autoNextTimerRef.current) {
      clearInterval(autoNextTimerRef.current);
      autoNextTimerRef.current = null;
    }
    if (nextEpisodeTarget) {
      setCurrentEpisode(nextEpisodeTarget);
    }
    setCountdown(null);
    setNextEpisodeTarget(null);
  };

  // Handle Video Ended (Auto-Next 5s Modal)
  const handleVideoEnded = () => {
    if (!currentEpisode || episodes.length <= 1) return;
    const currentIndex = episodes.findIndex((e) => e.id === currentEpisode.id);
    if (currentIndex >= 0 && currentIndex < episodes.length - 1) {
      const nextEp = episodes[currentIndex + 1];
      setNextEpisodeTarget(nextEp);
      setCountdown(5);
      if (autoNextTimerRef.current) clearInterval(autoNextTimerRef.current);
      autoNextTimerRef.current = setInterval(() => {
        setCountdown((prev) => {
          if (prev !== null && prev <= 1) {
            if (autoNextTimerRef.current) clearInterval(autoNextTimerRef.current);
            setCurrentEpisode(nextEp);
            setNextEpisodeTarget(null);
            return null;
          }
          return prev !== null ? prev - 1 : null;
        });
      }, 1000);
    }
  };

  // Save watch progress to local watch history
  const handleTimeUpdate = (currentTime: number, duration: number) => {
    const now = Date.now();
    if (now - lastHistorySaveRef.current > 3500 && anime && currentEpisode) {
      lastHistorySaveRef.current = now;
      try {
        const raw = localStorage.getItem("hikaku_watch_history");
        const list = raw ? JSON.parse(raw) : [];
        const filtered = list.filter(
          (item: any) => !(item.slug === slug && item.episode_number === currentEpisode.episode_number)
        );
        filtered.unshift({
          id: anime.id,
          slug: anime.slug,
          title: anime.title_uz || anime.title_en || "Anime",
          poster_url: anime.poster_url,
          episode_number: currentEpisode.episode_number,
          currentTime: Math.floor(currentTime),
          duration: Math.floor(duration),
          updated_at: now,
        });
        localStorage.setItem("hikaku_watch_history", JSON.stringify(filtered.slice(0, 30)));
      } catch (err) {
        console.error("Watch history error:", err);
      }
    }
  };

  // Toggle Favorite with full anime object saved
  const toggleFavorite = () => {
    if (!anime) return;
    const nextVal = !isFavorite;
    setIsFavorite(nextVal);
    try {
      localStorage.setItem(`fav_${slug}`, nextVal ? "true" : "false");
      const raw = localStorage.getItem("hikaku_favorites");
      const list = raw ? JSON.parse(raw) : [];
      if (nextVal) {
        const exists = list.some((f: any) => f.id === anime.id);
        if (!exists) {
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
        const filtered = list.filter((f: any) => f.id !== anime.id);
        localStorage.setItem("hikaku_favorites", JSON.stringify(filtered));
      }
    } catch (e) {
      console.error("Favorites error:", e);
    }
  };

  // Share
  const handleShare = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      setShared(true);
      setTimeout(() => setShared(false), 2000);
    }
  };

  // Submit Comment
  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;

    if (!user) {
      setIsAuthModalOpen(true);
      return;
    }

    setIsSubmittingComment(true);
    try {
      const res = await fetch("/api/v1/anime/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          anime_slug: slug,
          user_name: user.first_name || "Foydalanuvchi",
          user_photo: user.photo_url || "",
          content: commentText.trim(),
          rating: commentRating,
        }),
      });
      const data = await res.json();
      if (data.success && data.comment) {
        setComments([data.comment, ...comments]);
        setCommentText("");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmittingComment(false);
    }
  };

  // Filter episodes in modal
  const filteredModalEpisodes = useMemo(() => {
    if (!episodeFilterText.trim()) return episodes;
    const q = episodeFilterText.toLowerCase();
    return episodes.filter(
      (ep) =>
        ep.episode_number.toString().includes(q) ||
        (ep.title && ep.title.toLowerCase().includes(q))
    );
  }, [episodes, episodeFilterText]);

  const renderFandubSelector = () => {
    if (fandubs.length === 0) return null;

    return (
      <div className="p-3 sm:p-3.5 rounded-2xl bg-[#0a0f1d]/90 border border-white/10 shadow-xl space-y-2.5 backdrop-blur-xl">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-6 h-6 rounded-lg bg-rose-500/20 text-rose-400 flex items-center justify-center shrink-0">
              <Mic className="w-3.5 h-3.5" />
            </div>
            <span className="text-xs font-black text-white truncate">
              Ovoz beruvchi studiyalar:
            </span>
            <span className="text-[10px] text-slate-400 font-bold shrink-0">
              ({fandubs.length} ta jamoa)
            </span>
          </div>

          {selectedFandub && selectedFandub.slug && (
            <Link
              href={`/fandubs/${selectedFandub.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-400 hover:text-rose-300 transition-colors shrink-0 group"
            >
              <span>Studiya profili</span>
              <ExternalLink className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          )}
        </div>

        {/* Scrollable studio chips */}
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-none pb-0.5">
          {fandubs.length > 1 && (
            <button
              type="button"
              onClick={() => setSelectedFandubId(0)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${
                selectedFandubId === 0
                  ? "bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-lg border border-indigo-400"
                  : "bg-white/5 text-slate-400 hover:text-white border border-white/10"
              }`}
            >
              <span>Barcha Ovozlar</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-white/10 text-slate-300">
                {episodes.length}
              </span>
            </button>
          )}

          {fandubs.map((f) => {
            const isSelected = selectedFandubId === f.id;
            const count = episodes.filter((e) => (e.fandub_id || 1) === f.id).length;
            return (
              <button
                key={f.id}
                type="button"
                onClick={() => handleSwitchFandub(f.id)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-2 ${
                  isSelected
                    ? "bg-gradient-to-r from-rose-600 to-rose-500 text-white shadow-[0_0_15px_rgba(244,63,94,0.35)] border border-rose-400 scale-102"
                    : "bg-white/5 text-slate-400 hover:text-white border border-white/10 hover:border-white/20"
                }`}
              >
                <Mic className={`w-3 h-3 ${isSelected ? "text-white" : "text-rose-500"}`} />
                <span>{f.name}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${isSelected ? "bg-white/20 text-white" : "bg-white/10 text-slate-400"}`}>
                  {count} qism
                </span>
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#060911] text-slate-100 flex flex-col">
        <Navbar />
        <main className="flex-1 max-w-7xl w-full mx-auto px-3.5 sm:px-6 lg:px-8 pt-20 sm:pt-28 pb-16">
          <SkeletonWatch />
        </main>
        <BottomNav />
      </div>
    );
  }

  if (!anime) {
    return (
      <div className="min-h-screen bg-[#060911] flex flex-col items-center justify-center p-4 text-center space-y-4">
        <h1 className="text-3xl font-black text-white">404 - Anime Topilmadi</h1>
        <p className="text-xs text-slate-400">Qidirilayotgan anime mavjud emas yoki o&apos;chirilgan.</p>
        <Link href="/" className="px-5 py-2.5 rounded-xl bg-white/10 text-white font-bold text-xs">
          Bosh sahifaga qaytish
        </Link>
      </div>
    );
  }

  // Common Video Player Renderer
  const renderPlayerBox = (isMobileView: boolean) => (
    <div
      className={`relative overflow-hidden bg-black transition-all duration-300 ${
        isMobileView
          ? "w-full max-w-full rounded-2xl border border-white/15 shadow-[0_8px_30px_rgba(0,0,0,0.7)] ring-1 ring-white/5 min-w-0 overflow-hidden box-border"
          : isCinemaMode
          ? "rounded-3xl border-2 border-rose-500/80 shadow-[0_0_80px_rgba(225,29,72,0.45)] ring-4 ring-rose-500/20 scale-[1.01]"
          : "rounded-3xl border border-rose-900/30 shadow-2xl"
      }`}
    >
      {currentEpisode ? (
        isVIPBlocked ? (
          <div className="aspect-video w-full flex flex-col items-center justify-center p-6 text-center space-y-4 bg-gradient-to-br from-[#121629] to-[#060911]">
            <div className="w-14 h-14 rounded-2xl bg-amber-400/20 text-amber-400 flex items-center justify-center shadow-[0_0_20px_rgba(245,158,11,0.3)]">
              <Crown className="w-7 h-7" />
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-white">
                {fandubVIPInfo ? `Ushbu Qism Faqat [${fandubVIPInfo.fandub_name}] VIP Obunachilari Uchun` : "Ushbu Qism Faqat VIP Obunachilar Uchun"}
              </h3>
              <p className="text-xs text-slate-400 max-w-sm">
                {fandubVIPInfo ? (
                  <>
                    Ushbu dublyaj ijodkorlarini qo&apos;llab-quvvatlang va yangi qismlarni birinchilardan bo&apos;lib tomosha qiling!
                    {fandubVIPInfo.vip_price > 0 && ` Obuna narxi: ${fandubVIPInfo.vip_price.toLocaleString()} so'm.`}
                  </>
                ) : (
                  "Atigi 10 000 so'm evaziga 30 kunlik cheksiz Full HD anime tomoshasi yoki homiy kanallarga a'zo bo'lib 1 soatlik bepul VIP oling!"
                )}
              </p>
            </div>
            <div className="flex flex-col sm:flex-row items-center gap-3">
              {fandubVIPInfo ? (
                <>
                  <a
                    href={fandubVIPInfo.contact_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 via-rose-500 to-indigo-600 text-white font-black text-xs shadow-[0_0_20px_rgba(245,158,11,0.4)] hover:scale-105 transition-all flex items-center gap-2"
                  >
                    <Sparkles className="w-4 h-4" /> 💬 Fandub Adminga Yozish / VIP Olish
                  </a>
                  <button
                    onClick={() => currentEpisode && checkEpisodeAccess(currentEpisode)}
                    className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white font-bold text-xs transition-all flex items-center gap-1.5"
                  >
                    <RefreshCw className="w-3.5 h-3.5" /> Qayta Tekshirish
                  </button>
                </>
              ) : (
                <>
                  <Link
                    href="/fandubs"
                    className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 via-rose-500 to-indigo-600 text-white font-black text-xs shadow-neon hover:scale-105 transition-all flex items-center gap-2"
                  >
                    <Sparkles className="w-4 h-4" /> 🎙 Fandub Studiyalar Ro&apos;yxati
                  </Link>
                  <button
                    onClick={() => currentEpisode && checkEpisodeAccess(currentEpisode)}
                    className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white font-bold text-xs transition-all flex items-center gap-1.5"
                  >
                    <RefreshCw className="w-3.5 h-3.5" /> Qayta Tekshirish
                  </button>
                </>
              )}
            </div>
          </div>
        ) : signedStreamUrl ? (
          <VideoPlayer
            key={signedStreamUrl}
            src={signedStreamUrl}
            poster={anime.poster_url}
            comments={comments}
            initialTime={initialTime}
            onTimeUpdate={handleTimeUpdate}
            onEnded={handleVideoEnded}
          />
        ) : (
          <div className="aspect-video w-full flex items-center justify-center text-slate-400 text-xs">
            Xavfsiz strim tayyorlanmoqda...
          </div>
        )
      ) : (
        <div className="relative aspect-video w-full flex flex-col items-center justify-center p-6 text-center overflow-hidden bg-[#070913]">
          {anime.poster_url && (
            <div
              className="absolute inset-0 bg-cover bg-center blur-2xl opacity-25 scale-110"
              style={{ backgroundImage: `url(${anime.poster_url})` }}
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-[#060911] via-black/60 to-transparent" />
          
          <div className="relative z-10 flex flex-col items-center space-y-3 max-w-sm">
            <div className="w-12 h-12 rounded-2xl bg-rose-600/20 border border-rose-500/30 text-rose-500 flex items-center justify-center shadow-neon">
              <Film className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h4 className="text-sm sm:text-base font-black text-white">
                Qismlar Tayyorlanmoqda
              </h4>
              <p className="text-[11px] sm:text-xs text-slate-400 leading-relaxed">
                Ushbu anime uchun epizodlar tez orada Backblaze B2 xotirasiga yuklanadi va tomoshaga taqdim etiladi.
              </p>
            </div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold bg-white/5 border border-white/10 text-slate-300">
              <Clock className="w-3 h-3 text-cyan-400" /> Tez kunlarda
            </span>
          </div>
        </div>
      )}
    </div>
  );

  // Common Comments Section
  const renderCommentsSection = () => (
    <section className="p-4 sm:p-8 rounded-3xl bg-[#0e1222]/90 border border-white/10 space-y-5 shadow-2xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-rose-500/20 text-rose-400">
            <MessageSquare className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div>
            <h3 className="text-sm sm:text-lg font-black text-white">Fikrlar & Baholar ({comments.length})</h3>
            <p className="text-[10px] sm:text-xs text-slate-400">Muxlislar taassurotlari va sharhlari</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleAddComment} className="space-y-3 bg-[#070914] p-3.5 sm:p-4 rounded-2xl border border-white/10">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-300">Baholang:</span>
            <span className="px-2 py-0.5 rounded-md bg-amber-400/20 text-amber-300 font-bold text-xs">
              ★ {commentRating} / 10
            </span>
          </div>
          <div className="flex items-center gap-1 overflow-x-auto pb-1 max-w-full">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
              <button
                key={num}
                type="button"
                onClick={() => setCommentRating(num)}
                className={`min-w-6 h-6 px-1.5 rounded-lg text-[10px] font-bold transition-all shrink-0 ${
                  commentRating >= num ? "bg-amber-400 text-black shadow-sm" : "bg-white/5 text-slate-400 hover:text-white"
                }`}
              >
                {num}
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-2">
          <input
            type="text"
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            placeholder={user ? "Ushbu anime haqida fikringizni yozing..." : "Fikr qoldirish uchun tizimga kiring..."}
            className="flex-1 bg-[#0f1424] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-rose-500/50"
          />
          <button
            type="submit"
            disabled={isSubmittingComment}
            className="px-3.5 sm:px-4 py-2 rounded-xl bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400 text-white font-bold text-xs shadow-neon transition-all flex items-center gap-1.5 shrink-0"
          >
            <Send className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Yuborish</span>
          </button>
        </div>
      </form>

      {comments.length === 0 ? (
        <p className="text-xs text-slate-500 py-4 text-center">
          Hozircha izohlar mavjud emas. Birinchi bo&apos;lib o&apos;z fikringizni bildiring!
        </p>
      ) : (
        <div className="space-y-2.5">
          {comments.map((c) => (
            <div key={c.id} className="p-3.5 rounded-2xl bg-[#070914] border border-white/5 space-y-1.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-rose-500/20 text-rose-400 flex items-center justify-center font-bold text-[10px]">
                    {c.user_name?.[0] || "U"}
                  </div>
                  <div>
                    <span className="text-xs font-bold text-white block">{c.user_name}</span>
                    <span className="text-[9px] text-slate-500">Muxlis</span>
                  </div>
                </div>

                <div className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-400/10 text-amber-400 font-bold text-[10px]">
                  <Star className="w-2.5 h-2.5 fill-amber-400" />
                  <span>{c.rating}/10</span>
                </div>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed pl-8">{c.content}</p>
            </div>
          ))}
        </div>
      )}
    </section>
  );

  return (
    <>
      <Navbar />

      <main className="w-full max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 pt-20 sm:pt-28 pb-36 sm:pb-24 space-y-4 sm:space-y-8 overflow-x-hidden min-w-0 box-border">
        {/* Status Action Toast */}
        {statusToast && (
          <div className="fixed top-20 right-4 sm:right-8 z-50 px-4 py-2.5 rounded-2xl bg-[#0b0f1d] border border-rose-500/50 shadow-[0_0_25px_rgba(225,29,72,0.4)] text-xs font-bold text-white flex items-center gap-2 animate-slide-up">
            <span>{statusToast}</span>
          </div>
        )}

        {/* 5-Soniyalik Keyingi Qism Modali */}
        {countdown !== null && nextEpisodeTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
            <div className="relative w-full max-w-sm sm:max-w-md p-6 rounded-3xl bg-[#0b0f19]/95 border border-rose-500/40 shadow-[0_0_50px_rgba(244,63,94,0.3)] backdrop-blur-2xl text-center overflow-hidden">
              <div className="absolute -top-12 -left-12 w-32 h-32 bg-rose-500/20 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute -bottom-12 -right-12 w-32 h-32 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />

              <div className="relative mx-auto w-20 h-20 mb-4 flex items-center justify-center">
                <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 36 36">
                  <path
                    className="text-white/10"
                    strokeWidth="3.5"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                  <path
                    className="text-rose-500 transition-all duration-1000 ease-linear"
                    strokeDasharray={`${(countdown / 5) * 100}, 100`}
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center font-black text-2xl text-white tracking-tighter">
                  {countdown}
                </div>
              </div>

              <div className="flex items-center justify-center gap-2 mb-1.5">
                <FastForward className="w-4 h-4 text-rose-400 animate-pulse" />
                <span className="text-xs font-bold uppercase tracking-widest text-rose-400">Keyingi Qismga O&apos;tish</span>
              </div>
              <h3 className="text-base sm:text-lg font-black text-white line-clamp-1 mb-1">
                {nextEpisodeTarget.episode_number}-Qism: {nextEpisodeTarget.title || (anime?.title_uz || anime?.title_en) || "Keyingi qism"}
              </h3>
              <p className="text-xs text-slate-400 mb-6">
                Avtomatik ijro {countdown} soniyadan keyin boshlanadi...
              </p>

              <div className="flex items-center gap-3">
                <button
                  onClick={cancelAutoNext}
                  className="flex-1 py-3 px-4 rounded-xl bg-white/10 hover:bg-white/15 text-slate-300 hover:text-white text-xs font-bold transition-all border border-white/10 active:scale-95"
                >
                  Bekor qilish
                </button>
                <button
                  onClick={playNextNow}
                  className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 text-white text-xs font-bold shadow-lg shadow-rose-500/30 transition-all active:scale-95 flex items-center justify-center gap-2"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  Hozir ko&apos;rish
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Cinema Mode Dimming Backdrop */}
        {isCinemaMode && (
          <div
            onClick={() => setIsCinemaMode(false)}
            className="fixed inset-0 bg-black/92 backdrop-blur-md z-40 transition-opacity duration-300 cursor-pointer"
          />
        )}

        {/* ======================================================== */}
        {/* 1. MOBILE NATIVE CRUNCHYROLL / YOUTUBE VIEW (< 768px)    */}
        {/* ======================================================== */}
        <div className="block md:hidden space-y-3.5 w-full max-w-full min-w-0 overflow-x-hidden box-border">
          {/* Top Cyber-Card Video Player (Cleanly Padded & Rounded) */}
          <div className="w-full">
            {renderPlayerBox(true)}
          </div>

          {/* Player Quick Bar: Current Episode Title & Theater Toggle */}
          <div className="w-full max-w-full flex items-center justify-between text-xs px-1 min-w-0">
            <span className="font-bold text-slate-300 flex items-center gap-1.5 truncate max-w-[220px]">
              <Play className="w-3.5 h-3.5 text-rose-500 fill-rose-500 shrink-0" />
              <span className="truncate">{currentEpisode?.title || `${currentEpisode?.episode_number || 1}-qism`}</span>
            </span>
            <button
              type="button"
              onClick={() => setIsCinemaMode(!isCinemaMode)}
              className="px-2.5 py-1 rounded-lg bg-white/10 text-slate-300 font-bold text-[11px] flex items-center gap-1 active:scale-95"
            >
              <Moon className="w-3 h-3 text-amber-400" />
              <span>Teatr</span>
            </button>
          </div>

          {/* Under-Player Content Block */}
          <div className="space-y-3.5 px-0.5 w-full max-w-full min-w-0 overflow-hidden box-border">
            {/* Breadcrumb & Share */}
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <Link
                  href="/"
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 text-[11px] font-semibold active:scale-95 transition-all"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>Bosh sahifa</span>
                </Link>
                <span className="text-slate-600">/</span>
                <span className="text-slate-400 font-medium truncate max-w-[170px]">
                  {anime.title_uz}
                </span>
              </div>
              <button
                type="button"
                onClick={handleShare}
                className="p-1.5 rounded-lg bg-white/5 border border-white/10 text-slate-300 active:scale-95 transition-all"
                title="Ulashish"
              >
                {shared ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Share2 className="w-3.5 h-3.5" />}
              </button>
            </div>

            {/* Anime Title & Badges */}
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                {anime.title_en || anime.title_jp || "HIKAKU ANIME"}
              </span>
              <h1 className="text-lg font-black text-white leading-tight">
                {anime.title_uz}
              </h1>

              {/* Meta Badges */}
              <div className="flex flex-wrap items-center gap-1.5 pt-1 text-[10px]">
                <div className="px-2 py-0.5 rounded-md bg-black/70 border border-white/15 text-white font-black flex items-center gap-1 shadow">
                  <Star className="w-2.5 h-2.5 text-amber-400 fill-amber-400" />
                  <span>{anime.score ? Number(anime.score).toFixed(1) : "8.5"}</span>
                </div>
                <span className="px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-slate-300 font-semibold">
                  {anime.year || 2026}
                </span>
                <span className="px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-cyan-400 font-semibold">
                  TV
                </span>
                <span className="px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-emerald-400 font-semibold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  {anime.status === "completed" ? "Tugagan" : "Ongoing"}
                </span>
                <span className="px-2 py-0.5 rounded-md bg-rose-600 text-white font-extrabold text-[9px] uppercase shadow">
                  O&apos;zbekcha Dub
                </span>
              </div>
            </div>

            {/* Mobile Fandub Studio Selector */}
            {renderFandubSelector()}

            {/* Crunchyroll-Style Horizontal Episode Strip */}
            {episodes.length > 0 && (
              <div className="space-y-2 p-3 rounded-2xl bg-[#0c101c]/90 border border-white/10 shadow-lg w-full max-w-full min-w-0 overflow-hidden box-border">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Play className="w-3.5 h-3.5 text-rose-500 fill-rose-500" />
                    <span className="text-xs font-bold text-white">Qismlar</span>
                    <span className="text-[10px] text-slate-400 font-semibold">({episodes.length} ta)</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsEpisodesModalOpen(true)}
                    className="text-xs font-bold text-rose-400 hover:text-rose-300 flex items-center gap-1 active:scale-95"
                  >
                    <span>Barchasi</span>
                    <LayoutGrid className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Horizontal Scroll Chips */}
                <div className="flex items-center gap-2 overflow-x-auto scrollbar-none py-1 w-full max-w-full min-w-0 box-border">
                  {filteredEpisodes.map((ep) => {
                    const isActive = currentEpisode?.id === ep.id;
                    return (
                      <button
                        key={ep.id}
                        type="button"
                        onClick={() => setCurrentEpisode(ep)}
                        className={`shrink-0 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all active:scale-95 border flex items-center gap-1.5 ${
                          isActive
                            ? "bg-gradient-to-r from-rose-600 to-rose-500 text-white border-rose-400 shadow-neon scale-105"
                            : "bg-white/5 hover:bg-white/10 text-slate-300 border-white/10"
                        }`}
                      >
                        <span>EP {ep.episode_number}</span>
                        {isActive && <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 4-Column Equal Micro-Action Status Buttons Row */}
            <div className="grid grid-cols-4 gap-1.5 pt-0.5 w-full max-w-full min-w-0">
              <button
                type="button"
                onClick={() => handleUpdateStatus("watching")}
                className={`flex flex-col items-center justify-center py-2 px-1 rounded-xl border transition-all active:scale-95 min-w-0 w-full ${
                  userWatchStatus === "watching"
                    ? "bg-emerald-500/25 border-emerald-500/70 text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.3)]"
                    : "bg-white/5 border-white/10 text-slate-400"
                }`}
              >
                <Eye className="w-3.5 h-3.5 shrink-0" />
                <span className="text-[9px] font-bold mt-0.5 truncate max-w-full">Ko&apos;rish</span>
              </button>
              <button
                type="button"
                onClick={() => handleUpdateStatus("planned")}
                className={`flex flex-col items-center justify-center py-2 px-1 rounded-xl border transition-all active:scale-95 min-w-0 w-full ${
                  userWatchStatus === "planned"
                    ? "bg-amber-500/25 border-amber-500/70 text-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.3)]"
                    : "bg-white/5 border-white/10 text-slate-400"
                }`}
              >
                <Bookmark className="w-3.5 h-3.5 shrink-0" />
                <span className="text-[9px] font-bold mt-0.5 truncate max-w-full">Rejada</span>
              </button>
              <button
                type="button"
                onClick={() => handleUpdateStatus("completed")}
                className={`flex flex-col items-center justify-center py-2 px-1 rounded-xl border transition-all active:scale-95 min-w-0 w-full ${
                  userWatchStatus === "completed"
                    ? "bg-cyan-500/25 border-cyan-500/70 text-cyan-300 shadow-[0_0_12px_rgba(6,182,212,0.3)]"
                    : "bg-white/5 border-white/10 text-slate-400"
                }`}
              >
                <Check className="w-3.5 h-3.5 shrink-0" />
                <span className="text-[9px] font-bold mt-0.5 truncate max-w-full">Ko&apos;rildi</span>
              </button>
              <button
                type="button"
                onClick={toggleFavorite}
                className={`flex flex-col items-center justify-center py-2 px-1 rounded-xl border transition-all active:scale-95 min-w-0 w-full ${
                  isFavorite
                    ? "bg-rose-500/25 border-rose-500/70 text-rose-300 shadow-[0_0_12px_rgba(244,63,94,0.3)]"
                    : "bg-white/5 border-white/10 text-slate-400"
                }`}
              >
                <Heart className={`w-3.5 h-3.5 shrink-0 ${isFavorite ? "fill-rose-400" : ""}`} />
                <span className="text-[9px] font-bold mt-0.5 truncate max-w-full">Sevimli</span>
              </button>
            </div>

            {/* Dedicated Telegram Link Button (if telegram url exists) */}
            {((anime.telegram_url && anime.telegram_url.trim()) || (anime.studio && anime.studio.startsWith("http"))) && (
              <a
                href={(anime.telegram_url && anime.telegram_url.trim()) || anime.studio}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-sky-500/20 via-sky-500/15 to-blue-500/20 border border-sky-400/40 text-sky-300 font-bold text-xs shadow-lg active:scale-95 transition-all"
              >
                <Send className="w-3.5 h-3.5 text-sky-400" />
                <span>Telegram Kanalimizda Tomosha Qilish</span>
              </a>
            )}

            {/* Expandable Synopsis */}
            {anime.synopsis && (
              <div className="p-3.5 rounded-2xl bg-[#0c101c]/80 border border-white/10 text-xs text-slate-300 leading-relaxed space-y-1">
                <p className={isSynopsisExpanded ? "" : "line-clamp-2"}>
                  {anime.synopsis}
                </p>
                {anime.synopsis.length > 100 && (
                  <button
                    type="button"
                    onClick={() => setIsSynopsisExpanded(!isSynopsisExpanded)}
                    className="text-[11px] font-bold text-rose-400 hover:underline inline-block pt-1"
                  >
                    {isSynopsisExpanded ? "Qisqartirish ▲" : "Batafsil o'qish ▼"}
                  </button>
                )}
              </div>
            )}

            {/* Shunga O'xshash Tavsiyalar (Fixed 140px Touch Carousel) */}
            <RelatedCarousel animes={relatedAnimes} />

            {/* Comments Section */}
            {renderCommentsSection()}
          </div>
        </div>

        {/* ======================================================== */}
        {/* 2. DESKTOP SHOWCASE & PLAYER VIEW (>= 768px)             */}
        {/* ======================================================== */}
        <div className="hidden md:block space-y-8">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-xs">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 transition-all active:scale-95 font-semibold"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Bosh sahifa</span>
            </Link>
            <span className="text-slate-600">/</span>
            <span className="text-slate-400 font-medium truncate max-w-md">
              {anime.title_uz}
            </span>
          </div>

          {/* Desktop Rich Showcase */}
          <section className="grid grid-cols-12 gap-6 lg:gap-8 items-start">
            <div className="col-span-4 lg:col-span-3.5 space-y-3.5">
              <div className="relative rounded-3xl overflow-hidden border border-white/15 bg-[#0e1322] shadow-[0_12px_40px_rgba(0,0,0,0.6)] group aspect-[3/4]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={anime.poster_url || "/placeholder-poster.jpg"}
                  alt={anime.title_uz}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute top-3 left-3 px-2.5 py-1 rounded-xl bg-black/75 backdrop-blur-md border border-white/20 text-white font-black text-xs flex items-center gap-1 shadow-lg">
                  <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                  <span>{anime.score ? Number(anime.score).toFixed(1) : "8.5"}</span>
                </div>
                <div className="absolute top-3 right-3 px-2.5 py-1 rounded-xl bg-rose-600/85 backdrop-blur-md border border-rose-400/40 text-white font-extrabold text-[10px] tracking-wider uppercase shadow-lg">
                  O&apos;zbekcha Dub
                </div>
              </div>

              <div className="grid grid-cols-4 gap-2">
                <button
                  type="button"
                  onClick={() => handleUpdateStatus("watching")}
                  title="Ko'rilmoqda ro'yxatiga qo'shish"
                  className={`flex flex-col items-center justify-center py-2.5 px-2 rounded-2xl border transition-all active:scale-95 ${
                    userWatchStatus === "watching"
                      ? "bg-emerald-500/25 border-emerald-500/70 text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.35)]"
                      : "bg-[#0c101c]/90 border-white/10 text-slate-400 hover:text-white hover:border-white/25"
                  }`}
                >
                  <Eye className="w-4 h-4" />
                  <span className="text-[9px] font-bold mt-1">Ko&apos;rish</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleUpdateStatus("planned")}
                  title="Rejada / Keyinroq ko'rish"
                  className={`flex flex-col items-center justify-center py-2.5 px-2 rounded-2xl border transition-all active:scale-95 ${
                    userWatchStatus === "planned"
                      ? "bg-amber-500/25 border-amber-500/70 text-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.35)]"
                      : "bg-[#0c101c]/90 border-white/10 text-slate-400 hover:text-white hover:border-white/25"
                  }`}
                >
                  <Bookmark className="w-4 h-4" />
                  <span className="text-[9px] font-bold mt-1">Rejada</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleUpdateStatus("completed")}
                  title="Ko'rib bo'lingan deb belgilash"
                  className={`flex flex-col items-center justify-center py-2.5 px-2 rounded-2xl border transition-all active:scale-95 ${
                    userWatchStatus === "completed"
                      ? "bg-cyan-500/25 border-cyan-500/70 text-cyan-300 shadow-[0_0_15px_rgba(6,182,212,0.35)]"
                      : "bg-[#0c101c]/90 border-white/10 text-slate-400 hover:text-white hover:border-white/25"
                  }`}
                >
                  <Check className="w-4 h-4" />
                  <span className="text-[9px] font-bold mt-1">Ko&apos;rildi</span>
                </button>
                <button
                  type="button"
                  onClick={toggleFavorite}
                  title="Sevimlilarga qo'shish"
                  className={`flex flex-col items-center justify-center py-2.5 px-2 rounded-2xl border transition-all active:scale-95 ${
                    isFavorite
                      ? "bg-rose-500/25 border-rose-500/70 text-rose-300 shadow-[0_0_15px_rgba(244,63,94,0.4)]"
                      : "bg-[#0c101c]/90 border-white/10 text-slate-400 hover:text-white hover:border-white/25"
                  }`}
                >
                  <Heart className={`w-4 h-4 ${isFavorite ? "fill-rose-400" : ""}`} />
                  <span className="text-[9px] font-bold mt-1">Sevimli</span>
                </button>
              </div>
            </div>

            <div className="col-span-8 lg:col-span-8.5 rounded-3xl bg-[#0c101c]/90 border border-white/10 p-5 sm:p-7 backdrop-blur-xl shadow-2xl space-y-5">
              <div className="space-y-1">
                <span className="text-[11px] font-black tracking-widest text-slate-400 uppercase block">
                  {anime.title_en || anime.title_jp || "HIKAKU ANIME"}
                </span>
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight leading-tight">
                  {anime.title_uz}
                </h1>
              </div>

              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-4xl">
                {anime.synopsis || "Ushbu anime uchun batafsil ma'lumot tez orada taqdim etiladi."}
              </p>

              <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-slate-300 font-semibold">
                  <Calendar className="w-3.5 h-3.5 text-rose-400" />
                  <span>{anime.year || 2024}</span>
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-slate-300 font-semibold">
                  <Tv className="w-3.5 h-3.5 text-cyan-400" />
                  <span>TV Seriya</span>
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-slate-300 font-semibold">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span>{anime.status === "completed" ? "Yakunlangan" : "Davom etmoqda"}</span>
                </div>
                <div className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-slate-300 font-bold">
                  13+
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-slate-300 font-semibold">
                  <Users className="w-3.5 h-3.5 text-amber-400" />
                  <span>{episodes.length > 0 ? `${episodes.length} ta qism` : "Ko'p qismli"}</span>
                </div>
              </div>

              {anime.genres && anime.genres.length > 0 && (
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  {anime.genres.map((genre, idx) => (
                    <span
                      key={idx}
                      className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-white/5 hover:bg-white/10 border border-white/10 text-slate-200 transition-colors"
                    >
                      {genre}
                    </span>
                  ))}
                </div>
              )}

              <div className="p-4 rounded-2xl bg-[#070a14]/80 border border-white/10 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 font-black text-sm">
                    <Star className="w-5 h-5 fill-amber-400" />
                  </div>
                  <div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-xl font-black text-white">
                        {anime.score ? Number(anime.score).toFixed(1) : "8.5"}
                      </span>
                      <span className="text-xs text-slate-400 font-bold">/ 10</span>
                    </div>
                    <span className="text-[11px] text-slate-400 font-medium">
                      {comments.length > 0 ? `${comments.length * 5 + 8} ta baho` : "O'zbek muxlislari bahosi"}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 bg-black/40 px-3 py-2 rounded-xl border border-white/10">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => handleUserRate(star * 2)}
                      title={`${star * 2} baho berish`}
                      className="p-1 hover:scale-125 transition-transform"
                    >
                      <Star
                        className={`w-4 h-4 transition-colors ${
                          (userGivenRating || 0) >= star * 2
                            ? "text-amber-400 fill-amber-400"
                            : "text-slate-600 hover:text-amber-400"
                        }`}
                      />
                    </button>
                  ))}
                  {userGivenRating && (
                    <span className="text-[10px] font-bold text-amber-400 ml-1">
                      {userGivenRating}★
                    </span>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={handleScrollToPlayer}
                  className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400 text-white font-black text-xs shadow-neon transition-all active:scale-95 cursor-pointer"
                >
                  <Play className="w-4 h-4 fill-white" />
                  <span>Tomosha qilish</span>
                </button>

                {((anime.telegram_url && anime.telegram_url.trim()) || (anime.studio && anime.studio.startsWith("http"))) && (
                  <a
                    href={(anime.telegram_url && anime.telegram_url.trim()) || anime.studio}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-sky-500 hover:bg-sky-400 text-white font-bold text-xs shadow-[0_0_20px_rgba(14,165,233,0.4)] transition-all active:scale-95"
                  >
                    <Send className="w-4 h-4" />
                    <span>Telegramda ochish</span>
                  </a>
                )}

                <button
                  type="button"
                  onClick={toggleFavorite}
                  className={`flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl text-xs font-bold transition-all active:scale-95 border ${
                    isFavorite
                      ? "bg-rose-500 text-white border-rose-400 shadow-[0_0_20px_rgba(244,63,94,0.5)]"
                      : "bg-white/10 hover:bg-white/15 text-white border-white/10"
                  }`}
                >
                  <Heart className={`w-4 h-4 ${isFavorite ? "fill-white" : ""}`} />
                  <span>{isFavorite ? "Sevimlilardan olish" : "Sevimlilarga qo'shish"}</span>
                </button>

                <button
                  type="button"
                  onClick={handleShare}
                  className="p-3 rounded-2xl bg-white/10 hover:bg-white/15 text-slate-300 hover:text-white border border-white/10 transition-all active:scale-95"
                  title="Ulashish"
                >
                  {shared ? <Check className="w-4 h-4 text-emerald-400" /> : <Share2 className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </section>

          {/* Desktop Video Player & Episodes Section */}
          <div id="player-section" className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8 scroll-mt-28">
            <div className={`lg:col-span-2 space-y-3 ${isCinemaMode ? "relative z-50" : ""}`}>
              <div className="flex items-center justify-between px-1">
                <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <Play className="w-3.5 h-3.5 text-rose-500 fill-rose-500" />
                  {currentEpisode?.title || `${currentEpisode?.episode_number || 1}-qism`}
                </span>
                <button
                  type="button"
                  onClick={() => setIsCinemaMode(!isCinemaMode)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    isCinemaMode
                      ? "bg-amber-400 text-black shadow-[0_0_20px_rgba(251,191,36,0.6)]"
                      : "bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white border border-white/10"
                  }`}
                  title="Teatr / Cinema rejimini yoqish/o'chirish (ESC)"
                >
                  {isCinemaMode ? (
                    <>
                      <Lightbulb className="w-3.5 h-3.5" />
                      <span>Chiroqni yoqish</span>
                    </>
                  ) : (
                    <>
                      <Moon className="w-3.5 h-3.5 text-amber-400" />
                      <span>Teatr rejimi</span>
                    </>
                  )}
                </button>
              </div>

              {renderPlayerBox(false)}

              {/* Desktop Multi-Fandub Audio & Studio Selector */}
              {renderFandubSelector()}

              {filteredEpisodes.length > 0 && (
                <EpisodeSelector
                  episodes={filteredEpisodes}
                  activeEpisodeId={currentEpisode?.id || 0}
                  onSelectEpisode={(ep) => setCurrentEpisode(ep)}
                  isVIPUser={!!user?.is_vip || !!user?.is_admin}
                />
              )}

              <div className="flex items-center justify-between p-3.5 rounded-2xl bg-[#0c101c]/80 border border-white/10 text-xs">
                <div className="flex items-center gap-2 truncate">
                  <span className="font-bold text-white truncate">
                    {currentEpisode ? `${currentEpisode.title}` : anime.title_uz}
                  </span>
                  <span className="text-slate-500">•</span>
                  <span className="text-cyan-400 font-bold">Bepul Dublyaj</span>
                  <span className="text-slate-500">•</span>
                  <span className="text-emerald-400 flex items-center gap-1 font-mono text-[10px]">
                    <ShieldCheck className="w-3 h-3" /> Tezkor CDN
                  </span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={toggleFavorite}
                    className={`p-2 rounded-xl border transition-all ${
                      isFavorite
                        ? "bg-rose-500/20 border-rose-500/60 text-rose-400"
                        : "bg-white/5 border-white/10 text-slate-300 hover:text-white"
                    }`}
                    title="Sevimlilar"
                  >
                    <Heart className={`w-4 h-4 ${isFavorite ? "fill-rose-400" : ""}`} />
                  </button>
                  <button
                    type="button"
                    onClick={handleShare}
                    className="p-2 rounded-xl bg-white/5 border border-white/10 text-slate-300 hover:text-white transition-all"
                    title="Ulashish"
                  >
                    {shared ? <Check className="w-4 h-4 text-emerald-400" /> : <Share2 className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>

            <div className="hidden lg:block space-y-4">
              <div className="p-5 rounded-3xl bg-[#0e1222] border border-white/10 space-y-4 shadow-xl">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Play className="w-4 h-4 text-rose-500 fill-rose-500" /> Qismlar Ro&apos;yxati
                  </h3>
                  <span className="text-xs text-slate-400 font-semibold">{episodes.length} ta qism</span>
                </div>

                {episodes.length === 0 ? (
                  <p className="text-xs text-slate-500 py-6 text-center">Tez kunda yangi qismlar yuklanadi!</p>
                ) : (
                  <div className="space-y-2 max-h-[480px] overflow-y-auto pr-1">
                    {filteredEpisodes.map((ep) => {
                      const isSelected = currentEpisode?.id === ep.id;
                      return (
                        <button
                          key={ep.id}
                          onClick={() => setCurrentEpisode(ep)}
                          className={`w-full flex items-center justify-between p-3 rounded-2xl border transition-all text-left group ${
                            isSelected
                              ? "bg-rose-500/20 border-rose-500 text-white shadow-neon"
                              : "bg-[#070914] border-white/5 hover:border-white/20 text-slate-300 hover:text-white"
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div
                              className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
                                isSelected ? "bg-rose-600 text-white" : "bg-white/5 text-slate-400 group-hover:text-white"
                              }`}
                            >
                              {ep.episode_number}
                            </div>
                            <div className="truncate">
                              <h4 className="text-xs font-bold truncate group-hover:text-rose-400 transition-colors">
                                {ep.title || `${ep.episode_number}-qism`}
                              </h4>
                              <span className="text-[10px] text-slate-500 block">
                                {isSelected ? "Ijro etilmoqda" : "Tomosha qilish"}
                              </span>
                            </div>
                          </div>
                          {isSelected && <div className="w-2 h-2 rounded-full bg-rose-500 shadow-neon" />}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="p-5 rounded-3xl bg-gradient-to-br from-[#0e1222] to-[#161328] border border-rose-500/20 space-y-3">
                <div className="flex items-center gap-2 text-rose-300 font-bold text-xs">
                  <Sparkles className="w-4 h-4 text-rose-400" /> Hikaku Anime Jamiyati
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  Yangi qismlar relizlari, o&apos;zbekcha ovozlar va anime muxlislari fikrlarini rasmiy kanalimizda kuzatib boring!
                </p>
                <a
                  href="https://t.me/hikakuz"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block w-full text-center py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white font-bold text-xs shadow-neon transition-all"
                >
                  Telegram Kanalimizga A&apos;zo Bo&apos;lish →
                </a>
              </div>
            </div>
          </div>

          <RelatedCarousel animes={relatedAnimes} />
          {renderCommentsSection()}
        </div>
      </main>

      {/* ======================================================== */}
      {/* 3. MOBILE EPISODES BOTTOM SHEET MODAL                    */}
      {/* ======================================================== */}
      {isEpisodesModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-md animate-fade-in">
          <div
            className="fixed inset-0"
            onClick={() => setIsEpisodesModalOpen(false)}
          />
          <div className="relative w-full sm:max-w-lg bg-[#0c101c] border-t sm:border border-white/15 rounded-t-3xl sm:rounded-3xl p-5 z-10 max-h-[82vh] flex flex-col space-y-3.5 shadow-2xl animate-slide-up">
            <div className="w-12 h-1 rounded-full bg-white/20 mx-auto -mt-1" />
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-black text-white flex items-center gap-2">
                  <Play className="w-4 h-4 text-rose-500 fill-rose-500" />
                  <span>Epizodlar Ro&apos;yxati</span>
                </h3>
                <p className="text-[11px] text-slate-400">Jami {episodes.length} ta qism mavjud</p>
              </div>
              <button
                onClick={() => setIsEpisodesModalOpen(false)}
                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Qism qidirish..."
                value={episodeFilterText}
                onChange={(e) => setEpisodeFilterText(e.target.value)}
                className="w-full bg-[#111726] border border-white/10 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500/50"
              />
            </div>

            <div className="grid grid-cols-4 sm:grid-cols-5 gap-2 overflow-y-auto max-h-[50vh] pr-1">
              {filteredModalEpisodes.map((ep) => {
                const isActive = currentEpisode?.id === ep.id;
                return (
                  <button
                    key={ep.id}
                    onClick={() => {
                      setCurrentEpisode(ep);
                      setIsEpisodesModalOpen(false);
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                    className={`p-3 rounded-2xl border font-black text-xs flex flex-col items-center justify-center transition-all active:scale-95 ${
                      isActive
                        ? "bg-gradient-to-r from-rose-600 to-amber-500 text-white border-rose-400 shadow-neon scale-105"
                        : "bg-white/5 text-slate-300 border-white/10 hover:bg-white/10"
                    }`}
                  >
                    <span className="text-[9px] text-slate-400">EP</span>
                    <span>{ep.episode_number}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <BottomNav />
    </>
  );
}
