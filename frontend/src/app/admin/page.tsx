"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  BarChart3,
  Film,
  Upload,
  Users,
  Settings,
  Mic,
  History,
  Radio,
  FileText,
  Plus,
  Trash2,
  Edit,
  Flame,
  Crown,
  Sparkles,
  Search,
  CheckCircle2,
  XCircle,
  X,
  Video,
  ShieldCheck,
  LogOut,
  ExternalLink,
  RefreshCw,
  Clock,
  Home,
  Save,
  CreditCard,
  Zap,
  Cpu,
  Sliders,
  Loader2,
  AlertCircle,
  AlertTriangle,
  Play,
  Link2,
  Layers,
  Check,
  Tv,
  Eye,
  Copy,
  Filter,
  Volume2,
  Pencil,
  UploadCloud,
  HardDrive,
  Send,
  ImageIcon,
  Menu,
  ChevronDown,
} from "lucide-react";
import { useAuth } from "@/context/auth-context";
import { Anime, Episode, Fandub, FandubUser, AuditLog } from "@/types/anime";

interface StagedVideo {
  file_id: string;
  file_name: string;
  content_length: number;
  upload_timestamp: number;
  formatted_size: string;
}

interface AdminUser {
  id: number;
  telegram_id: number;
  full_name: string;
  role: "FOUNDER" | "SUPERADMIN" | "ADMIN" | "MODERATOR";
  created_at: string;
}

interface DashboardStats {
  total_animes: number;
  total_episodes: number;
  total_users: number;
  total_vip_users: number;
  pending_checks: number;
}

interface PlatformSettings {
  card_number: string;
  card_holder: string;
  vip_price: number;
  support_bot: string;
  announcement_text: string;
  announcement_active: boolean;
}

interface RequiredChannel {
  id: number;
  platform: string;
  channel_id: string;
  channel_name: string;
  invite_link: string;
  is_active: boolean;
}

export default function AdminPage() {
  const { user, logout } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [sessionUser, setSessionUser] = useState<any>(null);
  const [isVerifyingAdmin, setIsVerifyingAdmin] = useState(true);
  const [serverIsAdmin, setServerIsAdmin] = useState(false);
  const [serverRole, setServerRole] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
    let parsed: any = null;
    try {
      const saved = localStorage.getItem("anivorm_user_session");
      if (saved) {
        parsed = JSON.parse(saved);
        setSessionUser(parsed);
      }
    } catch (e) {
      console.error(e);
    }

    const checkTgId = Number(user?.telegram_id || user?.id || parsed?.telegram_id || parsed?.id || 0);
    if (checkTgId > 0) {
      fetch(`/api/v1/auth/role?telegram_id=${checkTgId}`)
        .then((res) => res.json())
        .then((data) => {
          if (data && data.success && data.is_admin) {
            setServerIsAdmin(true);
            if (data.role) setServerRole(data.role);
            try {
              const currentSaved = localStorage.getItem("anivorm_user_session");
              const currentObj = currentSaved ? JSON.parse(currentSaved) : (parsed || {});
              currentObj.is_admin = true;
              currentObj.admin_role = data.role || currentObj.admin_role || "ADMIN";
              localStorage.setItem("anivorm_user_session", JSON.stringify(currentObj));
              setSessionUser(currentObj);
            } catch (err) {
              console.error(err);
            }
          }
        })
        .catch((err) => {
          console.error("Role check error:", err);
        })
        .finally(() => {
          setIsVerifyingAdmin(false);
        });
    } else {
      setIsVerifyingAdmin(false);
    }
  }, [user]);

  const activeUser = user || sessionUser;
  const userTgId = Number(activeUser?.telegram_id || activeUser?.id || 0);
  const founderIds = [5415350162, 4351671];
  const isFounder = Boolean(
    activeUser && (
      founderIds.includes(userTgId) ||
      activeUser.admin_role === "FOUNDER" ||
      activeUser.role === "FOUNDER" ||
      serverRole === "FOUNDER"
    )
  );
  const superAdminIds = [5415350162, 6149114216, 4351671, 8109940587];
  const isSuperAdmin = Boolean(
    isFounder || (
      activeUser && (
        superAdminIds.includes(userTgId) ||
        activeUser.admin_role === "SUPERADMIN" ||
        activeUser.role === "SUPERADMIN" ||
        serverRole === "SUPERADMIN"
      )
    )
  );
  const isAuthorizedAdmin = Boolean(activeUser && (activeUser.is_admin || isSuperAdmin || serverIsAdmin));

  // Authenticated Admin Fetch helper (Stealth Guard)
  const adminFetch = (url: string, options: RequestInit = {}) => {
    const headers = new Headers(options.headers || {});
    if (options.body && typeof options.body === "string" && !headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }
    const tgId = Number(activeUser?.telegram_id || activeUser?.id || 0);
    let token = activeUser?.token;
    if (!token || token.startsWith("google_") || (!token.startsWith("tg_token_") && !token.startsWith("auth_tg_"))) {
      if (tgId) {
        token = `tg_token_${tgId}_${Date.now()}`;
      }
    }
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }
    if (tgId) {
      headers.set("X-Telegram-Id", String(tgId));
    }
    return fetch(url, {
      ...options,
      headers,
    });
  };

  const [activeTab, setActiveTab] = useState<"stats" | "animes" | "episodes" | "fandubs" | "users" | "admins" | "audit" | "settings">("stats");
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [isNewAnimeOpen, setIsNewAnimeOpen] = useState(false);
  
  // Data states
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [animes, setAnimes] = useState<Anime[]>([]);
  // Fandub and Audit States
  const [fandubs, setFandubs] = useState<Fandub[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [isFandubModalOpen, setIsFandubModalOpen] = useState(false);
  const [isFandubUserModalOpen, setIsFandubUserModalOpen] = useState(false);
  const [isFandubSettingsModalOpen, setIsFandubSettingsModalOpen] = useState(false);
  const [selectedFandubForSettings, setSelectedFandubForSettings] = useState<Fandub | null>(null);
  const [fandubSettingsForm, setFandubSettingsForm] = useState({
    contact_url: "",
    vip_price: 10000,
    telegram_admin: "",
    telegram_channel: "",
    card_number: "",
    card_holder: "",
  });
  const [isSavingFandubSettings, setIsSavingFandubSettings] = useState(false);
  const [selectedFandubForUsers, setSelectedFandubForUsers] = useState<Fandub | null>(null);
  const [fandubUsers, setFandubUsers] = useState<FandubUser[]>([]);
  const [newFandubName, setNewFandubName] = useState("");
  const [newFandubDesc, setNewFandubDesc] = useState("");
  const [newFandubUserTgId, setNewFandubUserTgId] = useState("");
  const [newFandubUserUsername, setNewFandubUserUsername] = useState("");
  const [fandubUserSearchQuery, setFandubUserSearchQuery] = useState("");
  const [isAssigningFandubAdmin, setIsAssigningFandubAdmin] = useState(false);
  const [newFandubUserRole, setNewFandubUserRole] = useState("ADMIN");
  const [uploadFandubId, setUploadFandubId] = useState<number>(1);

  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [usersList, setUsersList] = useState<any[]>([]);
  const [settings, setSettings] = useState<PlatformSettings>({
    card_number: "8600 0000 0000 0000",
    card_holder: "Admin",
    vip_price: 10000,
    support_bot: "hikakuzbot",
    announcement_text: "Hikaku Anime platformasiga xush kelibsiz!",
    announcement_active: true,
  });
  const [channels, setChannels] = useState<RequiredChannel[]>([]);
  // Admins state & SuperAdmin auth
  const [adminsList, setAdminsList] = useState<AdminUser[]>([]);
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [adminForm, setAdminForm] = useState({
    telegram_id: "",
    full_name: "",
    role: "ADMIN" as "FOUNDER" | "SUPERADMIN" | "ADMIN" | "MODERATOR",
  });
  const [adminActionLoading, setAdminActionLoading] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);

  // Anime Search & Modal
  const [animeSearchQuery, setAnimeSearchQuery] = useState("");
  const [animeFilterTab, setAnimeFilterTab] = useState<"all" | "active" | "archive">("all");
  const [animeDisplayLimit, setAnimeDisplayLimit] = useState<number>(36);
  const [animeComboboxQuery, setAnimeComboboxQuery] = useState("");
  const [isAnimeComboboxOpen, setIsAnimeComboboxOpen] = useState(false);
  const [isAnimeModalOpen, setIsAnimeModalOpen] = useState(false);
  const [editingAnime, setEditingAnime] = useState<Anime | null>(null);
  const [animeFormData, setAnimeFormData] = useState({
    mal_id: 0,
    title_uz: "",
    title_en: "",
    title_jp: "",
    synopsis: "",
    poster_url: "",
    banner_url: "",
    score: 8.5,
    episodes_count: 12,
    status: "ONGOING",
    season: "Kuz",
    year: 2026,
    telegram_url: "",
    genres: ["Shounen", "Jangari"],
  });

  // Jikan / Multi-API external search
  const [jikanQuery, setJikanQuery] = useState("");
  const [jikanResults, setJikanResults] = useState<any[]>([]);
  const [isJikanSearching, setIsJikanSearching] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const [candidatePosters, setCandidatePosters] = useState<string[]>([]);
  const [isUploadingPoster, setIsUploadingPoster] = useState(false);
  const [isUploadingBanner, setIsUploadingBanner] = useState(false);
  const [showPosterUrlInput, setShowPosterUrlInput] = useState(false);
  const [showBannerUrlInput, setShowBannerUrlInput] = useState(false);
  const posterFileInputRef = useRef<HTMLInputElement | null>(null);
  const bannerFileInputRef = useRef<HTMLInputElement | null>(null);

  // Episode Upload Form
  const [uploadMode, setUploadMode] = useState<"url" | "direct" | "compress">("direct");
  const [selectedAnimeId, setSelectedAnimeId] = useState<number>(0);
  const [epNumber, setEpNumber] = useState<number>(1);
  const [epTitle, setEpTitle] = useState<string>("");
  const [epDirectUrl, setEpDirectUrl] = useState<string>("");
  const [epIsVIP, setEpIsVIP] = useState<boolean>(false);
  const [epDubStudio, setEpDubStudio] = useState<string>("Hikaku Dub");
  const [epFandubId, setEpFandubId] = useState<number>(1);
  const [postToTelegram, setPostToTelegram] = useState<boolean>(true);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [videoFileInfo, setVideoFileInfo] = useState<{ name: string; size: string } | null>(null);
  const [uploadedB2Key, setUploadedB2Key] = useState<string>("");
  const [uploadedThumbUrl, setUploadedThumbUrl] = useState<string>("");
  const [isSavingPending, setIsSavingPending] = useState(false);
  const [isDraggingVideo, setIsDraggingVideo] = useState(false);
  const [uploadCrf, setUploadCrf] = useState<number>(26);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadJob, setUploadJob] = useState<{ id: string; status: string; progress: number; message: string; video_key?: string; thumbnail_url?: string } | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const isSavingPendingRef = useRef(isSavingPending);
  isSavingPendingRef.current = isSavingPending;
  const selectedAnimeIdRef = useRef(selectedAnimeId);
  selectedAnimeIdRef.current = selectedAnimeId;
  const epNumberRef = useRef(epNumber);
  epNumberRef.current = epNumber;
  const epTitleRef = useRef(epTitle);
  epTitleRef.current = epTitle;
  const epIsVIPRef = useRef(epIsVIP);
  epIsVIPRef.current = epIsVIP;
  const epDubStudioRef = useRef(epDubStudio);
  epDubStudioRef.current = epDubStudio;
  const epFandubIdRef = useRef(epFandubId);
  epFandubIdRef.current = epFandubId;
  const postToTelegramRef = useRef(postToTelegram);
  postToTelegramRef.current = postToTelegram;
  const currentXhrRef = useRef<XMLHttpRequest | null>(null);

  // Episode Editing & Filtering State
  const [editingEpisode, setEditingEpisode] = useState<Episode | null>(null);
  const [isEditEpisodeModalOpen, setIsEditEpisodeModalOpen] = useState(false);
  const [episodeFilterAnime, setEpisodeFilterAnime] = useState<number | "all">("all");
  const [episodeFilterFandub, setEpisodeFilterFandub] = useState<number | "all">("all");
  const [episodeSearchQuery, setEpisodeSearchQuery] = useState("");
  const [copiedEpId, setCopiedEpId] = useState<number | null>(null);
  const [editEpFormData, setEditEpFormData] = useState({
    id: 0,
    anime_id: 0,
    episode_number: 1,
    title: "",
    video_url: "",
    thumbnail_url: "",
    is_vip_only: false,
    has_uzbek_dub: true,
    has_subtitles: true,
    dub_studio: "",
    duration: 1440,
    fandub_id: 1,
  });

  // Staged / Unlinked B2 Videos State
  const [stagedVideos, setStagedVideos] = useState<StagedVideo[]>([]);
  const [isLoadingStagedVideos, setIsLoadingStagedVideos] = useState(false);
  const [isAddingAnimeFromStudio, setIsAddingAnimeFromStudio] = useState(false);

  // Channel Form
  const [newChannel, setNewChannel] = useState({
    platform: "telegram",
    channel_id: "-100",
    channel_name: "",
    invite_link: "https://t.me/",
  });

  const showToast = (message: string, type: "success" | "error" | "info" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Load all admin data
  const fetchData = async () => {
    setIsLoading(true);
    try {
      // 1. Stats
      adminFetch("/api/v1/admin/stats")
        .then((r) => r.json())
        .then((data) => {
          if (data.success && data.stats) setStats(data.stats);
        })
        .catch((e) => console.error("Stats fetch error:", e));

      // 2. Animes (Admin API - All 356+ including archive)
      adminFetch("/api/v1/admin/animes")
        .then((r) => r.json())
        .then((data) => {
          if (data.success && Array.isArray(data.data)) setAnimes(data.data);
        })
        .catch((e) => console.error("Anime fetch error:", e));

      // 3. Episodes
      adminFetch("/api/v1/admin/episodes")
        .then((r) => r.json())
        .then((data) => {
          if (data.success && Array.isArray(data.data)) setEpisodes(data.data);
        })
        .catch((e) => console.error("Episodes fetch error:", e));

      // 4. Users
      adminFetch("/api/v1/admin/users")
        .then((r) => r.json())
        .then((data) => {
          if (data.success && Array.isArray(data.data)) setUsersList(data.data);
        })
        .catch((e) => console.error("Users fetch error:", e));

      // 5. Settings
      adminFetch("/api/v1/admin/settings")
        .then((r) => r.json())
        .then((data) => {
          if (data.success && data.settings) setSettings(data.settings);
        })
        .catch((e) => console.error("Settings fetch error:", e));

      // 6. Admins
      fetchAdmins();

      // 7. Channels
      adminFetch("/api/v1/admin/channels")
        .then((r) => r.json())
        .then((data) => {
          if (data.success && Array.isArray(data.data)) setChannels(data.data);
        })
        .catch((e) => console.error("Channels fetch error:", e));

      // 8. Staged Videos
      fetchStagedVideos();

      // 9. Fandubs
      adminFetch("/api/v1/admin/fandubs")
        .then((r) => r.json())
        .then((data) => {
          if (data.success && Array.isArray(data.data)) setFandubs(data.data);
        })
        .catch((e) => console.error("Fandubs fetch error:", e));

      // 10. Audit Logs
      adminFetch("/api/v1/admin/audit-logs")
        .then((r) => r.json())
        .then((data) => {
          if (data.success && Array.isArray(data.data)) setAuditLogs(data.data);
        })
        .catch((e) => console.error("Audit fetch error:", e));
    } catch (e) {
      console.error("Admin fetch global error:", e);
    } finally {
      setTimeout(() => setIsLoading(false), 300);
    }
  };

  useEffect(() => {
    if (mounted && (activeUser?.id || activeUser?.telegram_id || isAuthorizedAdmin)) {
      fetchData();
    }
  }, [mounted, user, sessionUser, isAuthorizedAdmin]);

  useEffect(() => {
    // Auto-restore upload draft if exists
    try {
      const draft = localStorage.getItem("hikaku_upload_draft");
      if (draft) {
        const data = JSON.parse(draft);
        if (data.uploadedB2Key) {
          setUploadedB2Key(data.uploadedB2Key);
          if (data.videoFileInfo) setVideoFileInfo(data.videoFileInfo);
          if (data.epNumber) setEpNumber(data.epNumber);
          if (data.epTitle) setEpTitle(data.epTitle);
          if (data.epDubStudio) setEpDubStudio(data.epDubStudio);
          if (typeof data.epIsVIP === "boolean") setEpIsVIP(data.epIsVIP);
          if (typeof data.postToTelegram === "boolean") setPostToTelegram(data.postToTelegram);
          if (data.selectedAnimeId) setSelectedAnimeId(data.selectedAnimeId);
          setUploadJob({
            id: "draft_recovered",
            status: "completed",
            progress: 100,
            message: `🎉 Saqlangan video qoralamasi tiklandi (${data.videoFileInfo?.name || data.uploadedB2Key})!`,
            video_key: data.uploadedB2Key,
          });
        }
      }
    } catch (e) {}
  }, []);

  // Poll Job Status (Only for server-side FFmpeg compression jobs)
  useEffect(() => {
    if (!uploadJob || uploadJob.id === "starting" || uploadJob.id === "direct-b2" || uploadJob.id.startsWith("direct-b2") || uploadJob.id.startsWith("hls_") || uploadJob.status === "completed" || uploadJob.status === "failed") return;

    const interval = setInterval(async () => {
      try {
        const res = await adminFetch(`/api/v1/admin/upload-status?job_id=${uploadJob.id}`);
        const data = await res.json();
        if (data.success && data.job) {
          const updatedJob = {
            id: data.job.id,
            status: data.job.status,
            progress: data.job.progress,
            message: data.job.message,
            video_key: data.job.video_key || data.job.episode?.b2_key,
            thumbnail_url: data.job.thumbnail_url || data.job.episode?.thumbnail_url,
          };
          setUploadJob(updatedJob);

          if (data.job.status === "completed") {
            setIsUploading(false);
            const b2Key = updatedJob.video_key || "";
            const thumbUrl = updatedJob.thumbnail_url || "";
            setUploadedB2Key(b2Key);
            setUploadedThumbUrl(thumbUrl);

            if (isSavingPendingRef.current) {
              if (selectedAnimeIdRef.current > 0) {
                await executeFinalSave(b2Key, thumbUrl);
              } else {
                setIsSavingPending(false);
                showToast("✅ Video B2 ga yuklandi! Animeni tanlab 'Epizodni Saqlash' tugmasini bosing.");
              }
            } else {
              showToast("✅ Video B2 ga yuklandi! Animeni tanlab 'Epizodni Saqlash' tugmasini bosing.");
            }
          } else if (data.job.status === "failed") {
            setIsUploading(false);
            setIsSavingPending(false);
            showToast(data.job.error || "Yuklashda xatolik yuz berdi", "error");
          }
        }
      } catch (e) {
        console.error("Poll error:", e);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [uploadJob?.id, uploadJob?.status]);

  // Jikan Search
  const handleJikanSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!jikanQuery.trim()) return;
    setIsJikanSearching(true);
    try {
      const res = await fetch(`/api/v1/anime/search-external?q=${encodeURIComponent(jikanQuery.trim())}`);
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setJikanResults(data.data);
      } else {
        setJikanResults([]);
        showToast("Anime topilmadi", "error");
      }
    } catch (e) {
      console.error(e);
      showToast("Qidiruvda xatolik", "error");
    } finally {
      setIsJikanSearching(false);
    }
  };

  // Import Anime from Jikan/External
  const handleImportJikan = async (item: any) => {
    let finalItem = { ...item };
    if (item.mal_id && (!item.synopsis || !item.genres || item.genres.length === 0 || item.genres[0] === "Anime")) {
      try {
        const res = await fetch(`/api/v1/anime/detail-external?id=${item.mal_id}`);
        const data = await res.json();
        if (data.success && data.data) {
          finalItem = { ...finalItem, ...data.data };
        }
      } catch (err) {
        console.error("Failed to fetch rich detail:", err);
      }
    }

    let initialSynopsis = finalItem.synopsis || "";
    // Auto translate synopsis to Uzbek
    if (initialSynopsis.trim()) {
      try {
        const transRes = await fetch(`/api/v1/translate?text=${encodeURIComponent(initialSynopsis.trim())}`);
        const transData = await transRes.json();
        if (transData.success && transData.translated_text) {
          initialSynopsis = transData.translated_text;
        }
      } catch (err) {
        console.warn("Auto-translate error:", err);
      }
    }

    const rawScore = Number(finalItem.score) || 8.0;
    const roundedScore = Math.round(rawScore * 10) / 10;

    const candidates: string[] = [];
    const addCandidate = (url?: string) => {
      if (url && typeof url === "string" && url.startsWith("http") && !candidates.includes(url)) {
        candidates.push(url);
      }
    };
    addCandidate(finalItem.poster_url);
    addCandidate(finalItem.images?.webp?.large_image_url);
    addCandidate(finalItem.images?.jpg?.large_image_url);
    addCandidate(finalItem.images?.webp?.image_url);
    addCandidate(finalItem.images?.jpg?.image_url);
    addCandidate(finalItem.banner_url);
    addCandidate(finalItem.cover_image);
    setCandidatePosters(candidates);

    setAnimeFormData({
      mal_id: finalItem.mal_id || 0,
      title_uz: finalItem.title_uz || finalItem.title || "",
      title_en: finalItem.title_en || finalItem.title_english || finalItem.title || "",
      title_jp: finalItem.title_jp || finalItem.title_japanese || "",
      synopsis: initialSynopsis,
      poster_url: finalItem.poster_url || finalItem.images?.webp?.large_image_url || finalItem.images?.jpg?.large_image_url || "",
      banner_url: finalItem.banner_url || finalItem.poster_url || "",
      score: roundedScore,
      episodes_count: finalItem.episodes_count || finalItem.episodes || 12,
      status: (finalItem.status === "Currently Airing" || finalItem.status === "Ongoing") ? "ONGOING" : "TUGALLANGAN",
      season: finalItem.season || "Kuz",
      year: finalItem.year || 2026,
      telegram_url: finalItem.telegram_url || finalItem.studio || "",
      genres: (finalItem.genres && finalItem.genres.length > 0 && finalItem.genres[0] !== "Anime") ? finalItem.genres : (finalItem.genres || ["Action"]),
    });
    setEditingAnime(null);
    setIsAnimeModalOpen(true);
  };

  // Image Upload Helper for Poster/Banner to B2
  const uploadImageFile = async (file: File, type: "posters" | "banners"): Promise<string | null> => {
    if (!file.type.startsWith("image/")) {
      showToast("Faqat rasm fayli tanlang (JPG, PNG, WebP)", "error");
      return null;
    }
    if (file.size > 15 * 1024 * 1024) {
      showToast("Rasm hajmi 15MB dan oshmasligi kerak", "error");
      return null;
    }

    if (type === "posters") setIsUploadingPoster(true);
    else setIsUploadingBanner(true);

    const formData = new FormData();
    formData.append("image", file);
    formData.append("type", type);

    try {
      const res = await adminFetch("/api/v1/admin/upload-image", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (data.success && data.url) {
        showToast("🎉 Rasm B2 bulutiga yuklandi!");
        return data.url;
      } else {
        showToast(data.error || "Rasm yuklashda xatolik", "error");
        return null;
      }
    } catch (err) {
      console.error(err);
      showToast("Rasm yuklashda server xatosi", "error");
      return null;
    } finally {
      if (type === "posters") setIsUploadingPoster(false);
      else setIsUploadingBanner(false);
    }
  };

  // Manual Translate Synopsis to Uzbek
  const handleTranslateSynopsis = async () => {
    if (!animeFormData.synopsis.trim()) {
      showToast("Tavsif maydoni bo'sh", "error");
      return;
    }
    setIsTranslating(true);
    try {
      const res = await fetch("/api/v1/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: animeFormData.synopsis.trim() }),
      });
      const data = await res.json();
      if (data.success && data.translated_text) {
        setAnimeFormData((prev) => ({ ...prev, synopsis: data.translated_text }));
        showToast("✨ Tavsif o'zbek tiliga o'girildi!");
      } else {
        showToast(data.error || "Tarjima qilib bo'lmadi", "error");
      }
    } catch (e) {
      console.error(e);
      showToast("Tarjima qilishda xatolik yuz berdi", "error");
    } finally {
      setIsTranslating(false);
    }
  };

  // Save Anime
  const handleSaveAnime = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!animeFormData.poster_url?.trim()) {
      showToast("Iltimos, anime posterini yuklang yoki havolasini kiriting", "error");
      return;
    }
    try {
      const payload = {
        ...animeFormData,
        id: editingAnime ? editingAnime.id : 0,
      };
      const res = await adminFetch("/api/v1/admin/anime", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        showToast(editingAnime ? "Anime yangilandi!" : "Yangi anime qo'shildi!");
        setIsAnimeModalOpen(false);
        setEditingAnime(null);
        await fetchData();
        if (isAddingAnimeFromStudio && data.anime?.id) {
          setSelectedAnimeId(data.anime.id);
          setIsAddingAnimeFromStudio(false);
          showToast(`✅ "${data.anime.title_uz || "Anime"}" avtomatik tanlandi! Endi "Epizodni Saqlash"ni bosing.`);
        }
      } else {
        showToast(data.error || "Xatolik yuz berdi", "error");
      }
    } catch (e) {
      console.error(e);
      showToast("Server bilan bog'lanishda xatolik", "error");
    }
  };

  // Delete Anime
  const handleDeleteAnime = async (anime: Anime) => {
    if (!isSuperAdmin) {
      showToast("⚠️ Animeni o'chirish huquqingiz yo'q! Faqat SuperAdmin yoki Asoschi o'chira oladi.", "error");
      return;
    }
    const epCount = Number(anime.current_episode || anime.episodes_count || 0);
    if (epCount > 0) {
      showToast(`⚠️ Qat'iy taqiq: Ushbu animeda ${epCount} ta qism mavjud! Animeni o'chirishdan oldin uning barcha qismlarini o'chirib chiqishingiz shart.`, "error");
      return;
    }
    if (!confirm(`Haqiqatdan ham "${anime.title_uz}" animeni o'chirishni tasdiqlaysizmi?`)) return;
    try {
      const res = await adminFetch(`/api/v1/admin/anime?id=${anime.id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        showToast("Anime muvaffaqiyatli o'chirildi!", "success");
        fetchData();
      } else {
        showToast(data.error || "Animeni o'chirishda xatolik yuz berdi", "error");
      }
    } catch (e) {
      console.error(e);
      showToast("Server bilan aloqa xatosi", "error");
    }
  };

  // Toggle Trending
  const handleToggleTrending = async (id: number) => {
    try {
      const res = await adminFetch("/api/v1/admin/anime/toggle-trending", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const data = await res.json();
      if (data.success) {
        showToast("Trend statusi o'zgartirildi!");
        fetchData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Open Edit Episode Modal
  const handleOpenEditEpisode = (ep: Episode) => {
    const fId = ep.fandub_id || 1;
    const fName = ep.fandub_name || fandubs.find((f) => f.id === fId)?.name || "";
    setEditingEpisode(ep);
    setEditEpFormData({
      id: ep.id,
      anime_id: ep.anime_id,
      episode_number: ep.episode_number,
      title: ep.title,
      video_url: ep.video_url || ep.b2_key || "",
      thumbnail_url: ep.thumbnail_url || "",
      is_vip_only: !!ep.is_vip_only,
      has_uzbek_dub: ep.has_uzbek_dub !== false,
      has_subtitles: ep.has_subtitles !== false,
      dub_studio: ep.dub_studio || fName,
      duration: ep.duration || 1440,
      fandub_id: fId,
    });
    setIsEditEpisodeModalOpen(true);
  };

  // Save Edited Episode
  const handleSaveEditEpisode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editEpFormData.id || !editEpFormData.anime_id) {
      showToast("Anime va qism ma'lumotlari to'liq emas", "error");
      return;
    }

    try {
      const res = await adminFetch("/api/v1/admin/episode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editEpFormData),
      });
      const data = await res.json();
      if (data.success) {
        showToast("✅ Qism muvaffaqiyatli yangilandi va saqlandi!");
        setIsEditEpisodeModalOpen(false);
        setEditingEpisode(null);
        fetchData();
      } else {
        showToast(data.error || "Tahrirlashda xatolik", "error");
      }
    } catch (e) {
      console.error(e);
      showToast("Serverda xatolik yuz berdi", "error");
    }
  };

  const handleCopyLink = (text: string, id: number) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedEpId(id);
    showToast("Havola nusxalandi!");
    setTimeout(() => setCopiedEpId(null), 2000);
  };

  // Delete Episode
  const handleDeleteEpisode = async (id: number) => {
    if (!isSuperAdmin) {
      showToast("⚠️ Qismlarni o'chirish huquqingiz yo'q! Bu faqat SuperAdmin yoki Asoschi vakolatida.", "error");
      return;
    }
    if (!confirm("Ushbu qismni o'chirmoqchimisiz?")) return;
    try {
      const res = await adminFetch(`/api/v1/admin/episode?id=${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        showToast("Qism muvaffaqiyatli o'chirildi!", "success");
        fetchData();
      } else {
        showToast(data.error || "Qismni o'chirishda xatolik yuz berdi", "error");
      }
    } catch (e) {
      console.error(e);
      showToast("Server bilan aloqa xatosi", "error");
    }
  };

  // Helper: auto-detect episode number from filename
  const parseEpisodeFromFilename = (filename: string): number | null => {
    // 1. Common anime patterns: ep_05, ep5, episode 12, qism 3, e04, s01e05
    const epPatternMatch = filename.match(/(?:ep|episode|qism|e|s\d+e)\s*[-_.]?\s*0*(\d+)/i);
    if (epPatternMatch && epPatternMatch[1]) {
      const num = parseInt(epPatternMatch[1], 10);
      if (!isNaN(num) && num > 0) return num;
    }
    // 2. Dash separated: Title - 05.mp4
    const dashMatch = filename.match(/-\s*0*(\d+)\s*(?:\[|\(|\.|$)/);
    if (dashMatch && dashMatch[1]) {
      const num = parseInt(dashMatch[1], 10);
      if (!isNaN(num) && num > 0) return num;
    }
    // 3. Name ending with number before extension: kaiju1.mp4, solo08.mkv
    const baseName = filename.replace(/\.[^/.]+$/, "");
    const trailingNum = baseName.match(/(?:[_\s\-\(\[]|^)0*(\d+)(?:[_\s\-\)\]]|$)/);
    if (trailingNum && trailingNum[1]) {
      const num = parseInt(trailingNum[1], 10);
      if (!isNaN(num) && num > 0 && num < 2000) return num;
    }
    // 4. Any numbers in baseName
    const numbers = baseName.match(/\d+/g);
    if (numbers && numbers.length > 0) {
      const last = parseInt(numbers[numbers.length - 1], 10);
      if (!isNaN(last) && last > 0 && last < 2000) return last;
    }
    return null;
  };

  // Fetch staged (unlinked) videos from Backblaze B2
  const fetchStagedVideos = async () => {
    setIsLoadingStagedVideos(true);
    try {
      const res = await adminFetch("/api/v1/admin/staged-videos");
      const data = await res.json();
      if (data.success) {
        const list = Array.isArray(data.files) ? data.files : (Array.isArray(data.data) ? data.data : []);
        setStagedVideos(list);
      }
    } catch (e) {
      console.error("Failed to fetch staged videos:", e);
    } finally {
      setIsLoadingStagedVideos(false);
    }
  };

  // Attach a staged B2 video to the episode form
  const handleAttachStagedVideo = (video: StagedVideo) => {
    setUploadMode("direct");
    setUploadedB2Key(video.file_name);
    const fileName = video.file_name.split("/").pop() || video.file_name;
    setVideoFileInfo({
      name: fileName,
      size: video.formatted_size,
    });
    setUploadJob({
      id: "staged_recovered",
      status: "completed",
      progress: 100,
      message: `🎉 B2 bulutidagi tayyor video biriktirildi (${video.formatted_size})!`,
      video_key: video.file_name,
    });

    const detectedEp = parseEpisodeFromFilename(fileName);
    if (detectedEp) {
      setEpNumber(detectedEp);
      setEpTitle(`${detectedEp}-qism`);
    }

    try {
      localStorage.setItem("hikaku_upload_draft", JSON.stringify({
        uploadedB2Key: video.file_name,
        videoFileInfo: { name: fileName, size: video.formatted_size },
        epNumber: detectedEp || epNumber,
        epTitle: epTitle || `${detectedEp || epNumber}-qism`,
        epDubStudio,
        epIsVIP,
        postToTelegram,
        selectedAnimeId,
      }));
    } catch (e) {}

    showToast(`✅ "${fileName}" epizod formasiga biriktirildi! Animeni tanlang va saqlang.`);
  };

  // Delete staged file from B2
  const handleDeleteStagedVideo = async (fileId: string, fileName: string) => {
    const displayName = fileName.split("/").pop() || fileName;
    if (!confirm(`Haqiqatdan ham B2 dagi "${displayName}" faylini butunlay o'chirmoqchimisiz?`)) return;
    try {
      const res = await adminFetch(`/api/v1/admin/staged-video?file_id=${encodeURIComponent(fileId)}&file_name=${encodeURIComponent(fileName)}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        showToast("B2 dagi fayl muvaffaqiyatli o'chirildi");
        setStagedVideos((prev) => prev.filter((v) => v.file_id !== fileId));
        if (uploadedB2Key === fileName) {
          setUploadedB2Key("");
          setVideoFileInfo(null);
          setUploadJob(null);
          try { localStorage.removeItem("hikaku_upload_draft"); } catch (e) {}
        }
      } else {
        showToast(data.error || "O'chirishda xatolik", "error");
      }
    } catch (e) {
      console.error(e);
      showToast("Server bilan bog'lanishda xatolik", "error");
    }
  };

  // Start direct browser-to-Backblaze B2 upload (bypasses Cloudflare 100MB limit completely!)
  const startDirectB2Upload = async (file: File, targetEpNum: number) => {
    if (currentXhrRef.current) {
      try {
        currentXhrRef.current.abort();
      } catch (e) {}
      currentXhrRef.current = null;
    }

    setIsUploading(true);
    setUploadJob({
      id: "direct-b2",
      status: "processing",
      progress: 0,
      message: "☁️ Backblaze B2 yuklash manzili olinmoqda...",
    });

    try {
      const animeId = selectedAnimeIdRef.current || 0;
      const ticketRes = await adminFetch(
        `/api/v1/admin/b2-upload-ticket?file_name=${encodeURIComponent(file.name)}&episode_number=${targetEpNum}&anime_id=${animeId}`
      );
      const ticketData = await ticketRes.json();

      if (!ticketData.success || !ticketData.upload_url) {
        setIsUploading(false);
        setUploadJob(null);
        showToast(ticketData.error || "B2 upload manzilini olib bo'lmadi", "error");
        return;
      }

      const uploadUrl = ticketData.upload_url;
      const authToken = ticketData.authorization_token;
      const b2Key = ticketData.b2_key;

      const xhr = new XMLHttpRequest();
      currentXhrRef.current = xhr;

      xhr.open("POST", uploadUrl);
      xhr.setRequestHeader("Authorization", authToken);
      xhr.setRequestHeader("X-Bz-File-Name", encodeURI(b2Key));
      xhr.setRequestHeader("Content-Type", file.type || "video/mp4");
      xhr.setRequestHeader("X-Bz-Content-Sha1", "do_not_verify");

      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          const percent = Math.min(99, Math.round((e.loaded / e.total) * 100));
          const loadedMb = (e.loaded / (1024 * 1024)).toFixed(1);
          const totalMb = (e.total / (1024 * 1024)).toFixed(1);
          setUploadJob({
            id: "direct-b2",
            status: "processing",
            progress: percent,
            message: `☁️ B2 bulutiga yuklanmoqda: ${loadedMb} MB / ${totalMb} MB (${percent}%)`,
          });
        }
      };

      xhr.onload = async () => {
        currentXhrRef.current = null;
        if (xhr.status === 200) {
          let finalKey = b2Key;
          try {
            const resp = JSON.parse(xhr.responseText);
            if (resp.fileName) finalKey = resp.fileName;
          } catch (err) {}

          // Automatically trigger fast asynchronous HLS conversion on server
          setUploadJob({
            id: "direct-b2",
            status: "processing",
            progress: 50,
            message: "⚙️ Video HLS (.m3u8) formatiga o'tkazilmoqda... Orqa fonda boshlandi",
          });

          try {
            const hlsRes = await adminFetch("/api/v1/admin/convert-hls", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                b2_key: finalKey,
                anime_id: animeId,
                episode_number: targetEpNum,
              }),
            });
            const hlsData = await hlsRes.json();
            if (!hlsData.success) {
              throw new Error(hlsData.error || "HLS ga o'tkazish boshlanmadi");
            }

            if (hlsData.status === "completed" && (hlsData.result_key || hlsData.b2_key)) {
              finalKey = hlsData.result_key || hlsData.b2_key;
            } else if (hlsData.job_id) {
              // Poll job status until complete
              const pollJobId = hlsData.job_id;
              const pollHLS = async (): Promise<string> => {
                return new Promise((resolve, reject) => {
                  const pollTimer = setInterval(async () => {
                    try {
                      const stRes = await adminFetch(`/api/v1/admin/convert-hls/status?job_id=${pollJobId}`);
                      const stData = await stRes.json();
                      if (stData.success && stData.job) {
                        const j = stData.job;
                        const prog = Math.max(50, j.progress || 50);
                        setUploadJob({
                          id: "direct-b2",
                          status: j.status === "completed" ? "completed" : "processing",
                          progress: prog,
                          message: j.message || "⚙️ HLS ga o'tkazilmoqda...",
                        });

                        if (j.status === "completed" && j.result_key) {
                          clearInterval(pollTimer);
                          resolve(j.result_key);
                        } else if (j.status === "failed") {
                          clearInterval(pollTimer);
                          reject(new Error(j.error || "HLS ga o'tkazishda xatolik"));
                        }
                      }
                    } catch (pollErr) {
                      console.error("HLS poll network error:", pollErr);
                    }
                  }, 1500);
                });
              };
              finalKey = await pollHLS();
            }
          } catch (convErr: any) {
            console.error("HLS conversion fatal error:", convErr);
            setIsUploading(false);
            setIsSavingPending(false);
            setUploadJob({
              id: "direct-b2",
              status: "failed",
              progress: 0,
              message: `❌ HLS ga o'tkazishda xatolik: ${convErr?.message || "Server xatosi"}. Qism saqlanmadi!`,
            });
            setUploadedB2Key("");
            showToast(`❌ Video HLS (.m3u8) formatiga o'tmadi! Qat'iy qoida: Qism saqlanmadi.`, "error");
            return;
          }

          if (!finalKey.endsWith(".m3u8")) {
            setIsUploading(false);
            setIsSavingPending(false);
            setUploadJob(null);
            setUploadedB2Key("");
            showToast("❌ Xatolik: Video .m3u8 formatini olmadi! Saqlash bekor qilindi.", "error");
            return;
          }

          setUploadedB2Key(finalKey);

          // Auto-save immediately if anime is selected
          if (selectedAnimeIdRef.current > 0) {
            await executeFinalSave(finalKey, "");
          } else {
            setIsUploading(false);
            setIsSavingPending(false);
            setUploadJob({
              id: "direct-b2",
              status: "completed",
              progress: 100,
              message: "🎉 Video muvaffaqiyatli HLS formatiga o'tkazildi! Animeni tanlang va saqlang.",
            });
            try {
              localStorage.setItem(
                "hikaku_upload_draft",
                JSON.stringify({
                  uploadedB2Key: finalKey,
                  videoFileInfo: { name: file.name, size: `${(file.size / (1024 * 1024)).toFixed(1)} MB` },
                  epNumber: targetEpNum || epNumber,
                  epTitle: epTitle || `${targetEpNum || epNumber}-qism`,
                  epDubStudio,
                  epIsVIP,
                  selectedAnimeId,
                })
              );
            } catch (err) {}
            fetchStagedVideos();
            showToast("✅ Video HLS formatida tayyor! Animeni tanlab 'Epizodni Saqlash'ni bosing.");
          }
        } else {
          setIsUploading(false);
          setIsSavingPending(false);
          setUploadJob(null);
          let errMsg = `B2 yuklash xatosi (HTTP ${xhr.status})`;
          try {
            const errObj = JSON.parse(xhr.responseText);
            if (errObj.message) errMsg = errObj.message;
          } catch (e) {}
          showToast(errMsg, "error");
        }
      };

      xhr.onerror = () => {
        currentXhrRef.current = null;
        setIsUploading(false);
        setIsSavingPending(false);
        setUploadJob(null);
        showToast("Video yuklashda tarmoq xatosi yuz berdi", "error");
      };

      xhr.onabort = () => {
        currentXhrRef.current = null;
        setIsUploading(false);
        setIsSavingPending(false);
      };

      xhr.send(file);
    } catch (e) {
      console.error("Direct B2 error:", e);
      setIsUploading(false);
      setIsSavingPending(false);
      setUploadJob(null);
      showToast("B2 bilan bog'lanishda xatolik", "error");
    }
  };

  // Start background upload immediately when file is selected
  const startBackgroundUpload = async (file: File, targetEpNum: number) => {
    // If direct mode or file > 95MB (Cloudflare proxy limit), always use direct B2 upload!
    if (uploadMode === "direct" || file.size > 95 * 1024 * 1024) {
      if (uploadMode === "compress" && file.size > 95 * 1024 * 1024) {
        showToast("Fayl 100MB dan katta bo'lgani uchun 'To'g'ridan-to'g'ri B2' orqali yuklanmoqda", "success");
        setUploadMode("direct");
      }
      await startDirectB2Upload(file, targetEpNum);
      return;
    }

    // Small files under 95MB in compress mode can go through FFmpeg backend
    setIsUploading(true);
    setUploadJob({
      id: "starting",
      status: "processing",
      progress: 10,
      message: "Video serverga yuborilmoqda...",
    });

    const formData = new FormData();
    formData.append("anime_id", "0");
    formData.append("episode_number", targetEpNum.toString());
    formData.append("title", epTitleRef.current.trim() || `${targetEpNum}-qism`);
    formData.append("is_vip_only", epIsVIPRef.current ? "true" : "false");
    formData.append("anime_slug", "staged");
    formData.append("dub_studio", epDubStudioRef.current);
    formData.append("fandub_id", (epFandubIdRef.current || 1).toString());
    formData.append("video_file", file);
    formData.append("crf", uploadCrf.toString());
    formData.append("resolution", "1080p");

    try {
      const res = await adminFetch("/api/v1/admin/upload-episode", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (data.success && data.job_id) {
        setUploadJob({
          id: data.job_id,
          status: "processing",
          progress: 25,
          message: "⚙️ FFmpeg orqali siqilmoqda...",
        });
      } else {
        setIsUploading(false);
        setUploadJob(null);
        showToast(data.error || "Videoni yuklashda xatolik", "error");
      }
    } catch (e) {
      console.error(e);
      setIsUploading(false);
      setUploadJob(null);
      showToast("Yuklashda server xatosi yuz berdi", "error");
    }
  };

  // Triggered when file dropped or selected
  const handleVideoFileSelect = (file: File) => {
    if (currentXhrRef.current) {
      try {
        currentXhrRef.current.abort();
      } catch (e) {}
      currentXhrRef.current = null;
    }

    const sizeMb = (file.size / (1024 * 1024)).toFixed(1) + " MB";
    setVideoFileInfo({ name: file.name, size: sizeMb });
    setUploadFile(file);
    setUploadedB2Key("");
    setUploadedThumbUrl("");
    setIsSavingPending(false);

    // Auto-detect episode number from filename
    const detectedEp = parseEpisodeFromFilename(file.name);
    const targetEp = detectedEp || epNumber;
    if (detectedEp) {
      setEpNumber(detectedEp);
      setEpTitle(`${detectedEp}-qism`);
    }

    startBackgroundUpload(file, targetEp);
  };

  // Final Save to Database
  const executeFinalSave = async (keyOverride?: string, thumbOverride?: string) => {
    const activeB2Key = keyOverride || uploadedB2Key;
    const activeThumb = thumbOverride || uploadedThumbUrl;
    const animeId = selectedAnimeIdRef.current;
    const epNum = epNumberRef.current;
    const title = epTitleRef.current.trim() || `${epNum}-qism`;
    const isVip = epIsVIPRef.current;
    const dub = epDubStudioRef.current;
    const shouldPostTG = postToTelegramRef.current;

    if (!animeId) {
      showToast("Iltimos, animeni tanlang", "error");
      setIsSavingPending(false);
      return;
    }

    if (!activeB2Key) {
      showToast("Video hali to'liq yuklanmadi", "error");
      return;
    }

    if (!activeB2Key.endsWith(".m3u8")) {
      showToast("❌ Qat'iy qoida: Qism faqat HLS (.m3u8) formatida saqlanishi shart! Video hali HLS ga aylanmagan.", "error");
      setIsSavingPending(false);
      return;
    }

    try {
      const payload = {
        anime_id: animeId,
        episode_number: epNum,
        title: title,
        video_url: activeB2Key,
        thumbnail_url: activeThumb,
        is_vip_only: isVip,
        dub_studio: dub,
        duration: 1440,
        fandub_id: epFandubIdRef.current || 1,
        post_to_telegram: shouldPostTG,
      };

      const res = await adminFetch("/api/v1/admin/episode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        showToast(`🎉 ${epNum}-qism muvaffaqiyatli saqlandi!`);
        setEpNumber((prev) => prev + 1);
        setEpTitle("");
        setUploadFile(null);
        setVideoFileInfo(null);
        setUploadedB2Key("");
        setUploadedThumbUrl("");
        setUploadJob(null);
        setIsSavingPending(false);
        setIsUploading(false);
        try {
          localStorage.removeItem("hikaku_upload_draft");
        } catch (e) {}
        fetchStagedVideos();
        fetchData();
      } else {
        showToast(data.error || "Qismni saqlashda xatolik", "error");
        setIsSavingPending(false);
      }
    } catch (e) {
      console.error(e);
      showToast("Qismni saqlashda server xatosi", "error");
      setIsSavingPending(false);
    }
  };

  // Episode Upload / Direct Add Handler
  const handleEpisodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // 1. DIRECT VIDEO URL MODE
    if (uploadMode === "url") {
      if (!selectedAnimeId) {
        showToast("Iltimos, animeni tanlang", "error");
        return;
      }
      if (!epDirectUrl.trim()) {
        showToast("Video havolasini kiriting", "error");
        return;
      }
      setIsUploading(true);
      try {
        const payload = {
          anime_id: selectedAnimeId,
          episode_number: epNumber,
          title: epTitle.trim() || `${epNumber}-qism`,
          video_url: epDirectUrl.trim(),
          is_vip_only: epIsVIP,
          dub_studio: epDubStudio,
          duration: 1440,
    fandub_id: 1,
          post_to_telegram: postToTelegram,
        };
        const res = await adminFetch("/api/v1/admin/episode", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (data.success) {
          showToast(`🎉 ${epNumber}-qism to'g'ridan-to'g'ri havola bilan saqlandi!`);
          setEpNumber((prev) => prev + 1);
          setEpDirectUrl("");
          setEpTitle("");
          fetchData();
        } else {
          showToast(data.error || "Saqlashda xatolik", "error");
        }
      } catch (e) {
        console.error(e);
        showToast("Server xatosi", "error");
      } finally {
        setIsUploading(false);
      }
      return;
    }

    // 2 & 3. FILE UPLOAD (Direct B2 OR Compression)
    if (!videoFileInfo && !uploadedB2Key) {
      showToast("Iltimos, avval video faylni yuklang", "error");
      fileInputRef.current?.click();
      return;
    }

    if (!selectedAnimeId) {
      showToast("Iltimos, animeni tanlang yoki yangi anime yarating!", "error");
      if (animes.length === 0) {
        setIsAddingAnimeFromStudio(true);
        setIsAnimeModalOpen(true);
      }
      return;
    }

    // If still uploading, queue save
    if (isUploading && !uploadedB2Key) {
      setIsSavingPending(true);
      showToast("⏳ Video yuklanmoqda... Tugashi bilan avtomatik saqlanadi!");
      return;
    }

    // If uploaded, save now
    if (uploadedB2Key) {
      if (!uploadedB2Key.endsWith(".m3u8")) {
        showToast("❌ Video hali HLS (.m3u8) formatiga aylanmagan! Kuting...", "error");
        return;
      }
      await executeFinalSave();
    }
  };

  // Save Settings
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await adminFetch("/api/v1/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      const data = await res.json();
      if (data.success) {
        showToast("⚙️ Platforma sozlamalari muvaffaqiyatli saqlandi!");
      } else {
        showToast(data.error || "Xatolik yuz berdi", "error");
      }
    } catch (e) {
      console.error(e);
      showToast("Server xatosi", "error");
    }
  };

  // Add Channel
  const handleAddChannel = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await adminFetch("/api/v1/admin/channel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newChannel),
      });
      const data = await res.json();
      if (data.success) {
        showToast("Homiy kanal muvaffaqiyatli qo'shildi!");
        setNewChannel({ platform: "telegram", channel_id: "-100", channel_name: "", invite_link: "https://t.me/" });
        fetchData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Delete Channel
  const handleDeleteChannel = async (id: number) => {
    if (!confirm("Kanalni o'chirishni tasdiqlaysizmi?")) return;
    try {
      const res = await adminFetch(`/api/v1/admin/channel?id=${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        showToast("Kanal o'chirildi");
        fetchData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Grant / Revoke VIP
  const handleGrantVIP = async (userId: number, days: number) => {
    try {
      const res = await adminFetch("/api/v1/admin/users/grant-vip", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId, days }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(`VIP ${days} kunga faollashtirildi!`);
        fetchData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleRevokeVIP = async (userId: number) => {
    if (!confirm("VIP maqomini bekor qilmoqchimisiz?")) return;
    try {
      const res = await adminFetch("/api/v1/admin/users/revoke-vip", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId }),
      });
      const data = await res.json();
      if (data.success) {
        showToast("VIP bekor qilindi");
        fetchData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchAdmins = async () => {
    try {
      const res = await adminFetch("/api/v1/admin/admins");
      const data = await res.json();
      if (data.success && Array.isArray(data.admins)) {
        setAdminsList(data.admins);
      }
    } catch (e) {
      console.error("Error fetching admins:", e);
    }
  };

  const handleSaveAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminForm.telegram_id || !adminForm.full_name) {
      showToast("Telegram ID va to'liq ismni kiriting", "error");
      return;
    }
    if (!isFounder && adminForm.role === "SUPERADMIN") {
      showToast("SuperAdmin rolini faqat Asoschi (Founder) tayinlashi mumkin!", "error");
      return;
    }
    setAdminActionLoading(true);
    try {
      const res = await adminFetch("/api/v1/admin/admins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          telegram_id: Number(adminForm.telegram_id),
          full_name: adminForm.full_name.trim(),
          role: adminForm.role,
        }),
      });
      const data = await res.json();
      if (data.success) {
        showToast("Admin muvaffaqiyatli saqlandi!", "success");
        setIsAdminModalOpen(false);
        setAdminForm({ telegram_id: "", full_name: "", role: "ADMIN" });
        fetchAdmins();
      } else {
        showToast(data.error || data.message || "Xatolik yuz berdi", "error");
      }
    } catch (err: any) {
      showToast(err.message || "Tarmoq xatosi", "error");
    } finally {
      setAdminActionLoading(false);
    }
  };

  const handleRemoveAdmin = async (tgId: number, name: string) => {
    if (tgId === 5415350162 || tgId === 4351671) {
      showToast("Asoschi (Founder) mutlaq daxlsiz, uni chiqarib bo'lmaydi!", "error");
      return;
    }
    if (!confirm(`${name} (${tgId}) ni adminlikdan chiqarishni tasdiqlaysizmi?`)) return;
    try {
      const res = await adminFetch(`/api/v1/admin/admins?telegram_id=${tgId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        showToast("Admin vazifasidan ozod etildi", "success");
        fetchAdmins();
      } else {
        showToast(data.error || data.message || "Xatolik", "error");
      }
    } catch (err: any) {
      showToast(err.message || "Xatolik", "error");
    }
  };

  const handleEditAdmin = (a: AdminUser) => {
    setAdminForm({
      telegram_id: String(a.telegram_id),
      full_name: a.full_name,
      role: a.role,
    });
    setIsAdminModalOpen(true);
  };

  const openAssignAdminModal = (telegramId: number, fullName: string) => {
    setAdminForm({
      telegram_id: String(telegramId),
      full_name: fullName || "",
      role: "ADMIN",
    });
    setIsAdminModalOpen(true);
  };

  const filteredAnimes = animes.filter((a) => {
    const q = animeSearchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      a.title_uz.toLowerCase().includes(q) ||
      (a.title_en && a.title_en.toLowerCase().includes(q)) ||
      (a.slug && a.slug.toLowerCase().includes(q));
    if (!matchesSearch) return false;

    const hasEpisodes = (a.current_episode || 0) > 0;
    if (animeFilterTab === "active") return hasEpisodes;
    if (animeFilterTab === "archive") return !hasEpisodes;
    return true;
  });

  // Stealth Security Guard: If not mounted yet (SSR) OR still verifying admin role in background
  if (!mounted || isVerifyingAdmin) {
    return (
      <div className="min-h-screen bg-[#060911] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-rose-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthorizedAdmin) {
    return (
      <div className="min-h-screen bg-[#060911] flex flex-col items-center justify-center text-center px-4">
        <div className="relative mb-6">
          <div className="w-20 h-20 rounded-3xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center shadow-neon">
            <ShieldCheck className="w-10 h-10 text-rose-500" />
          </div>
          <span className="absolute -bottom-2 -right-2 px-2.5 py-0.5 rounded-full bg-rose-500/20 border border-rose-500/40 text-[10px] font-black text-rose-400 tracking-wider">
            404 ERROR
          </span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-white mb-2 tracking-tight">
          Sahifa Topilmadi
        </h1>
        <p className="text-slate-400 text-xs sm:text-sm max-w-md mb-6 leading-relaxed">
          Siz qidirayotgan sahifa mavjud emas yoki unga kirish uchun maxsus ruxsat talab qilinadi.
        </p>
        <Link
          href="/"
          className="px-6 py-2.5 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs border border-white/10 transition-all inline-flex items-center gap-2"
        >
          <Home className="w-4 h-4" /> Bosh sahifaga qaytish
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#060911] text-slate-100 flex flex-col font-sans selection:bg-rose-600 selection:text-white">
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 p-4 rounded-2xl border shadow-2xl flex items-center gap-3 animate-slide-up text-xs font-bold ${
          toast.type === "success"
            ? "bg-[#0c1626] border-emerald-500/50 text-emerald-300 shadow-[0_0_20px_rgba(16,185,129,0.3)]"
            : toast.type === "info"
            ? "bg-[#0f172a] border-cyan-500/50 text-cyan-300 shadow-[0_0_20px_rgba(6,182,212,0.3)]"
            : "bg-[#1e0e14] border-rose-500/50 text-rose-300 shadow-[0_0_20px_rgba(225,29,72,0.3)]"
        }`}>
          {toast.type === "success" ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          ) : toast.type === "info" ? (
            <AlertCircle className="w-4 h-4 text-cyan-400" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-400" />
          )}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Top Navbar */}
      <header className="sticky top-0 z-40 bg-[#080b14]/90 backdrop-blur-md border-b border-white/10 px-4 sm:px-8 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-rose-600 to-amber-500 flex items-center justify-center shadow-neon">
              <ShieldCheck className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-base tracking-wider text-white">HIKAKU</span>
                <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-rose-600/20 text-rose-400 border border-rose-500/30">
                  SuperAdmin
                </span>
              </div>
              <span className="text-[11px] text-slate-400 font-medium hidden sm:inline">
                Platforma boshqaruv studiyasi
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              href="/"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 text-xs font-bold transition-all"
            >
              <Home className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Saytga Qaytish</span>
            </Link>

            <button
              onClick={fetchData}
              title="Yangilash"
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 transition-all"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin text-rose-400" : ""}`} />
            </button>

            <button
              onClick={logout}
              title="Chiqish"
              className="p-2 rounded-xl bg-rose-600/10 hover:bg-rose-600/20 text-rose-400 border border-rose-500/30 transition-all"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Mobile Navigation Dropdown / Drawer Trigger Bar */}
        <div className="sm:hidden flex items-center justify-between gap-2 p-3 rounded-2xl bg-[#0d111e] border border-white/10 shadow-lg">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400 shrink-0">Bo&apos;lim:</span>
            <span className="text-xs font-black text-white truncate flex items-center gap-1.5">
              {activeTab === "stats" && <><BarChart3 className="w-3.5 h-3.5 text-rose-400" /> Tahlil & Statistika</>}
              {activeTab === "animes" && <><Film className="w-3.5 h-3.5 text-emerald-400" /> Animelar ({animes.length})</>}
              {activeTab === "episodes" && <><Upload className="w-3.5 h-3.5 text-indigo-400" /> Qismlar Studio</>}
              {activeTab === "fandubs" && <><Mic className="w-3.5 h-3.5 text-pink-400" /> Fandublar ({fandubs.length})</>}
              {activeTab === "audit" && <><History className="w-3.5 h-3.5 text-amber-400" /> Jurnal & Audit</>}
              {activeTab === "users" && <><Users className="w-3.5 h-3.5 text-sky-400" /> Userlar ({usersList.length})</>}
              {activeTab === "admins" && <><ShieldCheck className="w-3.5 h-3.5 text-yellow-400" /> Adminlar ({adminsList.length})</>}
              {activeTab === "settings" && <><Settings className="w-3.5 h-3.5 text-purple-400" /> Sozlamalar</>}
            </span>
          </div>

          <button
            type="button"
            onClick={() => setIsMobileNavOpen(true)}
            className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-black text-xs flex items-center gap-1.5 shadow-neon active:scale-95 transition-all shrink-0"
          >
            <Menu className="w-3.5 h-3.5" />
            <span>Barchasi</span>
          </button>
        </div>

        {/* Mobile Navigation Drawer / Modal */}
        {isMobileNavOpen && (
          <div className="fixed inset-0 z-50 flex flex-col justify-end sm:hidden bg-black/80 backdrop-blur-md animate-in fade-in">
            <div 
              className="absolute inset-0"
              onClick={() => setIsMobileNavOpen(false)}
            />
            <div className="relative w-full max-h-[85vh] overflow-y-auto bg-[#0c1020] border-t border-rose-500/30 rounded-t-3xl p-5 space-y-4 shadow-2xl animate-in slide-in-from-bottom-6">
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-rose-500" />
                  <h3 className="text-sm font-black text-white">Admin Panel Bo&apos;limlari</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsMobileNavOpen(false)}
                  className="p-1.5 rounded-xl bg-white/5 text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 gap-2">
                <button
                  type="button"
                  onClick={() => { setActiveTab("stats"); setIsMobileNavOpen(false); }}
                  className={`flex items-center justify-between p-3.5 rounded-2xl text-xs font-black transition-all ${
                    activeTab === "stats"
                      ? "bg-rose-600 text-white shadow-neon"
                      : "bg-white/5 hover:bg-white/10 text-slate-300"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <BarChart3 className="w-4 h-4 text-cyan-400" />
                    <span>Tahlil & Statistika</span>
                  </div>
                  <span className="text-[10px] opacity-70">Umumiy ko&apos;rsatkichlar</span>
                </button>

                <button
                  type="button"
                  onClick={() => { setActiveTab("animes"); setIsMobileNavOpen(false); }}
                  className={`flex items-center justify-between p-3.5 rounded-2xl text-xs font-black transition-all ${
                    activeTab === "animes"
                      ? "bg-rose-600 text-white shadow-neon"
                      : "bg-white/5 hover:bg-white/10 text-slate-300"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Film className="w-4 h-4 text-emerald-400" />
                    <span>Animelar Katalogi</span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-black/30 text-[10px]">{animes.length} ta</span>
                </button>

                <button
                  type="button"
                  onClick={() => { setActiveTab("episodes"); setIsMobileNavOpen(false); }}
                  className={`flex items-center justify-between p-3.5 rounded-2xl text-xs font-black transition-all ${
                    activeTab === "episodes"
                      ? "bg-rose-600 text-white shadow-neon"
                      : "bg-white/5 hover:bg-white/10 text-slate-300"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Upload className="w-4 h-4 text-indigo-400" />
                    <span>Qismlar Yuklash Studio</span>
                  </div>
                  <span className="text-[10px] opacity-70">Video & HLS</span>
                </button>

                <button
                  type="button"
                  onClick={() => { setActiveTab("fandubs"); setIsMobileNavOpen(false); }}
                  className={`flex items-center justify-between p-3.5 rounded-2xl text-xs font-black transition-all ${
                    activeTab === "fandubs"
                      ? "bg-rose-600 text-white shadow-neon"
                      : "bg-white/5 hover:bg-white/10 text-slate-300"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Mic className="w-4 h-4 text-pink-400" />
                    <span>Fandub Studiyalar</span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-black/30 text-[10px]">{fandubs.length} ta</span>
                </button>

                <button
                  type="button"
                  onClick={() => { setActiveTab("audit"); setIsMobileNavOpen(false); }}
                  className={`flex items-center justify-between p-3.5 rounded-2xl text-xs font-black transition-all ${
                    activeTab === "audit"
                      ? "bg-rose-600 text-white shadow-neon"
                      : "bg-white/5 hover:bg-white/10 text-slate-300"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <History className="w-4 h-4 text-amber-400" />
                    <span>Jurnal & Audit (Tarix)</span>
                  </div>
                  <span className="text-[10px] opacity-70">Admin amallari</span>
                </button>

                <button
                  type="button"
                  onClick={() => { setActiveTab("users"); setIsMobileNavOpen(false); }}
                  className={`flex items-center justify-between p-3.5 rounded-2xl text-xs font-black transition-all ${
                    activeTab === "users"
                      ? "bg-rose-600 text-white shadow-neon"
                      : "bg-white/5 hover:bg-white/10 text-slate-300"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Users className="w-4 h-4 text-sky-400" />
                    <span>Foydalanuvchilar</span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-black/30 text-[10px]">{usersList.length} ta</span>
                </button>

                {isSuperAdmin && (
                  <button
                    type="button"
                    onClick={() => { setActiveTab("admins"); setIsMobileNavOpen(false); }}
                    className={`flex items-center justify-between p-3.5 rounded-2xl text-xs font-black transition-all ${
                      activeTab === "admins"
                        ? "bg-amber-500 text-black shadow-neon"
                        : "bg-white/5 hover:bg-white/10 text-amber-300"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <ShieldCheck className="w-4 h-4 text-amber-400" />
                      <span>Adminlar Boshqaruvi</span>
                    </div>
                    <span className="px-2 py-0.5 rounded-full bg-black/30 text-[10px]">{adminsList.length} ta</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => { setActiveTab("settings"); setIsMobileNavOpen(false); }}
                  className={`flex items-center justify-between p-3.5 rounded-2xl text-xs font-black transition-all ${
                    activeTab === "settings"
                      ? "bg-rose-600 text-white shadow-neon"
                      : "bg-white/5 hover:bg-white/10 text-slate-300"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Settings className="w-4 h-4 text-purple-400" />
                    <span>Sayt & To&apos;lov Sozlamalari</span>
                  </div>
                  <span className="text-[10px] opacity-70">Konfiguratsiya</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Responsive Horizontal Swiper / Scrollable Tab Navigation */}
        <div className="overflow-x-auto scrollbar-none py-1 -mx-4 sm:mx-0 px-4 sm:px-0">
          <nav className="flex items-center gap-1.5 sm:gap-2 p-1.5 rounded-2xl bg-[#0d111e] border border-white/10 min-w-max shadow-lg">
            <button
              onClick={() => setActiveTab("stats")}
              className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl text-xs font-bold transition-all ${
                activeTab === "stats"
                  ? "bg-gradient-to-r from-rose-600 to-rose-500 text-white shadow-neon scale-105"
                  : "text-slate-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              <span className="sm:hidden">Tahlil</span>
              <span className="hidden sm:inline">Tahlil & Statistika</span>
            </button>

            <button
              onClick={() => setActiveTab("animes")}
              className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl text-xs font-bold transition-all ${
                activeTab === "animes"
                  ? "bg-gradient-to-r from-rose-600 to-rose-500 text-white shadow-neon scale-105"
                  : "text-slate-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <Film className="w-4 h-4" />
              <span>Animelar ({animes.length})</span>
            </button>

            <button
              onClick={() => setActiveTab("episodes")}
              className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl text-xs font-bold transition-all ${
                activeTab === "episodes"
                  ? "bg-gradient-to-r from-rose-600 to-rose-500 text-white shadow-neon scale-105"
                  : "text-slate-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <Upload className="w-4 h-4" />
              <span className="sm:hidden">Qismlar</span>
              <span className="hidden sm:inline">Qismlar Yuklash Studio</span>
            </button>

            <button
              onClick={() => setActiveTab("fandubs")}
              className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl text-xs font-bold transition-all ${
                activeTab === "fandubs"
                  ? "bg-gradient-to-r from-rose-600 to-rose-500 text-white shadow-neon scale-105"
                  : "text-slate-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <Mic className="w-4 h-4 text-pink-400" />
              <span>Fandublar</span>
              {fandubs.length > 0 && (
                <span className="text-[10px] bg-white/10 px-1.5 py-0.5 rounded-full">
                  {fandubs.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab("audit")}
              className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl text-xs font-bold transition-all ${
                activeTab === "audit"
                  ? "bg-gradient-to-r from-rose-600 to-rose-500 text-white shadow-neon scale-105"
                  : "text-slate-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <History className="w-4 h-4 text-amber-400" />
              <span className="sm:hidden">Tarix</span>
              <span className="hidden sm:inline">Jurnal (Tarix)</span>
            </button>

            <button
              onClick={() => setActiveTab("users")}
              className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl text-xs font-bold transition-all ${
                activeTab === "users"
                  ? "bg-gradient-to-r from-rose-600 to-rose-500 text-white shadow-neon scale-105"
                  : "text-slate-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <Users className="w-4 h-4" />
              <span className="sm:hidden">Userlar ({usersList.length})</span>
              <span className="hidden sm:inline">Foydalanuvchilar ({usersList.length})</span>
            </button>

            {isSuperAdmin && (
              <button
                onClick={() => setActiveTab("admins")}
                className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl text-xs font-bold transition-all ${
                  activeTab === "admins"
                    ? "bg-gradient-to-r from-amber-500 to-yellow-500 text-black shadow-neon scale-105"
                    : "text-slate-400 hover:text-white hover:bg-white/5"
                }`}
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Adminlar ({adminsList.length})</span>
              </button>
            )}

            <button
              onClick={() => setActiveTab("settings")}
              className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl text-xs font-bold transition-all ${
                activeTab === "settings"
                  ? "bg-gradient-to-r from-rose-600 to-rose-500 text-white shadow-neon scale-105"
                  : "text-slate-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <Settings className="w-4 h-4" />
              <span className="sm:hidden">Sozlamalar</span>
              <span className="hidden sm:inline">Sayt & To&apos;lov Sozlamalari</span>
            </button>
          </nav>
        </div>

        {/* ========================================================= */}
        {/* TAB 1: OVERVIEW & STATS */}
        {/* ========================================================= */}
        {activeTab === "stats" && (
          <div className="space-y-6 animate-fade-in">
            {/* Stat Cards Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-5 rounded-3xl bg-[#0c101c] border border-rose-900/30 shadow-xl space-y-2">
                <div className="flex items-center justify-between text-rose-400">
                  <span className="text-xs font-bold text-slate-400">Jami Animelar</span>
                  <Film className="w-5 h-5" />
                </div>
                <div className="text-2xl sm:text-3xl font-black text-white">
                  {stats?.total_animes || animes.length}
                </div>
                <span className="text-[10px] text-slate-500">Katalogdagi sarlavhalar</span>
              </div>

              <div className="p-5 rounded-3xl bg-[#0c101c] border border-cyan-900/30 shadow-xl space-y-2">
                <div className="flex items-center justify-between text-cyan-400">
                  <span className="text-xs font-bold text-slate-400">Jami Qismlar</span>
                  <Tv className="w-5 h-5" />
                </div>
                <div className="text-2xl sm:text-3xl font-black text-white">
                  {stats?.total_episodes || episodes.length}
                </div>
                <span className="text-[10px] text-slate-500">B2 bulutidagi qismlar</span>
              </div>

              <div className="p-5 rounded-3xl bg-[#0c101c] border border-indigo-900/30 shadow-xl space-y-2">
                <div className="flex items-center justify-between text-indigo-400">
                  <span className="text-xs font-bold text-slate-400">Foydalanuvchilar</span>
                  <Users className="w-5 h-5" />
                </div>
                <div className="text-2xl sm:text-3xl font-black text-white">
                  {stats?.total_users || usersList.length}
                </div>
                <span className="text-[10px] text-slate-500">Ro'yxatdan o'tganlar</span>
              </div>

              <div className="p-5 rounded-3xl bg-[#0c101c] border border-amber-900/30 shadow-xl space-y-2">
                <div className="flex items-center justify-between text-amber-400">
                  <span className="text-xs font-bold text-slate-400">VIP Obunachilar</span>
                  <Crown className="w-5 h-5 fill-amber-400" />
                </div>
                <div className="text-2xl sm:text-3xl font-black text-amber-300">
                  {stats?.total_vip_users || usersList.filter((u) => u.is_vip).length}
                </div>
                <span className="text-[10px] text-slate-500">Faol VIP hisoblar</span>
              </div>
            </div>

            {/* Quick Action Hub */}
            <div className="p-6 rounded-3xl bg-[#0c101c] border border-white/10 shadow-xl space-y-4">
              <h3 className="text-sm font-black text-white flex items-center gap-2">
                <Zap className="w-4 h-4 text-rose-500" /> Tezkor Boshqaruv
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <button
                  onClick={() => {
                    setEditingAnime(null);
                    setIsAnimeModalOpen(true);
                  }}
                  className="flex items-center justify-center gap-2 p-3.5 rounded-2xl bg-gradient-to-r from-rose-600 to-rose-500 text-white font-black text-xs shadow-neon hover:scale-105 active:scale-95 transition-all"
                >
                  <Plus className="w-4 h-4" /> Yangi Anime Qo'shish
                </button>

                <button
                  onClick={() => setActiveTab("episodes")}
                  className="flex items-center justify-center gap-2 p-3.5 rounded-2xl bg-white/5 hover:bg-white/10 text-white font-bold text-xs border border-white/10 hover:scale-105 active:scale-95 transition-all"
                >
                  <Upload className="w-4 h-4 text-cyan-400" /> Qism Yuklash Studio
                </button>

                <button
                  onClick={() => setActiveTab("settings")}
                  className="flex items-center justify-center gap-2 p-3.5 rounded-2xl bg-white/5 hover:bg-white/10 text-white font-bold text-xs border border-white/10 hover:scale-105 active:scale-95 transition-all"
                >
                  <Settings className="w-4 h-4 text-amber-400" /> Platforma Sozlamalari
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 2: ANIMES CATALOG & JIKAN IMPORT */}
        {/* ========================================================= */}
        {activeTab === "animes" && (
          <div className="space-y-6 animate-fade-in">
            {/* New Anime Action Bar: Collapsible Multi-API & Manual Add */}
            <div className="rounded-3xl bg-[#0c101c] border border-rose-900/30 overflow-hidden shadow-xl">
              <button
                type="button"
                onClick={() => setIsNewAnimeOpen(!isNewAnimeOpen)}
                className="w-full p-4 sm:p-5 flex items-center justify-between gap-3 text-left hover:bg-white/[0.02] transition-colors"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center shrink-0 border border-rose-500/30">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs sm:text-sm font-black text-white flex items-center gap-2">
                      <span>Yangi Anime Qo&apos;shish</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-600/20 text-rose-300 font-normal hidden sm:inline">
                        Multi-API yoki Qo&apos;lda
                      </span>
                    </h3>
                    <p className="text-[10px] sm:text-xs text-slate-400 truncate">
                      Shikimori, Kitsu, MAL bazalaridan qidirish yoki qo&apos;lda kiritish
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs font-bold text-rose-400 hidden sm:inline">
                    {isNewAnimeOpen ? "Yopish" : "Ochish"}
                  </span>
                  <div className={`p-1.5 rounded-xl bg-white/5 text-slate-300 transition-transform duration-200 ${isNewAnimeOpen ? "rotate-180" : ""}`}>
                    <ChevronDown className="w-4 h-4" />
                  </div>
                </div>
              </button>

              {/* Collapsible Content */}
              {isNewAnimeOpen && (
                <div className="p-4 sm:p-6 pt-0 border-t border-white/5 space-y-4 animate-in fade-in slide-in-from-top-2">
                  <form onSubmit={handleJikanSearch} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-3">
                    <div className="relative flex-1">
                      <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        placeholder="Anime nomi (Inglizcha, Ruscha, Yaponcha, O'zbekcha)... masalan: Naruto, Solo Leveling"
                        value={jikanQuery}
                        onChange={(e) => setJikanQuery(e.target.value)}
                        className="w-full bg-[#111626] border border-white/10 rounded-2xl pl-9 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:border-rose-500 focus:outline-none"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="submit"
                        disabled={isJikanSearching}
                        className="flex-1 sm:flex-initial px-5 py-2.5 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white font-black text-xs shadow-neon transition-all flex items-center justify-center gap-1.5 shrink-0"
                      >
                        {isJikanSearching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
                        <span>Multi-API Qidirish</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setEditingAnime(null);
                          setAnimeFormData({
                            mal_id: 0,
                            title_uz: "",
                            title_en: "",
                            title_jp: "",
                            synopsis: "",
                            poster_url: "",
                            banner_url: "",
                            score: 8.5,
                            episodes_count: 12,
                            status: "ONGOING",
                            season: "Kuz",
                            year: 2026,
                            telegram_url: "",
                            genres: ["Shounen"],
                          });
                          setCandidatePosters([]);
                          setShowPosterUrlInput(false);
                          setShowBannerUrlInput(false);
                          setIsAnimeModalOpen(true);
                        }}
                        className="flex-1 sm:flex-initial px-4 py-2.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/15 text-white font-bold text-xs transition-all flex items-center justify-center gap-1.5 shrink-0"
                      >
                        <Plus className="w-3.5 h-3.5 text-rose-400" />
                        <span>Qo&apos;lda Qo&apos;shish</span>
                      </button>
                    </div>
                  </form>

                  {/* Jikan / Multi-API Results Preview */}
                  {jikanResults.length > 0 && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3 pt-2 max-h-[380px] overflow-y-auto no-scrollbar">
                      {jikanResults.map((item, idx) => (
                        <div
                          key={idx}
                          className="group relative rounded-2xl bg-[#111626] border border-white/10 p-2 flex flex-col justify-between space-y-2 hover:border-rose-500 transition-all"
                        >
                          <div className="aspect-[3/4] w-full rounded-xl overflow-hidden bg-black relative">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={item.poster_url || item.images?.jpg?.large_image_url}
                              alt={item.title}
                              className="w-full h-full object-cover"
                            />
                            {item.source && (
                              <div className="absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded-lg text-[8px] font-black bg-black/80 backdrop-blur-md text-rose-300 border border-white/10 shadow">
                                {item.source}
                              </div>
                            )}
                          </div>
                          <div className="space-y-0.5">
                            <h4 className="font-bold text-[11px] text-white line-clamp-1">{item.title}</h4>
                            <div className="flex items-center justify-between text-[10px] text-slate-400">
                              <span>⭐ {item.score || "N/A"}</span>
                              <span>{item.episodes_count || item.episodes || "?"} qism</span>
                            </div>
                          </div>
                          <button
                            onClick={() => handleImportJikan(item)}
                            className="w-full py-1.5 rounded-xl bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white font-black text-[10px] border border-rose-500/30 transition-all"
                          >
                            + Import Qilish
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Existing Anime List Controls & Filters */}
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="relative w-full sm:w-80">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Mavjud animelardan qidirish..."
                    value={animeSearchQuery}
                    onChange={(e) => {
                      setAnimeSearchQuery(e.target.value);
                      setAnimeDisplayLimit(36);
                    }}
                    className="w-full bg-[#111626] border border-white/10 rounded-2xl pl-9 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:border-rose-500 focus:outline-none"
                  />
                </div>

                <div className="hidden sm:block">
                  <button
                    onClick={() => {
                      setEditingAnime(null);
                      setAnimeFormData({
                        mal_id: 0,
                        title_uz: "",
                        title_en: "",
                        title_jp: "",
                        synopsis: "",
                        poster_url: "",
                        banner_url: "",
                        score: 8.5,
                        episodes_count: 12,
                        status: "ONGOING",
                        season: "Kuz",
                        year: 2026,
                        telegram_url: "",
                        genres: ["Shounen"],
                      });
                      setCandidatePosters([]);
                      setShowPosterUrlInput(false);
                      setShowBannerUrlInput(false);
                      setIsAnimeModalOpen(true);
                    }}
                    className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-2xl bg-gradient-to-r from-rose-600 to-rose-500 text-white font-black text-xs shadow-neon hover:scale-105 active:scale-95 transition-all"
                  >
                    <Plus className="w-4 h-4" /> Qo&apos;lda Yangi Anime Qo&apos;shish
                  </button>
                </div>
              </div>

              {/* Filter Tabs: Barchasi, Qismi borlar, Arxiv */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                <button
                  type="button"
                  onClick={() => {
                    setAnimeFilterTab("all");
                    setAnimeDisplayLimit(36);
                  }}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                    animeFilterTab === "all"
                      ? "bg-rose-500 text-white shadow-sm"
                      : "bg-white/5 text-slate-400 hover:text-white border border-white/10"
                  }`}
                >
                  Barchasi ({animes.length})
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAnimeFilterTab("active");
                    setAnimeDisplayLimit(36);
                  }}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${
                    animeFilterTab === "active"
                      ? "bg-emerald-600 text-white shadow-sm"
                      : "bg-white/5 text-slate-400 hover:text-emerald-300 border border-white/10"
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  Qismi borlar ({animes.filter((a) => (a.current_episode || 0) > 0).length})
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAnimeFilterTab("archive");
                    setAnimeDisplayLimit(36);
                  }}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${
                    animeFilterTab === "archive"
                      ? "bg-amber-600 text-white shadow-sm"
                      : "bg-white/5 text-slate-400 hover:text-amber-300 border border-white/10"
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-amber-400" />
                  Arxiv ({animes.filter((a) => (a.current_episode || 0) === 0).length})
                </button>
              </div>
            </div>

            {/* Animes Grid (Mobile Friendly Cards) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredAnimes.slice(0, animeDisplayLimit).map((anime) => (
                <div
                  key={anime.id}
                  className="p-4 rounded-3xl bg-[#0c101c] border border-white/10 hover:border-rose-500/40 shadow-xl flex gap-3.5 transition-all"
                >
                  <div className="w-20 aspect-[3/4] rounded-2xl overflow-hidden bg-black shrink-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={anime.poster_url} alt={anime.title_uz} className="w-full h-full object-cover" />
                  </div>

                  <div className="flex-1 flex flex-col justify-between min-w-0">
                    <div className="space-y-1">
                      <div className="flex items-center justify-between gap-1">
                        <h4 className="font-bold text-xs text-white truncate">{anime.title_uz}</h4>
                        {anime.is_trending && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-rose-600 text-white shrink-0">
                            HOT
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-slate-400 truncate">{anime.title_en || anime.status}</p>
                      <div className="flex items-center gap-1.5 flex-wrap text-[10px] text-slate-300">
                        <span>⭐ {anime.score}</span>
                        <span>•</span>
                        {(anime.current_episode || 0) > 0 ? (
                          <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold">
                            ✨ {anime.current_episode} qism bor
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-300/90 border border-amber-500/30 font-medium">
                            📦 Arxiv ({anime.episodes_count || 0} qism)
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Actions: Ergonomic Touch Targets */}
                    <div className="flex flex-col gap-2 pt-2 border-t border-white/5">
                      {/* Primary Action: Add Episode */}
                      <button
                        onClick={() => {
                          setSelectedAnimeId(anime.id);
                          setActiveTab("episodes");
                        }}
                        title="Qism qo'shish"
                        className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400 text-white font-black text-xs shadow-neon transition-all flex items-center justify-center gap-1.5 active:scale-95"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>+ Qism Qo&apos;shish</span>
                      </button>

                      {/* Secondary Actions: Trend, Edit, Delete (Comfortable 38-40px touch targets) */}
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleToggleTrending(anime.id)}
                          title="Trendni almashtirish"
                          className={`flex-1 py-2 rounded-xl border font-bold text-xs flex items-center justify-center gap-1.5 transition-all active:scale-95 ${
                            anime.is_trending
                              ? "bg-rose-600/30 text-rose-300 border-rose-500/50"
                              : "bg-white/5 text-slate-400 border-white/10 hover:text-white"
                          }`}
                        >
                          <Flame className="w-3.5 h-3.5 text-orange-400" />
                          <span className="text-[11px]">{anime.is_trending ? "HOT" : "Oddiy"}</span>
                        </button>

                        <button
                          onClick={() => {
                            setEditingAnime(anime);
                            setAnimeFormData({
                              mal_id: anime.mal_id || 0,
                              title_uz: anime.title_uz,
                              title_en: anime.title_en,
                              title_jp: anime.title_jp,
                              synopsis: anime.synopsis,
                              poster_url: anime.poster_url,
                              banner_url: anime.banner_url,
                              score: anime.score,
                              episodes_count: anime.episodes_count,
                              status: anime.status,
                              season: anime.season,
                              year: anime.year,
                              telegram_url: anime.telegram_url || anime.studio || "",
                              genres: anime.genres || [],
                            });
                            setCandidatePosters([]);
                            setShowPosterUrlInput(false);
                            setShowBannerUrlInput(false);
                            setIsAnimeModalOpen(true);
                          }}
                          title="Tahrirlash"
                          className="flex-1 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 font-bold text-xs flex items-center justify-center gap-1.5 transition-all active:scale-95"
                        >
                          <Edit className="w-3.5 h-3.5 text-indigo-400" />
                          <span className="text-[11px]">Tahrir</span>
                        </button>

                        {isSuperAdmin && (
                          <button
                            onClick={() => handleDeleteAnime(anime)}
                            disabled={Boolean(anime.current_episode && anime.current_episode > 0)}
                            title={
                              anime.current_episode && anime.current_episode > 0
                                ? `🔒 Ushbu animeda ${anime.current_episode} ta qism mavjud. Avval qismlarni o'chiring!`
                                : "Animeni o'chirish"
                            }
                            className={`p-2 rounded-xl border transition-all active:scale-95 shrink-0 ${
                              anime.current_episode && anime.current_episode > 0
                                ? "bg-slate-800/30 text-slate-600 border-white/5 cursor-not-allowed opacity-40"
                                : "bg-red-500/10 hover:bg-red-500/20 text-red-400 border-red-500/20 cursor-pointer"
                            }`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Load More Button if needed */}
            {filteredAnimes.length > animeDisplayLimit && (
              <div className="text-center pt-4">
                <button
                  type="button"
                  onClick={() => setAnimeDisplayLimit((prev) => prev + 36)}
                  className="px-6 py-2.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-slate-300 hover:text-white transition-all shadow-md"
                >
                  Yana 36 ta anime ko&apos;rsatish ({animeDisplayLimit} / {filteredAnimes.length})
                </button>
              </div>
            )}
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 3: EPISODES UPLOAD STUDIO */}
        {/* ========================================================= */}
        {activeTab === "episodes" && (
          <div className="space-y-6 animate-fade-in">
            {/* STAGED / UNLINKED B2 VIDEOS RECOVERY CARD */}
            {stagedVideos.length > 0 && (
              <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-r from-amber-950/40 via-[#0f172a] to-cyan-950/40 border border-amber-500/30 shadow-[0_0_30px_rgba(245,158,11,0.15)] space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
                      <HardDrive className="w-5 h-5 animate-pulse" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm sm:text-base font-black text-white">
                          ☁️ B2 Bulutida Saqlanib Qolgan Videolar
                        </h3>
                        <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-extrabold">
                          {stagedVideos.length} ta fayl
                        </span>
                      </div>
                      <p className="text-xs text-slate-300 font-medium mt-0.5">
                        Siz yuklagan fayl B2 xotirasida mavjud! Qaytadan yuklamasdan 1 ta tugma bilan qismga biriktiring yoki keraksiz bo&apos;lsa o&apos;chiring.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={fetchStagedVideos}
                    disabled={isLoadingStagedVideos}
                    className="self-end sm:self-center px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-slate-300 hover:text-white transition-all flex items-center gap-1.5"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isLoadingStagedVideos ? "animate-spin" : ""}`} />
                    <span>Yangilash</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {stagedVideos.map((video) => {
                    const rawName = video.file_name.split("/").pop() || video.file_name;
                    const isCurrentAttached = uploadedB2Key === video.file_name;
                    return (
                      <div
                        key={video.file_id}
                        className={`p-3.5 rounded-2xl border transition-all flex flex-col justify-between gap-3 ${
                          isCurrentAttached
                            ? "bg-emerald-500/10 border-emerald-500/40 shadow-[0_0_20px_rgba(16,185,129,0.2)]"
                            : "bg-[#0c101c]/80 border-white/10 hover:border-amber-500/30"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 shrink-0">
                              <Video className="w-4 h-4" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-black text-white truncate max-w-[200px] sm:max-w-[260px]" title={video.file_name}>
                                {rawName}
                              </p>
                              <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                                <span className="font-mono text-cyan-300 font-bold">{video.formatted_size}</span>
                                <span>•</span>
                                <span>{new Date(video.upload_timestamp).toLocaleString("uz-UZ")}</span>
                              </div>
                            </div>
                          </div>
                          {isCurrentAttached && (
                            <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-black shrink-0">
                              ✓ Biriktirilgan
                            </span>
                          )}
                        </div>

                        <div className="flex items-center justify-end gap-2 pt-1 border-t border-white/5">
                          <button
                            type="button"
                            onClick={() => handleDeleteStagedVideo(video.file_id, video.file_name)}
                            className="px-2.5 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-400 text-[11px] font-bold transition-all flex items-center gap-1"
                            title="B2 xotirasidan o'chirish"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>O&apos;chirish</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleAttachStagedVideo(video)}
                            disabled={isCurrentAttached}
                            className={`px-3.5 py-1.5 rounded-xl text-[11px] font-black transition-all flex items-center gap-1.5 ${
                              isCurrentAttached
                                ? "bg-emerald-500 text-white cursor-default"
                                : "bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-neon"
                            }`}
                          >
                            <Zap className="w-3.5 h-3.5" />
                            <span>{isCurrentAttached ? "Formada Faol" : "⚡ Biriktirish"}</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Upload Studio Form Card */}
            <div className="p-5 sm:p-7 rounded-3xl bg-[#0c101c] border border-rose-900/30 shadow-2xl space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-2xl bg-rose-600/20 text-rose-500 border border-rose-500/30">
                    <Upload className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-white">Epizod (Qism) Yuklash Studio</h3>
                    <p className="text-xs text-slate-400 font-medium">
                      3 xil usulda qism yuklang: Video URL havola, Qismasdan to'g'ridan-to'g'ri B2 ga, yoki FFmpeg siqish bilan
                    </p>
                  </div>
                </div>

                {/* Mode Selector Tabs */}
                <div className="flex items-center p-1 rounded-2xl bg-[#111728] border border-white/10">
                  <button
                    onClick={() => setUploadMode("url")}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                      uploadMode === "url" ? "bg-rose-600 text-white shadow-neon" : "text-slate-400 hover:text-white"
                    }`}
                  >
                    <Link2 className="w-3.5 h-3.5" />
                    <span>Video URL</span>
                  </button>

                  <button
                    onClick={() => setUploadMode("direct")}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                      uploadMode === "direct" ? "bg-cyan-500 text-white shadow-[0_0_15px_rgba(6,182,212,0.4)]" : "text-slate-400 hover:text-white"
                    }`}
                  >
                    <Zap className="w-3.5 h-3.5" />
                    <span>To'g'ridan-to'g'ri B2 (Qismasdan)</span>
                  </button>

                  <button
                    onClick={() => setUploadMode("compress")}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                      uploadMode === "compress" ? "bg-amber-500 text-white shadow-neon" : "text-slate-400 hover:text-white"
                    }`}
                  >
                    <Sliders className="w-3.5 h-3.5" />
                    <span>FFmpeg Siqish</span>
                  </button>
                </div>
              </div>

              {/* Upload Form */}
              <form onSubmit={handleEpisodeSubmit} className="space-y-5">
                {/* 1. TOP ELEMENT: DRAG & DROP / ACTIVE UPLOAD CARD FOR DIRECT OR COMPRESS MODE */}
                {(uploadMode === "direct" || uploadMode === "compress") && (
                  <div className="space-y-3">
                    <input
                      type="file"
                      ref={fileInputRef}
                      accept="video/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleVideoFileSelect(file);
                      }}
                    />

                    {!videoFileInfo ? (
                      <div
                        onDragOver={(e) => {
                          e.preventDefault();
                          setIsDraggingVideo(true);
                        }}
                        onDragLeave={() => setIsDraggingVideo(false)}
                        onDrop={(e) => {
                          e.preventDefault();
                          setIsDraggingVideo(false);
                          const file = e.dataTransfer.files?.[0];
                          if (file) handleVideoFileSelect(file);
                        }}
                        onClick={() => fileInputRef.current?.click()}
                        className={`relative group cursor-pointer border-2 border-dashed rounded-3xl p-7 sm:p-10 transition-all duration-300 text-center flex flex-col items-center justify-center gap-3 overflow-hidden ${
                          isDraggingVideo
                            ? "border-cyan-400 bg-cyan-500/10 scale-[1.01] shadow-[0_0_30px_rgba(6,182,212,0.25)]"
                            : "border-white/15 bg-[#0a0f1d]/80 hover:border-cyan-500/50 hover:bg-[#0e1529]"
                        }`}
                      >
                        <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 group-hover:scale-110 group-hover:bg-cyan-500/20 transition-all">
                          <UploadCloud className="w-8 h-8 animate-pulse" />
                        </div>
                        <div>
                          <h4 className="text-sm sm:text-base font-black text-white">
                            Videoni bu yerga tashlang yoki faylni tanlang
                          </h4>
                          <p className="text-xs text-slate-400 mt-1 max-w-md">
                            MP4, MKV, MOV — fayl tanlanishi bilan darhol orqa fonda B2 bulutiga yuklash boshlanadi. Qism raqami fayl nomidan avtomatik aniqlanadi.
                          </p>
                        </div>
                        <div className="flex flex-wrap items-center justify-center gap-2 mt-2">
                          <span className="px-3 py-1 rounded-lg bg-white/5 border border-white/10 text-[11px] font-semibold text-slate-300 flex items-center gap-1">
                            <Zap className="w-3 h-3 text-cyan-400" /> Tezkor yuklash
                          </span>
                          <span className="px-3 py-1 rounded-lg bg-white/5 border border-white/10 text-[11px] font-semibold text-slate-300 flex items-center gap-1">
                            <Search className="w-3 h-3 text-amber-400" /> Qism raqami avto-aniqlanadi
                          </span>
                          <span className="px-3 py-1 rounded-lg bg-white/5 border border-white/10 text-[11px] font-semibold text-slate-300 flex items-center gap-1">
                            <Clock className="w-3 h-3 text-rose-400" /> Navbatsiz orqa fonda
                          </span>
                        </div>
                      </div>
                    ) : (
                      /* Active Upload Card */
                      <div className="p-5 rounded-3xl bg-[#0a0f1d] border border-cyan-500/30 shadow-xl space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="flex items-center gap-3.5">
                            <div
                              className={`w-12 h-12 rounded-2xl flex items-center justify-center border ${
                                uploadedB2Key
                                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                                  : "bg-cyan-500/10 border-cyan-500/30 text-cyan-400"
                              }`}
                            >
                              {uploadedB2Key ? <CheckCircle2 className="w-6 h-6" /> : <Video className="w-6 h-6" />}
                            </div>
                            <div className="min-w-0">
                              <div className="text-xs sm:text-sm font-black text-white truncate max-w-[220px] sm:max-w-md">
                                {videoFileInfo.name}
                              </div>
                              <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                                <span className="font-mono">{videoFileInfo.size}</span>
                                <span>•</span>
                                {uploadedB2Key ? (
                                  <span className="text-emerald-400 font-bold flex items-center gap-1">
                                    <Check className="w-3.5 h-3.5" /> {uploadedB2Key.includes(".m3u8") ? "HLS (.m3u8) tayyor" : "B2 ga yuklandi"}
                                  </span>
                                ) : isUploading ? (
                                  <span className="text-cyan-400 font-bold flex items-center gap-1">
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> {uploadJob?.message || `Jarayonda (${uploadJob?.progress || 15}%)`}
                                  </span>
                                ) : uploadJob?.status === "failed" ? (
                                  <span className="text-rose-400 font-bold flex items-center gap-1">
                                    <AlertCircle className="w-3.5 h-3.5" /> Xatolik yuz berdi
                                  </span>
                                ) : (
                                  <span className="text-slate-400 font-bold">Fayl tanlandi</span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 self-end sm:self-center">
                            <button
                              type="button"
                              onClick={() => fileInputRef.current?.click()}
                              className="px-3.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-slate-300 hover:text-white transition-all flex items-center gap-1.5"
                            >
                              <RefreshCw className="w-3.5 h-3.5" />
                              <span>Faylni almashtirish</span>
                            </button>
                            {uploadedB2Key && (
                              <button
                                type="button"
                                onClick={() => {
                                  if (confirm("Ushbu videoni formadan chiqarib tashlashni tasdiqlaysizmi? (B2 bulutidagi fayl saqlanib qoladi)")) {
                                    setUploadedB2Key("");
                                    setVideoFileInfo(null);
                                    setUploadFile(null);
                                    setUploadJob(null);
                                    try {
                                      localStorage.removeItem("hikaku_upload_draft");
                                    } catch (e) {}
                                    fetchStagedVideos();
                                  }
                                }}
                                className="px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-xs font-bold text-rose-400 hover:text-rose-300 transition-all flex items-center gap-1.5"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>Formadan olish</span>
                              </button>
                            )}
                          </div>
                        </div>

                        {/* 4-Step Cyber-Glass Pipeline */}
                        <div className="space-y-3 p-3.5 rounded-xl bg-black/40 border border-white/10 backdrop-blur-md">
                          {/* Step Indicators */}
                          <div className="grid grid-cols-4 gap-2 text-[10px] font-bold">
                            {/* Step 1: Qabul qilindi */}
                            <div className={`flex flex-col items-center gap-1 text-center p-2 rounded-lg border transition-all ${
                              (uploadJob?.progress || 0) >= 5
                                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                                : "bg-white/5 border-white/5 text-slate-500"
                            }`}>
                              <div className="flex items-center gap-1">
                                <Check className="w-3 h-3" />
                                <span className="truncate">1. Qabul</span>
                              </div>
                              <span className="text-[9px] opacity-75 font-normal">Serverda</span>
                            </div>

                            {/* Step 2: Navbat / FFmpeg */}
                            <div className={`flex flex-col items-center gap-1 text-center p-2 rounded-lg border transition-all ${
                              uploadJob?.status === "queued"
                                ? "bg-amber-500/10 border-amber-500/40 text-amber-400 animate-pulse"
                                : uploadJob?.status === "transcoding"
                                ? "bg-cyan-500/10 border-cyan-500/40 text-cyan-400"
                                : (uploadJob?.progress || 0) >= 70
                                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                                : "bg-white/5 border-white/5 text-slate-500"
                            }`}>
                              <div className="flex items-center gap-1">
                                {uploadJob?.status === "queued" ? (
                                  <Clock className="w-3 h-3 animate-spin" />
                                ) : uploadJob?.status === "transcoding" ? (
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                ) : (uploadJob?.progress || 0) >= 70 ? (
                                  <Check className="w-3 h-3" />
                                ) : (
                                  <Cpu className="w-3 h-3" />
                                )}
                                <span className="truncate">2. Navbat/Siqish</span>
                              </div>
                              <span className="text-[9px] opacity-75 font-normal">
                                {uploadJob?.status === "queued" ? "Navbatda (#1)" : uploadJob?.status === "transcoding" ? "FFmpeg 2-Core" : (uploadJob?.progress || 0) >= 70 ? "Yakunlandi" : "Kutilmoqda"}
                              </span>
                            </div>

                            {/* Step 3: B2 Bulut */}
                            <div className={`flex flex-col items-center gap-1 text-center p-2 rounded-lg border transition-all ${
                              uploadJob?.status === "uploading_b2"
                                ? "bg-blue-500/10 border-blue-500/40 text-blue-400 animate-pulse"
                                : (uploadJob?.progress || 0) >= 100 || uploadedB2Key
                                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                                : "bg-white/5 border-white/5 text-slate-500"
                            }`}>
                              <div className="flex items-center gap-1">
                                {uploadJob?.status === "uploading_b2" ? (
                                  <UploadCloud className="w-3 h-3 animate-bounce" />
                                ) : (uploadJob?.progress || 0) >= 100 || uploadedB2Key ? (
                                  <Check className="w-3 h-3" />
                                ) : (
                                  <HardDrive className="w-3 h-3" />
                                )}
                                <span className="truncate">3. B2 Bulut</span>
                              </div>
                              <span className="text-[9px] opacity-75 font-normal">
                                {uploadJob?.status === "uploading_b2" ? "Yuklanmoqda" : (uploadJob?.progress || 0) >= 100 || uploadedB2Key ? "Saqlandi" : "Kutilmoqda"}
                              </span>
                            </div>

                            {/* Step 4: Tayyor */}
                            <div className={`flex flex-col items-center gap-1 text-center p-2 rounded-lg border transition-all ${
                              uploadedB2Key || uploadJob?.status === "completed"
                                ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.2)]"
                                : "bg-white/5 border-white/5 text-slate-500"
                            }`}>
                              <div className="flex items-center gap-1">
                                <Sparkles className="w-3 h-3" />
                                <span className="truncate">4. Tayyor</span>
                              </div>
                              <span className="text-[9px] opacity-75 font-normal">
                                {uploadedB2Key || uploadJob?.status === "completed" ? "Avto-saqlanadi" : "Kutilmoqda"}
                              </span>
                            </div>
                          </div>

                          {/* Progress Bar & Dynamic Message */}
                          <div className="space-y-1.5 pt-1">
                            <div className="flex items-center justify-between text-[11px] font-bold">
                              <span className="flex items-center gap-1.5 text-slate-200">
                                {uploadJob?.message || (uploadedB2Key ? "🎉 Backblaze B2 bulutiga to'liq yuklandi!" : "Yuklanmoqda...")}
                              </span>
                              <span className={uploadedB2Key ? "text-emerald-400 font-black" : "text-cyan-400 font-black"}>
                                {uploadedB2Key ? "100%" : `${uploadJob?.progress || 15}%`}
                              </span>
                            </div>
                            <div className="w-full h-2.5 bg-black/60 rounded-full overflow-hidden border border-white/5">
                              <div
                                className={`h-full transition-all duration-500 ${
                                  uploadedB2Key
                                    ? "bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]"
                                    : uploadJob?.status === "queued"
                                    ? "bg-amber-500 animate-pulse"
                                    : "bg-gradient-to-r from-cyan-500 via-blue-500 to-rose-500"
                                }`}
                                style={{ width: `${uploadedB2Key ? 100 : (uploadJob?.progress || 15)}%` }}
                              />
                            </div>
                          </div>
                        </div>

                        {uploadMode === "compress" && (
                          <div className="pt-2 border-t border-white/10 flex items-center justify-between">
                            <label className="text-xs font-bold text-slate-300">CRF Siqish Darajasi: {uploadCrf}</label>
                            <input
                              type="range"
                              min={20}
                              max={32}
                              value={uploadCrf}
                              onChange={(e) => setUploadCrf(Number(e.target.value))}
                              className="w-40 accent-rose-500"
                            />
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* 2. DIRECT VIDEO URL INPUT MODE */}
                {uploadMode === "url" && (
                  <div className="space-y-2 p-4 rounded-2xl bg-[#0a0f1d] border border-white/10">
                    <label className="text-xs font-bold text-slate-300 flex items-center gap-2">
                      <Link2 className="w-4 h-4 text-rose-500" />
                      To&apos;g&apos;ridan-to&apos;g&apos;ri Video Fayl Havolasi (URL) *
                    </label>
                    <input
                      type="url"
                      value={epDirectUrl}
                      onChange={(e) => setEpDirectUrl(e.target.value)}
                      placeholder="https://s3.us-east-005.backblazeb2.com/iskurama/... yoki cdn.hikaku.uz/..."
                      className="w-full bg-[#070a14] border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:border-rose-500 focus:outline-none font-mono"
                    />
                    <span className="text-[11px] text-slate-400 block">
                      💡 Faylni yuklab o&apos;tirmasdan, uning to&apos;g&apos;ridan-to&apos;g&apos;ri videosini 1 soniyada bazaga qo&apos;shishingiz mumkin.
                    </span>
                  </div>
                )}

                {/* 3. METADATA INPUTS: ANIME SELECT, EPISODE NUMBER, DUBLYAJ */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Select Anime with Pulse Animation if video is ready/uploading but anime not selected */}
                  <div className="space-y-1.5 sm:col-span-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                        Animeni Tanlang *
                      </label>
                      <div className="flex items-center gap-2">
                        {videoFileInfo && selectedAnimeId === 0 && (
                          <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-extrabold animate-pulse">
                            ⚡ Tanlanishi shart!
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            setEditingAnime(null);
                            setAnimeFormData({
                              mal_id: 0,
                              title_uz: "",
                              title_en: "",
                              title_jp: "",
                              synopsis: "",
                              poster_url: "",
                              banner_url: "",
                              score: 8.5,
                              episodes_count: 12,
                              status: "ONGOING",
                              season: "Kuz",
                              year: 2026,
                              telegram_url: "",
                              genres: ["Shounen", "Jangari"],
                            });
                            setIsAddingAnimeFromStudio(true);
                            setCandidatePosters([]);
                            setShowPosterUrlInput(false);
                            setShowBannerUrlInput(false);
                            setIsAnimeModalOpen(true);
                          }}
                          className="text-[11px] font-bold text-rose-400 hover:text-rose-300 flex items-center gap-1 bg-rose-500/10 hover:bg-rose-500/20 px-2.5 py-1 rounded-lg border border-rose-500/20 transition-all cursor-pointer"
                        >
                          <Plus className="w-3 h-3" />
                          <span>+ Yangi Anime Qo&apos;shish</span>
                        </button>
                      </div>
                    </div>
                    {/* Anime Combobox / Selector */}
                    {selectedAnimeId > 0 && animes.find((a) => a.id === selectedAnimeId) ? (
                      (() => {
                        const sel = animes.find((a) => a.id === selectedAnimeId)!;
                        return (
                          <div className="flex items-center justify-between p-3 rounded-2xl bg-[#111728] border border-rose-500/50 shadow-md">
                            <div className="flex items-center gap-3 min-w-0">
                              {sel.poster_url ? (
                                /* eslint-disable-next-line @next/next/no-img-element */
                                <img src={sel.poster_url} alt={sel.title_uz} className="w-10 h-12 object-cover rounded-xl shrink-0 bg-black/40" />
                              ) : (
                                <div className="w-10 h-12 rounded-xl bg-white/5 flex items-center justify-center shrink-0">
                                  <Film className="w-5 h-5 text-slate-400" />
                                </div>
                              )}
                              <div className="min-w-0">
                                <h4 className="text-xs font-bold text-white truncate">{sel.title_uz}</h4>
                                <div className="flex items-center gap-1.5 pt-0.5">
                                  {(sel.current_episode || 0) > 0 ? (
                                    <span className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1">
                                      <CheckCircle2 className="w-3 h-3" /> {sel.current_episode} ta yuklangan qism
                                    </span>
                                  ) : (
                                    <span className="text-[10px] text-amber-400 font-medium">
                                      📦 Arxiv (qismsiz)
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedAnimeId(0);
                                setIsAnimeComboboxOpen(true);
                              }}
                              className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-rose-500/20 text-slate-300 hover:text-rose-300 border border-white/10 text-[11px] font-bold transition-all shrink-0 ml-2"
                            >
                              Almashtirish
                            </button>
                          </div>
                        );
                      })()
                    ) : (
                      <div className="relative">
                        <div className="relative">
                          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                          <input
                            type="text"
                            placeholder="Anime nomini yozing yoki tanlang (356 ta anime)..."
                            value={animeComboboxQuery}
                            onFocus={() => setIsAnimeComboboxOpen(true)}
                            onChange={(e) => {
                              setAnimeComboboxQuery(e.target.value);
                              setIsAnimeComboboxOpen(true);
                            }}
                            className={`w-full bg-[#111728] border rounded-2xl pl-10 pr-10 py-2.5 text-xs text-white focus:outline-none transition-all ${
                              videoFileInfo && selectedAnimeId === 0
                                ? "border-amber-500 ring-2 ring-amber-500/40 shadow-[0_0_20px_rgba(245,158,11,0.25)]"
                                : "border-white/10 focus:border-rose-500"
                            }`}
                          />
                          {animeComboboxQuery && (
                            <button
                              type="button"
                              onClick={() => setAnimeComboboxQuery("")}
                              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-white"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>

                        {/* Dropdown list */}
                        {isAnimeComboboxOpen && (
                          <>
                            <div
                              className="fixed inset-0 z-20"
                              onClick={() => setIsAnimeComboboxOpen(false)}
                            />
                            <div className="absolute left-0 right-0 top-full mt-2 z-30 max-h-72 overflow-y-auto rounded-2xl bg-[#0e1322] border border-white/15 shadow-2xl divide-y divide-white/5">
                              {(() => {
                                const q = animeComboboxQuery.toLowerCase().trim();
                                const matches = animes
                                  .filter((a) => {
                                    if (!q) return true;
                                    return (
                                      a.title_uz.toLowerCase().includes(q) ||
                                      (a.title_en && a.title_en.toLowerCase().includes(q)) ||
                                      (a.slug && a.slug.toLowerCase().includes(q))
                                    );
                                  })
                                  .sort((a, b) => {
                                    if (!q) {
                                      const aActive = (a.current_episode || 0) > 0 ? 1 : 0;
                                      const bActive = (b.current_episode || 0) > 0 ? 1 : 0;
                                      if (aActive !== bActive) return bActive - aActive;
                                      return a.title_uz.localeCompare(b.title_uz);
                                    }
                                    return 0;
                                  });

                                if (matches.length === 0) {
                                  return (
                                    <div className="p-4 text-center text-xs text-slate-400">
                                      Anime topilmadi. Yuqoridagi &quot;+ Yangi Anime Qo&apos;shish&quot; tugmasi orqali qo&apos;shishingiz mumkin.
                                    </div>
                                  );
                                }

                                return matches.slice(0, 50).map((a) => (
                                  <button
                                    key={a.id}
                                    type="button"
                                    onClick={() => {
                                      setSelectedAnimeId(a.id);
                                      setIsAnimeComboboxOpen(false);
                                      setAnimeComboboxQuery("");
                                    }}
                                    className="w-full text-left p-2.5 hover:bg-rose-500/10 transition-colors flex items-center gap-3 group"
                                  >
                                    <div className="w-8 h-10 rounded-lg overflow-hidden bg-black/40 shrink-0">
                                      {a.poster_url ? (
                                        /* eslint-disable-next-line @next/next/no-img-element */
                                        <img src={a.poster_url} alt={a.title_uz} className="w-full h-full object-cover" />
                                      ) : (
                                        <div className="w-full h-full flex items-center justify-center text-[9px] text-slate-500">
                                          N/A
                                        </div>
                                      )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <div className="text-xs font-bold text-white truncate group-hover:text-rose-300">
                                        {a.title_uz}
                                      </div>
                                      <div className="text-[10px] text-slate-400 truncate">
                                        {a.title_en || a.status}
                                      </div>
                                    </div>
                                    <div className="shrink-0">
                                      {(a.current_episode || 0) > 0 ? (
                                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                          {a.current_episode} qism
                                        </span>
                                      ) : (
                                        <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-white/5 text-slate-400 border border-white/10">
                                          Arxiv
                                        </span>
                                      )}
                                    </div>
                                  </button>
                                ));
                              })()}
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Episode Number */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-300">Qism Raqami *</label>
                    <input
                      type="number"
                      min={1}
                      value={epNumber}
                      onChange={(e) => setEpNumber(Number(e.target.value))}
                      className="w-full bg-[#111728] border border-white/10 rounded-2xl px-4 py-2.5 text-xs text-white focus:border-rose-500 focus:outline-none"
                      required
                    />
                  </div>

                  {/* Dub Studio */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                      <Mic className="w-3.5 h-3.5 text-rose-500" />
                      <span>Dublyaj Studiyasi (Fandub) *</span>
                    </label>
                    <select
                      value={epFandubId}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setEpFandubId(val);
                        const found = fandubs.find((f) => f.id === val);
                        if (found) setEpDubStudio(found.name);
                      }}
                      className="w-full bg-[#111728] border border-white/10 rounded-2xl px-4 py-2.5 text-xs text-white focus:border-rose-500 focus:outline-none"
                    >
                      {fandubs.length > 0 ? (
                        fandubs.map((f) => (
                          <option key={f.id} value={f.id} className="bg-[#0e1320] text-white">
                            🎙️ {f.name}
                          </option>
                        ))
                      ) : (
                        <option value={1} className="bg-[#0e1320] text-white">
                          🎙️ Hikaku Dub
                        </option>
                      )}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Title */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-300">Qism Sarlavhasi (Ixtiyoriy)</label>
                    <input
                      type="text"
                      value={epTitle}
                      onChange={(e) => setEpTitle(e.target.value)}
                      placeholder={`${epNumber}-qism`}
                      className="w-full bg-[#111728] border border-white/10 rounded-2xl px-4 py-2.5 text-xs text-white focus:border-rose-500 focus:outline-none"
                    />
                  </div>

                  {/* VIP & Telegram Auto-Post Toggles */}
                  <div className="flex flex-wrap items-center gap-6 pt-6">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="epIsVIP"
                        checked={epIsVIP}
                        onChange={(e) => setEpIsVIP(e.target.checked)}
                        className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500 bg-[#111728] border-white/20 cursor-pointer"
                      />
                      <label htmlFor="epIsVIP" className="text-xs font-bold text-amber-300 flex items-center gap-1.5 cursor-pointer">
                        <Crown className="w-4 h-4 fill-amber-400" /> Faqat VIP (Pullik)
                      </label>
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="postToTelegram"
                        checked={postToTelegram}
                        onChange={(e) => setPostToTelegram(e.target.checked)}
                        className="w-4 h-4 rounded text-sky-500 focus:ring-sky-500 bg-[#111728] border-white/20 cursor-pointer"
                      />
                      <label htmlFor="postToTelegram" className="text-xs font-bold text-sky-400 flex items-center gap-1.5 cursor-pointer">
                        <Send className="w-3.5 h-3.5 text-sky-400" /> @hikakuz kanaliga e'lon yuborish
                      </label>
                    </div>
                  </div>
                </div>

                {/* 4. SMART SUBMIT BUTTON */}
                <button
                  type="submit"
                  disabled={isUploading || isSavingPending}
                  className={`w-full sm:w-auto px-8 py-3.5 rounded-2xl font-black text-xs sm:text-sm shadow-neon transition-all flex items-center justify-center gap-2 disabled:opacity-75 ${
                    isSavingPending || isUploading
                      ? "bg-slate-800 border border-cyan-500/40 text-cyan-300 cursor-wait shadow-[0_0_20px_rgba(6,182,212,0.25)]"
                      : uploadedB2Key
                      ? "bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-[0_0_25px_rgba(16,185,129,0.35)]"
                      : "bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-600 text-white"
                  }`}
                >
                  {isSavingPending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>⏳ Bazaga saqlanmoqda...</span>
                    </>
                  ) : isUploading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
                      <span>{uploadJob?.message || `Jarayon bajarilmoqda (${uploadJob?.progress || 15}%)...`}</span>
                    </>
                  ) : uploadedB2Key ? (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Epizodni Saqlash (Tayyor)</span>
                    </>
                  ) : uploadMode === "url" ? (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Epizodni Qo'shish (URL)</span>
                    </>
                  ) : (
                    <>
                      <UploadCloud className="w-4 h-4" />
                      <span>Videoni Yuklash & Saqlash</span>
                    </>
                  )}
                </button>
              </form>
            </div>

            {/* Existing Episodes List Table / Card View */}
            <div className="p-5 sm:p-7 rounded-3xl bg-[#0c101c] border border-white/10 shadow-xl space-y-5">
              <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
                <div>
                  <h3 className="text-sm font-black text-white flex items-center gap-2">
                    <Film className="w-4 h-4 text-cyan-400" />
                    Yuklangan Epizodlar ({episodes.filter((ep) => {
                      if (episodeFilterAnime !== "all" && ep.anime_id !== episodeFilterAnime) return false;
                      if (episodeFilterFandub !== "all" && (ep.fandub_id || 1) !== episodeFilterFandub) return false;
                      if (episodeSearchQuery.trim()) {
                        const q = episodeSearchQuery.toLowerCase();
                        const matchTitle = ep.title.toLowerCase().includes(q);
                        const matchNum = ep.episode_number.toString().includes(q);
                        const matchAnime = (ep.anime_title || "").toLowerCase().includes(q);
                        if (!matchTitle && !matchNum && !matchAnime) return false;
                      }
                      return true;
                    }).length} / {episodes.length})
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Har bir qismni studiya yoki anime bo&apos;yicha saralash, tahrirlash yoki o&apos;chirish
                  </p>
                </div>

                {/* Filters */}
                <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto">
                  {/* Search */}
                  <div className="relative flex-1 min-w-[160px] sm:w-48">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Qism qidirish..."
                      value={episodeSearchQuery}
                      onChange={(e) => setEpisodeSearchQuery(e.target.value)}
                      className="w-full pl-8 pr-3 py-2 bg-[#111728] border border-white/10 rounded-xl text-xs text-white placeholder-slate-500 focus:border-cyan-500/50 outline-none transition-all"
                    />
                  </div>

                  {/* Studio / Fandub Filter Dropdown */}
                  <select
                    value={episodeFilterFandub}
                    onChange={(e) => setEpisodeFilterFandub(e.target.value === "all" ? "all" : Number(e.target.value))}
                    className="bg-[#111728] border border-white/10 rounded-xl px-3 py-2 text-xs text-indigo-300 font-semibold focus:border-indigo-500/50 outline-none max-w-[170px] truncate"
                  >
                    <option value="all">Barcha Studiyalar</option>
                    {fandubs.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.name}
                      </option>
                    ))}
                  </select>

                  {/* Anime Filter Dropdown */}
                  <select
                    value={episodeFilterAnime}
                    onChange={(e) => setEpisodeFilterAnime(e.target.value === "all" ? "all" : Number(e.target.value))}
                    className="bg-[#111728] border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-300 focus:border-cyan-500/50 outline-none max-w-[190px] truncate"
                  >
                    <option value="all">Barcha Animelar</option>
                    {animes.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.title_uz}
                      </option>
                    ))}
                  </select>

                  {(episodeFilterAnime !== "all" || episodeFilterFandub !== "all" || episodeSearchQuery) && (
                    <button
                      type="button"
                      onClick={() => {
                        setEpisodeFilterAnime("all");
                        setEpisodeFilterFandub("all");
                        setEpisodeSearchQuery("");
                      }}
                      className="px-2.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white text-xs font-bold transition-all"
                      title="Filtrlarni tozalash"
                    >
                      Tozalash
                    </button>
                  )}
                </div>
              </div>

              {episodes.filter((ep) => {
                if (episodeFilterAnime !== "all" && ep.anime_id !== episodeFilterAnime) return false;
                if (episodeFilterFandub !== "all" && (ep.fandub_id || 1) !== episodeFilterFandub) return false;
                if (episodeSearchQuery.trim()) {
                  const q = episodeSearchQuery.toLowerCase();
                  const matchTitle = ep.title.toLowerCase().includes(q);
                  const matchNum = ep.episode_number.toString().includes(q);
                  const matchAnime = (ep.anime_title || "").toLowerCase().includes(q);
                  if (!matchTitle && !matchNum && !matchAnime) return false;
                }
                return true;
              }).length === 0 ? (
                <div className="py-14 text-center space-y-2">
                  <Film className="w-8 h-8 text-slate-600 mx-auto" />
                  <p className="text-slate-400 text-xs font-semibold">Birorta ham mos keladigan epizod topilmadi.</p>
                  <p className="text-[11px] text-slate-600">Qidiruv yoki filtrlarni o&apos;zgartirib ko&apos;ring</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3.5 max-h-[640px] overflow-y-auto no-scrollbar pr-1">
                  {episodes.filter((ep) => {
                    if (episodeFilterAnime !== "all" && ep.anime_id !== episodeFilterAnime) return false;
                    if (episodeFilterFandub !== "all" && (ep.fandub_id || 1) !== episodeFilterFandub) return false;
                    if (episodeSearchQuery.trim()) {
                      const q = episodeSearchQuery.toLowerCase();
                      const matchTitle = ep.title.toLowerCase().includes(q);
                      const matchNum = ep.episode_number.toString().includes(q);
                      const matchAnime = (ep.anime_title || "").toLowerCase().includes(q);
                      if (!matchTitle && !matchNum && !matchAnime) return false;
                    }
                    return true;
                  }).map((ep) => {
                    const anime = animes.find((a) => a.id === ep.anime_id);
                    const studio = fandubs.find((f) => f.id === ep.fandub_id) || fandubs.find((f) => f.id === (ep.fandub_id || 1));
                    const studioDisplayName = ep.fandub_name || studio?.name || "Hikaku Dub";
                    const posterSrc = ep.thumbnail_url || anime?.poster_url;

                    return (
                      <div
                        key={ep.id}
                        className="group p-4 rounded-2xl bg-[#111728]/90 hover:bg-[#131b32] border border-white/5 hover:border-cyan-500/30 transition-all duration-200 flex flex-col justify-between gap-3 shadow-md hover:shadow-cyan-500/5"
                      >
                        <div className="flex items-start gap-3 min-w-0">
                          {/* Anime Poster Thumbnail */}
                          <div className="w-14 h-18 rounded-xl overflow-hidden bg-black/50 border border-white/10 shrink-0 relative flex items-center justify-center">
                            {posterSrc ? (
                              <img
                                src={posterSrc}
                                alt={ep.title}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).src = "/placeholder-poster.png";
                                }}
                              />
                            ) : (
                              <Film className="w-5 h-5 text-slate-600" />
                            )}
                            <div className="absolute bottom-0 inset-x-0 bg-black/70 py-0.5 text-center">
                              <span className="text-[9px] font-black text-white font-mono">
                                #{ep.episode_number}
                              </span>
                            </div>
                          </div>

                          {/* Episode Details */}
                          <div className="min-w-0 flex-1 space-y-1.5">
                            <div className="flex items-center justify-between gap-1 flex-wrap">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="px-2 py-0.5 rounded-lg bg-rose-600/20 text-rose-400 font-bold text-[10px] border border-rose-500/20">
                                  EP {ep.episode_number}
                                </span>
                                {ep.is_vip_only ? (
                                  <span className="px-1.5 py-0.5 rounded-lg text-[9px] font-bold bg-amber-400/20 text-amber-300 flex items-center gap-1 border border-amber-400/30">
                                    <Crown className="w-2.5 h-2.5 fill-amber-400" /> VIP
                                  </span>
                                ) : (
                                  <span className="px-1.5 py-0.5 rounded-lg text-[9px] font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
                                    Bepul
                                  </span>
                                )}
                              </div>
                              <span className="text-[10px] text-slate-500 font-mono">ID:{ep.id}</span>
                            </div>

                            <h5 className="font-bold text-xs text-white truncate group-hover:text-cyan-400 transition-colors" title={ep.title}>
                              {ep.title}
                            </h5>

                            <p className="text-[11px] text-slate-400 truncate flex items-center gap-1" title={anime?.title_uz || ep.anime_title}>
                              <span>🎬</span>
                              <span className="truncate">{anime?.title_uz || ep.anime_title || `Anime #${ep.anime_id}`}</span>
                            </p>

                            {/* Studio Badge */}
                            <div className="pt-0.5">
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-indigo-500/15 border border-indigo-500/25 text-indigo-300 text-[10px] font-bold truncate max-w-full">
                                <Mic className="w-2.5 h-2.5 text-indigo-400 shrink-0" />
                                <span className="truncate">{studioDisplayName}</span>
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Stream URL / B2 Key snippet with Copy button */}
                        <div className="flex items-center gap-1.5 bg-black/40 rounded-xl px-2.5 py-1.5 border border-white/5 text-xs">
                          <span className="text-[10px] text-slate-400 font-mono truncate flex-1 select-all">
                            {ep.video_url || ep.b2_key || "stream/ep"}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCopyLink(ep.video_url || ep.b2_key || "", ep.id)}
                            title="Havolani nusxalash"
                            className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 shrink-0 transition-colors"
                          >
                            {copiedEpId === ep.id ? (
                              <Check className="w-3 h-3 text-emerald-400" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>
                        </div>

                        {/* Action buttons */}
                        <div className="flex items-center justify-between pt-2 border-t border-white/5">
                          <div className="flex items-center gap-1">
                            {ep.has_uzbek_dub && (
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                                Dublyaj
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleOpenEditEpisode(ep)}
                              className="px-2.5 py-1 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/20 text-[11px] font-bold flex items-center gap-1.5 transition-colors"
                            >
                              <Pencil className="w-3 h-3" />
                              <span>Tahrirlash</span>
                            </button>
                            {isSuperAdmin && (
                              <button
                                type="button"
                                onClick={() => handleDeleteEpisode(ep.id)}
                                className="p-1.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 transition-colors"
                                title="O'chirish"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 4: USERS & VIP */}
        {/* ========================================================= */}
        {activeTab === "users" && (
          <div className="space-y-6 animate-fade-in">
            <div className="p-5 sm:p-7 rounded-3xl bg-[#0c101c] border border-white/10 shadow-xl space-y-4">
              <h3 className="text-sm font-black text-white">Foydalanuvchilar va VIP Boshqaruvi ({usersList.length})</h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[600px] overflow-y-auto no-scrollbar">
                {usersList.map((u, i) => (
                  <div
                    key={i}
                    className="p-4 rounded-2xl bg-[#111728] border border-white/5 flex flex-col justify-between space-y-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-rose-600/20 text-rose-400 flex items-center justify-center font-bold text-sm shrink-0">
                        {u.full_name?.[0] || u.username?.[0] || "U"}
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-bold text-xs text-white truncate">
                          {u.full_name || u.username || `User #${u.id}`}
                        </h4>
                        <span className="text-[10px] text-slate-400 block font-mono">
                          TG ID: {u.telegram_id || "Web / Google"}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-white/5 text-[11px]">
                      <span className={`px-2 py-0.5 rounded-lg font-bold flex items-center gap-1 ${
                        u.is_vip
                          ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                          : "bg-white/5 text-slate-400"
                      }`}>
                        {u.is_vip ? <Crown className="w-3 h-3 fill-amber-400" /> : null}
                        {u.is_vip ? "VIP Faol" : "Oddiy Obunachi"}
                      </span>

                      <div className="flex items-center gap-1.5">
                        {u.is_vip ? (
                          <button
                            onClick={() => handleRevokeVIP(u.id)}
                            className="px-2.5 py-1 rounded-lg bg-red-500/20 hover:bg-red-500 text-red-300 hover:text-white font-bold text-[10px] transition-all"
                          >
                            Bekor Qilish
                          </button>
                        ) : (
                          <button
                            onClick={() => handleGrantVIP(u.id, 30)}
                            className="px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500 text-amber-300 hover:text-white font-bold text-[10px] transition-all"
                          >
                            +30 Kun VIP
                          </button>
                        )}
                        {isSuperAdmin && u.telegram_id && (
                          <button
                            onClick={() => openAssignAdminModal(u.telegram_id, u.full_name || u.username)}
                            className="px-2 py-1 rounded-lg bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white font-bold text-[10px] transition-all flex items-center gap-1"
                            title="Admin qilib tayinlash"
                          >
                            <ShieldCheck className="w-3 h-3" />
                            <span>⚡ Admin</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB: ADMINS MANAGEMENT (SUPERADMIN ONLY) */}
        {/* ========================================================= */}
        {activeTab === "admins" && isSuperAdmin && (
          <div className="space-y-6 animate-fade-in">
            <div className="p-5 sm:p-7 rounded-3xl bg-[#0c101c] border border-amber-500/30 shadow-2xl space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-5">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-2xl bg-gradient-to-tr from-amber-500/20 to-yellow-500/20 text-amber-400 border border-amber-500/30 shadow-[0_0_20px_rgba(245,158,11,0.2)]">
                    <ShieldCheck className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                      <span>Adminlar & Xodimlar Boshqaruvi</span>
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1 ${
                        isFounder
                          ? "bg-gradient-to-r from-amber-500/20 to-rose-500/20 text-rose-300 border border-rose-500/40 shadow-[0_0_10px_rgba(244,63,94,0.2)]"
                          : "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                      }`}>
                        {isFounder ? "👑 Asoschi (Founder) Paneli" : "SuperAdmin Panel"}
                      </span>
                    </h3>
                    <p className="text-xs text-slate-400 font-medium">
                      Platforma xodimlarini tayinlang, rollarini belgilang yoki vazifasidan ozod eting
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setAdminForm({ telegram_id: "", full_name: "", role: "ADMIN" });
                    setIsAdminModalOpen(true);
                  }}
                  className="flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-500 text-black font-black text-xs shadow-[0_0_20px_rgba(245,158,11,0.3)] hover:scale-105 active:scale-95 transition-all shrink-0"
                >
                  <Plus className="w-4 h-4" />
                  <span>+ Yangi Admin Tayinlash</span>
                </button>
              </div>

              {/* Roles Info Legend Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="p-3.5 rounded-2xl bg-gradient-to-br from-[#161226] to-[#0d1020] border border-rose-500/30 space-y-1 shadow-[0_0_15px_rgba(244,63,94,0.1)]">
                  <div className="flex items-center gap-1.5 text-xs font-black text-rose-300">
                    <Crown className="w-3.5 h-3.5 text-amber-400 fill-amber-400" /> FOUNDER
                  </div>
                  <p className="text-[11px] text-slate-300 leading-relaxed">
                    Platforma asoschisi. SuperAdminlarni boshqarish va o'chirish huquqi bor. Mutlaq daxlsiz.
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-[#111628] border border-amber-500/20 space-y-1">
                  <div className="flex items-center gap-1.5 text-xs font-black text-amber-400">
                    <Crown className="w-3.5 h-3.5" /> SUPERADMIN
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Tizim boshqaruvchisi. Admin/moderatorlarni boshqaradi va barcha bo'limlarga ega.
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-[#111628] border border-rose-500/20 space-y-1">
                  <div className="flex items-center gap-1.5 text-xs font-black text-rose-400">
                    <Film className="w-3.5 h-3.5" /> ADMIN
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Anime va epizodlarni yuklash, tahrirlash, VIP obunachilar va cheklarni tasdiqlash.
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-[#111628] border border-cyan-500/20 space-y-1">
                  <div className="flex items-center gap-1.5 text-xs font-black text-cyan-400">
                    <ShieldCheck className="w-3.5 h-3.5" /> MODERATOR
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Izohlar, danmaku jonli sharhlarini nazorat qilish va noo'rin xabarlarni tozalash huquqi.
                  </p>
                </div>
              </div>

              {/* Admin Cards Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {adminsList.map((a) => {
                  const isFounderItem = a.role === "FOUNDER" || a.telegram_id === 5415350162 || a.telegram_id === 4351671;
                  const isSuperItem = !isFounderItem && (a.role === "SUPERADMIN" || a.telegram_id === 6149114216);
                  return (
                    <div
                      key={a.id}
                      className={`p-4 sm:p-5 rounded-2xl flex flex-col justify-between space-y-4 transition-all ${
                        isFounderItem
                          ? "bg-gradient-to-b from-[#181126] to-[#0c101c] border border-rose-500/50 shadow-[0_0_25px_rgba(244,63,94,0.2)]"
                          : isSuperItem
                          ? "bg-[#101526] border border-amber-500/40 shadow-[0_0_20px_rgba(245,158,11,0.1)]"
                          : "bg-[#101526] border border-white/10 hover:border-white/20"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className={`w-11 h-11 rounded-2xl flex items-center justify-center font-black text-sm shrink-0 shadow-inner ${
                            isFounderItem
                              ? "bg-gradient-to-tr from-amber-400 via-rose-500 to-red-600 text-white shadow-[0_0_20px_rgba(244,63,94,0.5)]"
                              : isSuperItem
                              ? "bg-gradient-to-tr from-amber-500 to-yellow-400 text-black shadow-[0_0_15px_rgba(245,158,11,0.4)]"
                              : a.role === "ADMIN"
                              ? "bg-rose-600/20 text-rose-400 border border-rose-500/30"
                              : "bg-cyan-600/20 text-cyan-400 border border-cyan-500/30"
                          }`}>
                            {a.full_name?.[0] || "A"}
                          </div>
                          <div className="min-w-0">
                            <h4 className="font-bold text-sm text-white truncate flex items-center gap-1.5">
                              <span>{a.full_name}</span>
                              {isFounderItem ? (
                                <Crown className="w-4 h-4 text-rose-400 fill-rose-400 shrink-0" />
                              ) : isSuperItem ? (
                                <Crown className="w-3.5 h-3.5 text-amber-400 fill-amber-400 shrink-0" />
                              ) : null}
                            </h4>
                            <span className="text-[11px] text-slate-400 font-mono block">
                              TG ID: {a.telegram_id}
                            </span>
                          </div>
                        </div>

                        <span className={`px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider shrink-0 ${
                          isFounderItem
                            ? "bg-gradient-to-r from-amber-500/25 to-rose-500/25 text-rose-300 border border-rose-500/40"
                            : isSuperItem
                            ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                            : a.role === "ADMIN"
                            ? "bg-rose-500/20 text-rose-300 border border-rose-500/40"
                            : "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40"
                        }`}>
                          {isFounderItem ? "👑 FOUNDER" : a.role}
                        </span>
                      </div>

                      <div className="flex items-center justify-between pt-3 border-t border-white/5 text-[11px]">
                        <span className="text-slate-500 text-[10px]">
                          {a.created_at ? new Date(a.created_at).toLocaleDateString("uz-UZ") : "Asosiy"}
                        </span>

                        {isFounderItem ? (
                          <span className="text-[10px] font-black text-rose-300 bg-rose-500/15 px-2.5 py-1 rounded-lg border border-rose-500/30">
                            👑 Mutlaq Daxlsiz Asoschi
                          </span>
                        ) : isSuperItem ? (
                          isFounder ? (
                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={() => handleEditAdmin(a)}
                                className="px-2.5 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 text-[11px] font-bold transition-all"
                                title="Rolni tahrirlash"
                              >
                                Tahrirlash
                              </button>
                              <button
                                onClick={() => handleRemoveAdmin(a.telegram_id, a.full_name)}
                                className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-red-500/15 hover:bg-red-500/30 text-red-300 hover:text-white border border-red-500/30 text-[11px] font-bold transition-all active:scale-95"
                                title="SuperAdminni chiqarish"
                              >
                                <Trash2 className="w-3 h-3" />
                                <span>Chiqarish</span>
                              </button>
                            </div>
                          ) : (
                            <span className="text-[10px] font-bold text-amber-400/80 bg-amber-500/10 px-2 py-0.5 rounded-lg border border-amber-500/20">
                              Daxlsiz SuperAdmin
                            </span>
                          )
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => handleEditAdmin(a)}
                              className="px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/15 text-slate-300 hover:text-white border border-white/10 text-[11px] font-bold transition-all"
                            >
                              Tahrirlash
                            </button>
                            <button
                              onClick={() => handleRemoveAdmin(a.telegram_id, a.full_name)}
                              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-red-500/15 hover:bg-red-500/30 text-red-300 hover:text-white border border-red-500/30 text-[11px] font-bold transition-all active:scale-95"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Chiqarish</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 5: SITE & PAYMENT SETTINGS */}
        {/* ========================================================= */}
        {/* FANDUBS MANAGEMENT TAB */}
      {activeTab === "fandubs" && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#0d111e]/90 p-5 rounded-3xl border border-white/10 shadow-xl">
            <div>
              <h2 className="text-lg font-black text-white flex items-center gap-2">
                <Mic className="w-5 h-5 text-rose-500" /> Fandub Studiyalari & Ovoz Guruhlari
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Saytga anime qismlari yuklovchi rasmiy va mustaqil fandub studiyalari
              </p>
            </div>
            <button
              onClick={() => {
                setNewFandubName("");
                setNewFandubDesc("");
                setIsFandubModalOpen(true);
              }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-rose-500 text-white text-xs font-bold shadow-neon hover:brightness-110 active:scale-95 transition-all self-start sm:self-auto"
            >
              <Plus className="w-4 h-4" />
              <span>+ Yangi Fandub Qo&apos;shish</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {fandubs.map((f) => {
              const epCount = episodes.filter((e) => (e.fandub_id || 1) === f.id).length;
              const hasAdmin = Boolean(f.admin_telegram_id || f.admin_username);

              return (
                <div
                  key={f.id}
                  className="p-4 sm:p-5 rounded-3xl bg-[#090e1c]/90 border border-white/10 hover:border-indigo-500/40 transition-all space-y-4 shadow-lg flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="w-9 h-9 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-rose-500/20 border border-white/10 flex items-center justify-center text-rose-400 font-black text-sm">
                        🎙️
                      </span>
                      <span className="text-[10px] font-mono bg-white/5 border border-white/10 px-2 py-0.5 rounded-lg text-slate-400">
                        ID: #{f.id}
                      </span>
                    </div>

                    <div>
                      <h3 className="text-base font-black text-white">{f.name}</h3>
                      <p className="text-xs text-slate-400 line-clamp-2 mt-1">
                        {f.description || "Hikaku rasmiy fandub jamoasi"}
                      </p>
                    </div>

                    {/* ASSIGNED ADMIN (LEADER) BADGE */}
                    <div className="p-3 rounded-2xl bg-[#111728]/90 border border-white/5 space-y-1">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                        <Crown className="w-3.5 h-3.5 text-amber-400" />
                        <span>Biriktirilgan Rahbar (Admin):</span>
                      </div>
                      {hasAdmin ? (
                        <div className="flex items-center justify-between gap-2 pt-0.5">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="text-xs font-black text-emerald-400 truncate">
                              {f.admin_username ? `@${f.admin_username}` : f.admin_full_name || "Studiya Admini"}
                            </span>
                            {f.admin_telegram_id ? (
                              <span className="text-[10px] font-mono text-slate-500 shrink-0">
                                (ID: {f.admin_telegram_id})
                              </span>
                            ) : null}
                          </div>
                          <span className="px-2 py-0.5 rounded-lg bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 text-[10px] font-bold shrink-0">
                            Faol
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between gap-2 pt-0.5">
                          <span className="text-xs font-semibold text-amber-400/90 flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3 text-amber-400" /> Biriktirilmagan
                          </span>
                          <span className="text-[10px] text-slate-500">Kutilmoqda</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="pt-3 border-t border-white/5 flex flex-wrap sm:flex-nowrap items-center justify-between gap-2 text-xs">
                    <span className="text-slate-400 font-bold flex items-center gap-1.5 text-xs">
                      <Film className="w-3.5 h-3.5 text-indigo-400" /> {epCount} ta qism
                    </span>

                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      {/* DIRECT ADMIN ASSIGN BUTTON (NO CONFUSING SOZLAMALAR!) */}
                      <button
                        onClick={async () => {
                          setSelectedFandubForUsers(f);
                          setNewFandubUserTgId(f.admin_telegram_id ? String(f.admin_telegram_id) : "");
                          setNewFandubUserUsername(f.admin_username ? `@${f.admin_username}` : "");
                          setFandubUserSearchQuery("");
                          setIsFandubUserModalOpen(true);
                          try {
                            const res = await adminFetch(`/api/v1/admin/fandubs/users?fandub_id=${f.id}`);
                            const data = await res.json();
                            if (data.success) setFandubUsers(data.data || []);
                          } catch (e) {
                            console.error(e);
                          }
                        }}
                        className="flex-1 sm:flex-initial px-3 py-2 rounded-xl bg-gradient-to-r from-amber-500/20 to-yellow-500/20 hover:from-amber-500/30 hover:to-yellow-500/30 text-amber-300 border border-amber-500/30 transition-all text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm min-h-[40px]"
                        title="Fandub Rahbarini biriktirish yoki o'zgartirish"
                      >
                        <Crown className="w-3.5 h-3.5 text-amber-400" />
                        <span>{hasAdmin ? "Adminni O'zgartirish" : "Admin Biriktirish"}</span>
                      </button>

                      {isSuperAdmin && f.id !== 1 && (
                        <button
                          onClick={async () => {
                            const epCount = Number(f.episodes_count || 0);
                            if (epCount > 0) {
                              showToast(`⚠️ Qat'iy taqiq: Ushbu studiyada ${epCount} ta qism mavjud! Fandubni o'chirishdan oldin barcha qismlarni o'chiring.`, "error");
                              return;
                            }
                            if (!confirm(`Haqiqatdan ham "${f.name}" fandub studiyasini o'chirmoqchimisiz?`)) return;
                            try {
                              const res = await adminFetch(`/api/v1/admin/fandubs?id=${f.id}`, { method: "DELETE" });
                              const data = await res.json();
                              if (data.success) {
                                setFandubs(fandubs.filter((x) => x.id !== f.id));
                                showToast("Fandub o'chirildi!", "success");
                              } else {
                                showToast(data.error || "Xatolik yuz berdi", "error");
                              }
                            } catch (e) {
                              console.error(e);
                              showToast("Server bilan aloqa xatosi", "error");
                            }
                          }}
                          disabled={Boolean(f.episodes_count && f.episodes_count > 0)}
                          className={`p-2.5 rounded-xl border transition-all shrink-0 min-h-[40px] min-w-[40px] flex items-center justify-center ${
                            f.episodes_count && f.episodes_count > 0
                              ? "bg-slate-800/30 text-slate-600 border-white/5 cursor-not-allowed"
                              : "bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border-rose-500/30 cursor-pointer"
                          }`}
                          title={
                            f.episodes_count && f.episodes_count > 0
                              ? `🔒 Ushbu studiyada ${f.episodes_count} ta qism mavjud. Avval qismlarni o'chiring!`
                              : "Fandubni o'chirish"
                          }
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* AUDIT LOGS (HISTORY) TAB */}
      {activeTab === "audit" && (
        <div className="space-y-6">
          <div className="bg-[#0d111e]/90 p-5 rounded-3xl border border-white/10 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-black text-white flex items-center gap-2">
                <History className="w-5 h-5 text-amber-400" /> Bajarilgan Amallar Jurnali (Audit Logs)
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Saytda kim, qachon nimani qo&apos;shgan, tahrirlagan yoki o&apos;chirganini nazorat qilish
              </p>
            </div>
            <button
              onClick={async () => {
                try {
                  const res = await adminFetch("/api/v1/admin/audit-logs?limit=50");
                  const data = await res.json();
                  if (data.success) setAuditLogs(data.logs || []);
                } catch (e) {
                  console.error(e);
                }
              }}
              className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-slate-300 hover:text-white transition-all flex items-center gap-1.5 self-start sm:self-auto"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Yangilash</span>
            </button>
          </div>

          <div className="bg-[#090e1c]/90 rounded-3xl border border-white/10 overflow-hidden shadow-2xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-white/10 bg-[#0f152a]/70 text-slate-400 uppercase tracking-wider font-bold">
                    <th className="py-3 px-4">Vaqt</th>
                    <th className="py-3 px-4">Mas&apos;ul</th>
                    <th className="py-3 px-4">Amal</th>
                    <th className="py-3 px-4">Obyekt</th>
                    <th className="py-3 px-4">Tafsilotlar</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {auditLogs.length > 0 ? (
                    auditLogs.map((log) => {
                      const isDelete = log.action.includes("DELETE");
                      const isCreate = log.action.includes("CREATE") || log.action.includes("ADD");
                      return (
                        <tr key={log.id} className="hover:bg-white/[0.02] transition-colors">
                          <td className="py-3 px-4 text-slate-400 font-mono whitespace-nowrap">
                            {new Date(log.created_at).toLocaleString("uz-UZ")}
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap font-bold text-white">
                            {log.actor_name || "Admin"}
                            {log.actor_id ? <span className="text-[10px] text-slate-500 ml-1">({log.actor_id})</span> : null}
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap">
                            <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black border ${
                              isDelete
                                ? "bg-rose-500/10 text-rose-400 border-rose-500/30"
                                : isCreate
                                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                                : "bg-amber-500/10 text-amber-400 border-amber-500/30"
                            }`}>
                              {log.action}
                            </span>
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap font-semibold text-slate-300">
                            {log.entity_type} {log.entity_id ? `#${log.entity_id}` : ""}
                          </td>
                          <td className="py-3 px-4 text-slate-400 font-mono text-[11px] max-w-xs truncate">
                            {log.details || "-"}
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={5} className="text-center py-10 text-slate-500 text-xs">
                        Hozircha amallar jurnali bo&apos;sh
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === "settings" && (
          <div className="space-y-6 animate-fade-in">
            {/* Global Settings Form */}
            <div className="p-5 sm:p-7 rounded-3xl bg-[#0c101c] border border-cyan-900/30 shadow-2xl space-y-6">
              <div className="flex items-center gap-3 border-b border-white/10 pb-4">
                <div className="p-2.5 rounded-2xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white">Sayt & Platforma Sozlamalari</h3>
                  <p className="text-xs text-slate-400 font-medium">
                    Sayt e&apos;lon matni va bulutli Backblaze B2 xotira tizimini boshqaring. (VIP obunalar har bir fandub studiyasi tomonidan mustaqil boshqariladi).
                  </p>
                </div>
              </div>

              <form onSubmit={handleSaveSettings} className="space-y-5">
                {/* Announcement Banner */}
                <div className="space-y-3 p-5 rounded-2xl bg-[#111728] border border-white/5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-cyan-400" /> Sayt Yuqori E&apos;lon Banneri
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="annActive"
                        checked={settings.announcement_active}
                        onChange={(e) => setSettings({ ...settings, announcement_active: e.target.checked })}
                        className="w-4 h-4 rounded text-cyan-600 focus:ring-cyan-500"
                      />
                      <label htmlFor="annActive" className="text-xs font-bold text-cyan-400 cursor-pointer">
                        {settings.announcement_active ? "E'lon Yoqilgan 🟢" : "E'lon O'chirilgan ⚪"}
                      </label>
                    </div>
                  </div>

                  <input
                    type="text"
                    value={settings.announcement_text}
                    onChange={(e) => setSettings({ ...settings, announcement_text: e.target.value })}
                    placeholder="Masalan: Hikaku Anime platformasiga xush kelibsiz!"
                    className="w-full bg-[#070a14] border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:border-cyan-500 focus:outline-none"
                  />
                  <p className="text-[11px] text-slate-400">
                    Ushbu matn saytning eng yuqori qismida barcha foydalanuvchilarga ko&apos;rsatiladi.
                  </p>
                </div>

                {/* Cloud Storage Info (Read-Only Status) */}
                <div className="p-5 rounded-2xl bg-[#111728] border border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
                  <div className="space-y-1">
                    <span className="font-bold text-white flex items-center gap-2">
                      <span>☁️ Backblaze B2 Storage Ombori</span>
                    </span>
                    <span className="text-slate-400 font-mono text-[11px] block">
                      Bucket: iskurama | Endpoint: s3.us-east-005.backblazeb2.com
                    </span>
                    <span className="text-[11px] text-slate-500">
                      Barcha video, epizodlar, studiya logotiplari va bannerlar to&apos;g&apos;ridan-to&apos;g&apos;ri ushbu xotirada saqlanadi.
                    </span>
                  </div>
                  <span className="px-3.5 py-1.5 rounded-full text-xs font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shrink-0 w-max self-start sm:self-center">
                    🟢 Faol & Ulangan
                  </span>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    className="px-8 py-3 rounded-2xl bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white font-black text-xs sm:text-sm shadow-neon transition-all flex items-center gap-2"
                  >
                    <Save className="w-4 h-4" /> Sozlamalarni Saqlash
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>

      {/* Anime Add / Edit Modal (Mobile Responsive) */}
      {isAnimeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="relative w-full max-w-2xl bg-[#0c101c] border border-rose-900/40 rounded-3xl p-6 sm:p-8 shadow-2xl max-h-[90vh] overflow-y-auto no-scrollbar space-y-5">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-base font-black text-white flex items-center gap-2">
                <Film className="w-5 h-5 text-rose-500" />
                {editingAnime ? "Animeni Tahrirlash" : "Yangi Anime Qo'shish"}
              </h3>
              <button
                onClick={() => setIsAnimeModalOpen(false)}
                className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveAnime} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-300">O'zbekcha Nomi *</label>
                  <input
                    type="text"
                    value={animeFormData.title_uz}
                    onChange={(e) => setAnimeFormData({ ...animeFormData, title_uz: e.target.value })}
                    className="w-full bg-[#111728] border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-300">Inglizcha Nomi</label>
                  <input
                    type="text"
                    value={animeFormData.title_en}
                    onChange={(e) => setAnimeFormData({ ...animeFormData, title_en: e.target.value })}
                    className="w-full bg-[#111728] border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>
              </div>

              {/* Candidate Posters from Search (if any) */}
              {candidatePosters.length > 1 && (
                <div className="space-y-1.5 p-3 rounded-2xl bg-[#111728]/80 border border-white/10">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-300 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                      Qidiruvdan topilgan rasm variantlari (Tanlash uchun bosing):
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">{candidatePosters.length} ta</span>
                  </div>
                  <div className="flex items-center gap-2 overflow-x-auto py-1 no-scrollbar">
                    {candidatePosters.map((imgUrl, i) => {
                      const isSelected = animeFormData.poster_url === imgUrl;
                      return (
                        <button
                          key={i}
                          type="button"
                          onClick={() => setAnimeFormData((prev) => ({ ...prev, poster_url: imgUrl }))}
                          className={`relative flex-shrink-0 w-14 h-20 rounded-xl overflow-hidden border-2 transition-all group ${
                            isSelected ? "border-rose-500 ring-2 ring-rose-500/50 scale-105" : "border-white/10 hover:border-white/40 opacity-70 hover:opacity-100"
                          }`}
                        >
                          <img src={imgUrl} alt={`Variant ${i + 1}`} className="w-full h-full object-cover" />
                          {isSelected && (
                            <div className="absolute inset-0 bg-rose-600/40 flex items-center justify-center">
                              <Check className="w-4 h-4 text-white drop-shadow" />
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Poster Upload & URL Section */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                    <ImageIcon className="w-3.5 h-3.5 text-rose-500" />
                    Poster (Afisha) *
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowPosterUrlInput(!showPosterUrlInput)}
                    className="text-[11px] text-rose-400 hover:text-rose-300 font-medium underline flex items-center gap-1"
                  >
                    <Link2 className="w-3 h-3" />
                    {showPosterUrlInput ? "Havolani yashirish" : "Havola (URL) orqali kiritish"}
                  </button>
                </div>

                {/* Hidden File Input */}
                <input
                  type="file"
                  ref={posterFileInputRef}
                  accept="image/jpeg,image/png,image/webp,image/jpg"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const url = await uploadImageFile(file, "posters");
                      if (url) {
                        setAnimeFormData((prev) => ({ ...prev, poster_url: url }));
                      }
                      e.target.value = "";
                    }
                  }}
                />

                {/* Dropzone or Preview */}
                {animeFormData.poster_url ? (
                  <div className="flex items-start gap-4 p-3 rounded-2xl bg-[#111728] border border-white/10">
                    <div className="relative w-20 h-28 sm:w-24 sm:h-32 rounded-xl overflow-hidden border border-white/20 flex-shrink-0 bg-black/40 shadow-lg">
                      <img
                        src={animeFormData.poster_url}
                        alt="Poster Preview"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = "/placeholder.jpg";
                        }}
                      />
                    </div>
                    <div className="flex-1 min-w-0 space-y-2 py-1">
                      <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold">
                        <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                        <span>Poster tanlangan</span>
                      </div>
                      <p className="text-[11px] text-slate-400 truncate font-mono bg-black/30 px-2.5 py-1.5 rounded-lg border border-white/5">
                        {animeFormData.poster_url}
                      </p>
                      <div className="flex items-center gap-2 pt-1">
                        <button
                          type="button"
                          disabled={isUploadingPoster}
                          onClick={() => posterFileInputRef.current?.click()}
                          className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold flex items-center gap-1.5 transition-all disabled:opacity-50"
                        >
                          {isUploadingPoster ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5 text-rose-400" />}
                          O'zgartirish
                        </button>
                        <button
                          type="button"
                          onClick={() => setAnimeFormData((prev) => ({ ...prev, poster_url: "" }))}
                          className="px-3 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 hover:text-rose-200 text-xs font-bold flex items-center gap-1.5 transition-all"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          O'chirish
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div
                    onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                    onDrop={async (e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      const file = e.dataTransfer.files?.[0];
                      if (file) {
                        const url = await uploadImageFile(file, "posters");
                        if (url) {
                          setAnimeFormData((prev) => ({ ...prev, poster_url: url }));
                        }
                      }
                    }}
                    onClick={() => posterFileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-2xl p-4 text-center cursor-pointer transition-all ${
                      isUploadingPoster
                        ? "border-rose-500/60 bg-rose-500/10"
                        : "border-white/20 hover:border-rose-500/60 hover:bg-white/5 bg-[#111728]/50"
                    }`}
                  >
                    {isUploadingPoster ? (
                      <div className="flex flex-col items-center justify-center gap-2 text-rose-400 py-2">
                        <Loader2 className="w-6 h-6 animate-spin" />
                        <span className="text-xs font-bold">Poster B2 bulutiga yuklanmoqda...</span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center gap-1.5 py-2">
                        <div className="w-9 h-9 rounded-2xl bg-rose-500/20 flex items-center justify-center text-rose-400">
                          <UploadCloud className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-white">
                            Posterni shu yerga tashlang yoki <span className="text-rose-400 underline">tanlang</span>
                          </p>
                          <p className="text-[10px] text-slate-400 mt-0.5">
                            JPG, PNG, WebP (Maksimal 15 MB)
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Direct URL Input fallback / toggle */}
                {(showPosterUrlInput || (!animeFormData.poster_url && showPosterUrlInput)) && (
                  <input
                    type="url"
                    value={animeFormData.poster_url}
                    onChange={(e) => setAnimeFormData({ ...animeFormData, poster_url: e.target.value })}
                    placeholder="https://example.com/poster.jpg"
                    className="w-full bg-[#111728] border border-white/10 rounded-xl px-3 py-2 text-xs text-white font-mono focus:border-rose-500 focus:outline-none"
                  />
                )}
              </div>

              {/* Banner Upload & URL Section */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                    <ImageIcon className="w-3.5 h-3.5 text-sky-400" />
                    Banner / Fon Rasmi (Gorizontal)
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowBannerUrlInput(!showBannerUrlInput)}
                    className="text-[11px] text-sky-400 hover:text-sky-300 font-medium underline flex items-center gap-1"
                  >
                    <Link2 className="w-3 h-3" />
                    {showBannerUrlInput ? "Havolani yashirish" : "Havola (URL) orqali kiritish"}
                  </button>
                </div>

                {/* Hidden File Input */}
                <input
                  type="file"
                  ref={bannerFileInputRef}
                  accept="image/jpeg,image/png,image/webp,image/jpg"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const url = await uploadImageFile(file, "banners");
                      if (url) {
                        setAnimeFormData((prev) => ({ ...prev, banner_url: url }));
                      }
                      e.target.value = "";
                    }
                  }}
                />

                {/* Dropzone or Preview */}
                {animeFormData.banner_url ? (
                  <div className="relative rounded-2xl overflow-hidden border border-white/15 bg-black/40 group aspect-[16/6] max-h-32">
                    <img
                      src={animeFormData.banner_url}
                      alt="Banner Preview"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = "/placeholder.jpg";
                      }}
                    />
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3 p-2">
                      <button
                        type="button"
                        disabled={isUploadingBanner}
                        onClick={() => bannerFileInputRef.current?.click()}
                        className="px-3 py-1.5 rounded-xl bg-white/20 hover:bg-white/30 text-white text-xs font-bold flex items-center gap-1.5 backdrop-blur-md transition-all"
                      >
                        {isUploadingBanner ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                        O'zgartirish
                      </button>
                      <button
                        type="button"
                        onClick={() => setAnimeFormData((prev) => ({ ...prev, banner_url: "" }))}
                        className="px-3 py-1.5 rounded-xl bg-rose-600/80 hover:bg-rose-600 text-white text-xs font-bold flex items-center gap-1.5 backdrop-blur-md transition-all"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        O'chirish
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
                    onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                    onDrop={async (e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      const file = e.dataTransfer.files?.[0];
                      if (file) {
                        const url = await uploadImageFile(file, "banners");
                        if (url) {
                          setAnimeFormData((prev) => ({ ...prev, banner_url: url }));
                        }
                      }
                    }}
                    onClick={() => bannerFileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-2xl p-4 text-center cursor-pointer transition-all ${
                      isUploadingBanner
                        ? "border-sky-500/60 bg-sky-500/10"
                        : "border-white/20 hover:border-sky-500/60 hover:bg-white/5 bg-[#111728]/50"
                    }`}
                  >
                    {isUploadingBanner ? (
                      <div className="flex flex-col items-center justify-center gap-2 text-sky-400 py-1.5">
                        <Loader2 className="w-6 h-6 animate-spin" />
                        <span className="text-xs font-bold">Banner B2 bulutiga yuklanmoqda...</span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center gap-1.5 py-1.5">
                        <div className="w-8 h-8 rounded-xl bg-sky-500/20 flex items-center justify-center text-sky-400">
                          <UploadCloud className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-white">
                            Bannerni tashlang yoki <span className="text-sky-400 underline">tanlang</span>
                          </p>
                          <p className="text-[10px] text-slate-400">
                            Gorizontal 16:9 tavsiya etiladi (ixtiyoriy)
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Direct URL Input fallback / toggle */}
                {showBannerUrlInput && (
                  <input
                    type="url"
                    value={animeFormData.banner_url}
                    onChange={(e) => setAnimeFormData({ ...animeFormData, banner_url: e.target.value })}
                    placeholder="https://example.com/banner.jpg"
                    className="w-full bg-[#111728] border border-white/10 rounded-xl px-3 py-2 text-xs text-white font-mono focus:border-sky-500 focus:outline-none"
                  />
                )}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-300">Baho (0-10)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="10"
                    value={animeFormData.score}
                    onChange={(e) => setAnimeFormData({ ...animeFormData, score: Number(e.target.value) })}
                    className="w-full bg-[#111728] border border-white/10 rounded-xl px-3 py-2 text-xs text-white [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none focus:border-rose-500 focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-300">Qismlar Soni</label>
                  <input
                    type="number"
                    min="1"
                    value={animeFormData.episodes_count}
                    onChange={(e) => setAnimeFormData({ ...animeFormData, episodes_count: Number(e.target.value) })}
                    className="w-full bg-[#111728] border border-white/10 rounded-xl px-3 py-2 text-xs text-white [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none focus:border-rose-500 focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-300">Holati</label>
                  <select
                    value={animeFormData.status}
                    onChange={(e) => setAnimeFormData({ ...animeFormData, status: e.target.value })}
                    className="w-full bg-[#111728] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:border-rose-500 focus:outline-none"
                  >
                    <option value="ONGOING">ONGOING</option>
                    <option value="TUGALLANGAN">TUGALLANGAN</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-300">Yil</label>
                  <input
                    type="number"
                    min="1970"
                    max="2030"
                    value={animeFormData.year}
                    onChange={(e) => setAnimeFormData({ ...animeFormData, year: Number(e.target.value) })}
                    className="w-full bg-[#111728] border border-white/10 rounded-xl px-3 py-2 text-xs text-white [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none focus:border-rose-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Telegram Post/Channel URL */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <Send className="w-3.5 h-3.5 text-sky-400" />
                  <span>Telegram Havolasi (URL)</span>
                  <span className="text-[10px] text-slate-400 font-normal">(ixtiyoriy, kiritilsa "Telegramda ochish" tugmasi chiqadi)</span>
                </label>
                <input
                  type="url"
                  value={animeFormData.telegram_url || ""}
                  onChange={(e) => setAnimeFormData({ ...animeFormData, telegram_url: e.target.value })}
                  placeholder="https://t.me/hikakuz/123 yoki https://t.me/hikakuz"
                  className="w-full bg-[#111728] border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder:text-slate-500 focus:border-sky-500 focus:outline-none"
                />
              </div>

              {/* Genres Multi-Select Chips (Many-to-Many Zero-Migration) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-rose-500" />
                    <span>Janrlar (Ko'p Tanlovli) *</span>
                  </label>
                  <span className="text-[10px] text-rose-400 font-semibold bg-rose-500/10 px-2 py-0.5 rounded-md border border-rose-500/20">
                    {animeFormData.genres.length} ta tanlandi
                  </span>
                </div>

                <div className="flex flex-wrap gap-1.5 p-3 rounded-2xl bg-[#111728] border border-white/10 max-h-36 overflow-y-auto no-scrollbar">
                  {[
                    "Jangari",
                    "Sarguzasht",
                    "Fantastika",
                    "Sehr-jodu",
                    "Komediya",
                    "Drama",
                    "Romantika",
                    "Shounen",
                    "Isekai",
                    "Psixologik",
                    "Detektiv",
                    "Fentezi Sarguzasht",
                    "Triller",
                    "Maktab",
                    "Kundalik Hayot",
                    "G'ayritabiiy"
                  ].map((g) => {
                    const isSelected = animeFormData.genres.includes(g);
                    return (
                      <button
                        key={g}
                        type="button"
                        onClick={() => {
                          if (isSelected) {
                            setAnimeFormData({
                              ...animeFormData,
                              genres: animeFormData.genres.filter((item) => item !== g),
                            });
                          } else {
                            setAnimeFormData({
                              ...animeFormData,
                              genres: [...animeFormData.genres, g],
                            });
                          }
                        }}
                        className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition-all flex items-center gap-1 active:scale-95 ${
                          isSelected
                            ? "bg-rose-600 text-white shadow-neon border border-rose-400"
                            : "bg-white/5 text-slate-400 hover:text-white hover:bg-white/10 border border-white/5"
                        }`}
                      >
                        {isSelected && <Check className="w-3 h-3 text-white" />}
                        <span>{g}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-300">Tavsif (Synopsis)</label>
                  <button
                    type="button"
                    onClick={handleTranslateSynopsis}
                    disabled={isTranslating}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/30 text-[10px] font-bold transition-all disabled:opacity-50"
                  >
                    {isTranslating ? (
                      <>
                        <Loader2 className="w-3 h-3 animate-spin" />
                        <span>O'girilmoqda...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3 h-3 text-amber-400" />
                        <span>⚡ O'zbekchaga o'girish</span>
                      </>
                    )}
                  </button>
                </div>
                <textarea
                  rows={4}
                  value={animeFormData.synopsis}
                  onChange={(e) => setAnimeFormData({ ...animeFormData, synopsis: e.target.value })}
                  placeholder="Anime haqida qisqacha ma'lumot (o'zbek tilida)..."
                  className="w-full bg-[#111728] border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white leading-relaxed focus:border-rose-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsAnimeModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-bold text-slate-400"
                >
                  Bekor Qilish
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 rounded-xl bg-gradient-to-r from-rose-600 to-rose-500 text-white text-xs font-black shadow-neon"
                >
                  {editingAnime ? "Yangilash" : "Qo'shish"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

{/* Fandub Create Modal */}
      {isFandubModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="relative w-full max-w-md bg-[#0c101c] border border-rose-500/30 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-base font-black text-white flex items-center gap-2">
                <Mic className="w-5 h-5 text-rose-500" /> Yangi Fandub Qo&apos;shish
              </h3>
              <button onClick={() => setIsFandubModalOpen(false)} className="p-1 text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-300">Fandub Studiyasi Nomi</label>
                <input
                  type="text"
                  placeholder="masalan: Amedia, Anilibria, Tariq Dub..."
                  value={newFandubName}
                  onChange={(e) => setNewFandubName(e.target.value)}
                  className="w-full bg-[#121624] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-rose-500 font-bold"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-300">Qisqacha Tavsif</label>
                <textarea
                  placeholder="Fandub jamoasi haqida qisqacha..."
                  value={newFandubDesc}
                  onChange={(e) => setNewFandubDesc(e.target.value)}
                  className="w-full bg-[#121624] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-rose-500 resize-none h-20"
                />
              </div>
            </div>
            <div className="pt-2 flex justify-end gap-2 border-t border-white/10">
              <button
                onClick={() => setIsFandubModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-bold text-slate-300"
              >
                Bekor qilish
              </button>
              <button
                onClick={async () => {
                  if (!newFandubName.trim()) {
                    alert("Iltimos, fandub nomini kiriting");
                    return;
                  }
                  try {
                    const res = await adminFetch("/api/v1/admin/fandubs", {
                      method: "POST",
                      body: JSON.stringify({
                        name: newFandubName.trim(),
                        description: newFandubDesc.trim(),
                      }),
                    });
                    const data = await res.json();
                    if (data.success) {
                      setFandubs([...fandubs, data.fandub]);
                      setIsFandubModalOpen(false);
                      alert("Yangi fandub muvaffaqiyatli qo'shildi!");
                    } else {
                      alert(data.error || "Xatolik");
                    }
                  } catch (e) {
                    console.error(e);
                  }
                }}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-rose-600 to-rose-500 text-white text-xs font-bold shadow-neon"
              >
                Saqlash
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Fandub Admin Assignment Modal */}
      {isFandubUserModalOpen && selectedFandubForUsers && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="relative w-full max-w-lg bg-[#0c101c] border border-amber-500/30 rounded-t-3xl sm:rounded-3xl p-5 sm:p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto no-scrollbar">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div>
                <h3 className="text-base font-black text-white flex items-center gap-2">
                  <Crown className="w-5 h-5 text-amber-400" /> {selectedFandubForUsers.name}
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Fandub Rahbarini (Admin) biriktirish yoki o&apos;zgartirish
                </p>
              </div>
              <button
                onClick={() => setIsFandubUserModalOpen(false)}
                className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Helper Notice */}
            <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs flex items-start gap-2 leading-relaxed">
              <Sparkles className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <span>
                Biriktirilgan admin <b>/fandub</b> portaliga o&apos;zining Telegram hisobi bilan kiradi, qism yuklaydi, VIP narxlarini va jamoasini to&apos;liq o&apos;zi mustaqil boshqaradi.
              </span>
            </div>

            {/* Fast User Search / Picker */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <Search className="w-3.5 h-3.5 text-indigo-400" /> Platformadagi Foydalanuvchilardan Tanlash (ixtiyoriy)
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Ism, @username yoki Telegram ID qidirish..."
                  value={fandubUserSearchQuery}
                  onChange={(e) => setFandubUserSearchQuery(e.target.value)}
                  className="w-full bg-[#121624] border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-colors"
                />
                {fandubUserSearchQuery && (
                  <button
                    onClick={() => setFandubUserSearchQuery("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {fandubUserSearchQuery.trim().length > 0 && (
                <div className="max-h-36 overflow-y-auto rounded-xl bg-[#090d1a] border border-white/10 divide-y divide-white/5 p-1 space-y-0.5">
                  {usersList
                    .filter((u) => {
                      const q = fandubUserSearchQuery.toLowerCase();
                      const un = (u.username || "").toLowerCase();
                      const fn = (u.first_name || u.full_name || "").toLowerCase();
                      const tg = String(u.telegram_id || "");
                      return un.includes(q) || fn.includes(q) || tg.includes(q);
                    })
                    .slice(0, 8)
                    .map((u) => (
                      <button
                        key={u.id || u.telegram_id}
                        type="button"
                        onClick={() => {
                          setNewFandubUserTgId(String(u.telegram_id));
                          if (u.username) {
                            setNewFandubUserUsername(`@${u.username}`);
                          }
                          setFandubUserSearchQuery("");
                        }}
                        className="w-full text-left p-2 rounded-lg hover:bg-amber-500/10 transition-colors flex items-center justify-between text-xs group"
                      >
                        <div className="min-w-0">
                          <span className="font-bold text-white group-hover:text-amber-300 transition-colors">
                            {u.first_name || u.full_name || u.username || "Foydalanuvchi"}
                          </span>
                          {u.username && (
                            <span className="text-[11px] text-slate-400 ml-1.5">@{u.username}</span>
                          )}
                        </div>
                        <span className="text-[10px] font-mono text-slate-500 bg-white/5 px-2 py-0.5 rounded">
                          {u.telegram_id}
                        </span>
                      </button>
                    ))}
                </div>
              )}
            </div>

            {/* Direct Input Form */}
            <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 space-y-3">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <Crown className="w-3.5 h-3.5 text-amber-400" /> Yangi Rahbar Ma&apos;lumotlari
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] text-slate-400 font-semibold">
                    Telegram Username (masalan: @maxkamov_voice)
                  </label>
                  <input
                    type="text"
                    placeholder="@username"
                    value={newFandubUserUsername}
                    onChange={(e) => setNewFandubUserUsername(e.target.value)}
                    className="w-full bg-[#121624] border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] text-slate-400 font-semibold">
                    Telegram ID (raqami)
                  </label>
                  <input
                    type="number"
                    placeholder="Masalan: 5415350162"
                    value={newFandubUserTgId}
                    onChange={(e) => setNewFandubUserTgId(e.target.value)}
                    className="w-full bg-[#121624] border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 font-mono"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between gap-2 pt-1">
                <span className="text-[10px] text-slate-500">
                  * Username yoki Telegram ID dan birortasi to&apos;ldirilishi kifoya.
                </span>

                <button
                  onClick={async () => {
                    const cleanUsername = newFandubUserUsername.trim();
                    const tgIdNum = Number(newFandubUserTgId.trim());

                    if (!cleanUsername && !tgIdNum) {
                      showToast("Telegram Username yoki ID raqamini kiriting", "error");
                      return;
                    }

                    setIsAssigningFandubAdmin(true);
                    try {
                      const res = await adminFetch("/api/v1/admin/fandubs/users", {
                        method: "POST",
                        body: JSON.stringify({
                          fandub_id: selectedFandubForUsers.id,
                          telegram_id: tgIdNum || 0,
                          username: cleanUsername,
                          role: "ADMIN",
                        }),
                      });
                      const data = await res.json();
                      if (data.success) {
                        showToast(`✅ "${selectedFandubForUsers.name}" ga rahbar biriktirildi!`, "success");
                        setNewFandubUserTgId("");
                        setNewFandubUserUsername("");

                        // Refresh fandub list to immediately update cards with new admin
                        try {
                          const fres = await adminFetch("/api/v1/admin/fandubs");
                          const fdata = await fres.json();
                          if (fdata.success && Array.isArray(fdata.data)) {
                            setFandubs(fdata.data);
                          }
                        } catch (err) {
                          console.error("Fandub reload error:", err);
                        }

                        // Reload modal users
                        const ures = await adminFetch(`/api/v1/admin/fandubs/users?fandub_id=${selectedFandubForUsers.id}`);
                        const udata = await ures.json();
                        if (udata.success) setFandubUsers(udata.data || []);
                        setIsFandubUserModalOpen(false);
                      } else {
                        showToast(data.error || "Xatolik yuz berdi", "error");
                      }
                    } catch (e) {
                      showToast("Server bilan aloqa xatosi", "error");
                    } finally {
                      setIsAssigningFandubAdmin(false);
                    }
                  }}
                  disabled={isAssigningFandubAdmin}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-black font-black text-xs shadow-neon transition-all flex items-center gap-1.5 shrink-0"
                >
                  {isAssigningFandubAdmin ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-black" />
                      <span>Saqlanmoqda...</span>
                    </>
                  ) : (
                    <>
                      <Crown className="w-3.5 h-3.5 text-black" />
                      <span>Rahbar qilib Biriktirish</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* List of current members & admin */}
            <div className="space-y-2 pt-1">
              <span className="text-xs font-bold text-slate-300 flex items-center justify-between">
                <span>Hozirgi Biriktirilgan A&apos;zolar ({fandubUsers.length})</span>
                <span className="text-[10px] text-slate-500 font-normal">Studiya ID: #{selectedFandubForUsers.id}</span>
              </span>

              {fandubUsers.length > 0 ? (
                <div className="space-y-1.5 max-h-40 overflow-y-auto no-scrollbar">
                  {fandubUsers.map((u) => {
                    const isAdmin = u.role === "ADMIN";

                    return (
                      <div
                        key={u.id || u.telegram_id}
                        className={`flex items-center justify-between p-3 rounded-2xl border text-xs transition-colors ${
                          isAdmin
                            ? "bg-amber-500/10 border-amber-500/30"
                            : "bg-white/[0.02] border-white/5"
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div
                            className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-xs ${
                              isAdmin
                                ? "bg-amber-500/20 text-amber-300"
                                : "bg-white/5 text-slate-400"
                            }`}
                          >
                            {isAdmin ? <Crown className="w-3.5 h-3.5" /> : <Users className="w-3.5 h-3.5" />}
                          </div>
                          <div className="min-w-0">
                            <div className="font-bold text-white flex items-center gap-1.5">
                              <span>{u.first_name || u.username || "Foydalanuvchi"}</span>
                              {u.username && (
                                <span className="text-[11px] text-slate-400 font-normal">@{u.username}</span>
                              )}
                            </div>
                            <span className="text-[10px] font-mono text-slate-500">ID: {u.telegram_id}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded-lg font-bold ${
                              isAdmin
                                ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                                : "bg-white/10 text-slate-400"
                            }`}
                          >
                            {isAdmin ? "Rahbar (Admin)" : u.role}
                          </span>

                          <button
                            onClick={async () => {
                              if (!confirm(`Haqiqatdan ham ${u.telegram_id} ni ushbu fandubdan chiqarmoqchimisiz?`)) return;
                              try {
                                const res = await adminFetch(
                                  `/api/v1/admin/fandubs/users?fandub_id=${selectedFandubForUsers.id}&telegram_id=${u.telegram_id}`,
                                  { method: "DELETE" }
                                );
                                const data = await res.json();
                                if (data.success) {
                                  setFandubUsers(fandubUsers.filter((x) => x.id !== u.id));
                                  showToast("Foydalanuvchi chiqarildi", "info");

                                  // Refresh fandub list to update card
                                  const fres = await adminFetch("/api/v1/admin/fandubs");
                                  const fdata = await fres.json();
                                  if (fdata.success && Array.isArray(fdata.data)) {
                                    setFandubs(fdata.data);
                                  }
                                } else {
                                  showToast(data.error || "Xatolik", "error");
                                }
                              } catch (e) {
                                showToast("Server xatosi", "error");
                              }
                            }}
                            className="p-1.5 rounded-lg bg-white/5 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition-colors"
                            title="Chiqarish"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 text-center text-xs text-slate-500">
                  Ushbu fandubga hali hech kim rahbar etib biriktirilmagan.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Fandub VIP & Contact Settings Modal */}
      {isFandubSettingsModalOpen && selectedFandubForSettings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="bg-[#0e1322] border border-amber-500/30 rounded-3xl p-6 w-full max-w-lg shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 font-bold">
                  ⚙️
                </div>
                <div>
                  <h3 className="font-black text-sm text-white">{selectedFandubForSettings.name} — VIP & Aloqa</h3>
                  <p className="text-[11px] text-slate-400">Telegram bot yoki admin profili, VIP narxi va kanallari</p>
                </div>
              </div>
              <button
                onClick={() => setIsFandubSettingsModalOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                setIsSavingFandubSettings(true);
                try {
                  const res = await adminFetch("/api/v1/admin/fandubs/settings", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      fandub_id: selectedFandubForSettings.id,
                      contact_url: fandubSettingsForm.contact_url || fandubSettingsForm.telegram_admin,
                      vip_price: Number(fandubSettingsForm.vip_price) || 10000,
                      telegram_admin: fandubSettingsForm.telegram_admin,
                      telegram_channel: fandubSettingsForm.telegram_channel,
                      card_number: fandubSettingsForm.card_number,
                      card_holder: fandubSettingsForm.card_holder,
                    }),
                  });
                  const data = await res.json();
                  if (data.success) {
                    showToast(`✅ "${selectedFandubForSettings.name}" VIP sozlamalari saqlandi!`, "success");
                    setIsFandubSettingsModalOpen(false);
                  } else {
                    showToast(data.error || "Xatolik yuz berdi", "error");
                  }
                } catch (err) {
                  showToast("Server xatosi", "error");
                } finally {
                  setIsSavingFandubSettings(false);
                }
              }}
              className="space-y-4"
            >
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <span className="text-amber-400">🤖</span> Telegram VIP Bot yoki Admin havolasi *
                </label>
                <input
                  type="text"
                  required
                  placeholder="https://t.me/iskurama yoki @iskurama"
                  value={fandubSettingsForm.contact_url}
                  onChange={(e) => setFandubSettingsForm({ ...fandubSettingsForm, contact_url: e.target.value })}
                  className="w-full bg-[#111728] border border-white/10 rounded-2xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:border-amber-500/60 focus:outline-none"
                />
                <p className="text-[10px] text-slate-500">
                  Tomoshabin qulflangan VIP qismda &quot;Fandub Adminga Yozish / VIP Olish&quot; tugmasini bosganda to&apos;g&apos;ridan-to&apos;g&apos;ri shu havola ochiladi.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                    <span className="text-rose-400">💰</span> VIP Narxi (so&apos;m/oy) *
                  </label>
                  <input
                    type="number"
                    min={1000}
                    step={1000}
                    required
                    value={fandubSettingsForm.vip_price}
                    onChange={(e) => setFandubSettingsForm({ ...fandubSettingsForm, vip_price: Number(e.target.value) })}
                    className="w-full bg-[#111728] border border-white/10 rounded-2xl px-4 py-2.5 text-xs text-white focus:border-amber-500/60 focus:outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                    <span className="text-cyan-400">📢</span> Rasmiy Telegram Kanal
                  </label>
                  <input
                    type="text"
                    placeholder="@hikakuz yoki https://t.me/hikakuz"
                    value={fandubSettingsForm.telegram_channel}
                    onChange={(e) => setFandubSettingsForm({ ...fandubSettingsForm, telegram_channel: e.target.value })}
                    className="w-full bg-[#111728] border border-white/10 rounded-2xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:border-cyan-500/60 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300">Karta Raqami (ixtiyoriy)</label>
                  <input
                    type="text"
                    placeholder="8600 0000 0000 0000"
                    value={fandubSettingsForm.card_number}
                    onChange={(e) => setFandubSettingsForm({ ...fandubSettingsForm, card_number: e.target.value })}
                    className="w-full bg-[#111728] border border-white/10 rounded-2xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:border-amber-500/60 focus:outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300">Karta Egasi Ismi (ixtiyoriy)</label>
                  <input
                    type="text"
                    placeholder="F.I.SH"
                    value={fandubSettingsForm.card_holder}
                    onChange={(e) => setFandubSettingsForm({ ...fandubSettingsForm, card_holder: e.target.value })}
                    className="w-full bg-[#111728] border border-white/10 rounded-2xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:border-amber-500/60 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsFandubSettingsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white transition-all"
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  disabled={isSavingFandubSettings}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-rose-600 hover:from-amber-400 hover:to-rose-500 text-white font-bold text-xs shadow-neon transition-all flex items-center gap-1.5"
                >
                  {isSavingFandubSettings ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Saqlanmoqda...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-3.5 h-3.5" />
                      <span>Saqlash</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

            {/* Episode Edit Modal (Mobile Responsive) */}
      {isEditEpisodeModalOpen && editingEpisode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="relative w-full max-w-xl bg-[#0c101c] border border-cyan-900/40 rounded-3xl p-6 sm:p-8 shadow-2xl max-h-[90vh] overflow-y-auto no-scrollbar space-y-5">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-base font-black text-white flex items-center gap-2">
                <Pencil className="w-5 h-5 text-cyan-400" />
                Epizodni Tahrirlash (#{editEpFormData.id})
              </h3>
              <button
                onClick={() => {
                  setIsEditEpisodeModalOpen(false);
                  setEditingEpisode(null);
                }}
                className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditEpisode} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <Mic className="w-3.5 h-3.5 text-rose-500" /> Fandub Studiyasi *
                </label>
                <select
                  value={editEpFormData.fandub_id || 1}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    const found = fandubs.find((f) => f.id === val);
                    const oldFound = fandubs.find((f) => f.id === editEpFormData.fandub_id);
                    let newTitle = editEpFormData.title;
                    if (found) {
                      if (oldFound && newTitle.includes(`(${oldFound.name})`)) {
                        newTitle = newTitle.replace(`(${oldFound.name})`, `(${found.name})`);
                      } else if (newTitle.match(/\s*\([^)]+\)$/)) {
                        newTitle = newTitle.replace(/\s*\([^)]+\)$/, "") + ` (${found.name})`;
                      } else if (newTitle.trim()) {
                        newTitle = `${newTitle} (${found.name})`;
                      }
                    }
                    setEditEpFormData({
                      ...editEpFormData,
                      fandub_id: val,
                      dub_studio: found ? found.name : editEpFormData.dub_studio,
                      title: newTitle,
                    });
                  }}
                  className="w-full bg-[#111728] border border-rose-500/30 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-rose-500 font-bold"
                  required
                >
                  {fandubs.map((f) => (
                    <option key={f.id} value={f.id}>
                      🎙️ {f.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-300">Tegishli Anime *</label>
                <select
                  value={editEpFormData.anime_id}
                  onChange={(e) => setEditEpFormData({ ...editEpFormData, anime_id: Number(e.target.value) })}
                  className="w-full bg-[#111728] border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-cyan-500"
                  required
                >
                  {animes.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.title_uz}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-300">Qism Raqami *</label>
                  <input
                    type="number"
                    value={editEpFormData.episode_number}
                    onChange={(e) => setEditEpFormData({ ...editEpFormData, episode_number: Number(e.target.value) })}
                    className="w-full bg-[#111728] border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-cyan-500"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-300">Qism Nomi / Sarlavhasi *</label>
                  <input
                    type="text"
                    value={editEpFormData.title}
                    onChange={(e) => setEditEpFormData({ ...editEpFormData, title: e.target.value })}
                    className="w-full bg-[#111728] border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-cyan-500"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-300">
                  Video Havolasi (URL yoki Backblaze B2 Key) *
                </label>
                <input
                  type="text"
                  value={editEpFormData.video_url}
                  onChange={(e) => setEditEpFormData({ ...editEpFormData, video_url: e.target.value })}
                  placeholder="https://... yoki episodes/anime_1/ep_1.mp4"
                  className="w-full bg-[#111728] border border-white/10 rounded-xl px-3 py-2 text-xs text-white font-mono outline-none focus:border-cyan-500"
                  required
                />
                <p className="text-[10px] text-slate-500">
                  To'g'ridan-to'g'ri MP4 havolasi, HLS .m3u8, yoki Backblaze B2 fayl kaliti.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-300">Ovoz beruvchi studiya / Dublyaj</label>
                  <input
                    type="text"
                    value={editEpFormData.dub_studio}
                    onChange={(e) => setEditEpFormData({ ...editEpFormData, dub_studio: e.target.value })}
                    placeholder="Masalan: Meteor Dub"
                    className="w-full bg-[#111728] border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-cyan-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-300">Qism Davomiyligi (sekund)</label>
                  <input
                    type="number"
                    value={editEpFormData.duration}
                    onChange={(e) => setEditEpFormData({ ...editEpFormData, duration: Number(e.target.value) })}
                    className="w-full bg-[#111728] border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-300">Miniatyura (Thumbnail) URL</label>
                <input
                  type="text"
                  value={editEpFormData.thumbnail_url}
                  onChange={(e) => setEditEpFormData({ ...editEpFormData, thumbnail_url: e.target.value })}
                  placeholder="https://... yoki thumbnails/..."
                  className="w-full bg-[#111728] border border-white/10 rounded-xl px-3 py-2 text-xs text-white font-mono outline-none focus:border-cyan-500"
                />
              </div>

              {/* Toggles */}
              <div className="flex flex-wrap items-center gap-6 pt-2 border-t border-white/5">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editEpFormData.is_vip_only}
                    onChange={(e) => setEditEpFormData({ ...editEpFormData, is_vip_only: e.target.checked })}
                    className="rounded border-white/20 text-amber-500 focus:ring-amber-500/30"
                  />
                  <span className="text-xs text-amber-300 font-bold flex items-center gap-1">
                    <Crown className="w-3.5 h-3.5 fill-amber-400" /> Faqat VIP obunachilar uchun
                  </span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editEpFormData.has_uzbek_dub}
                    onChange={(e) => setEditEpFormData({ ...editEpFormData, has_uzbek_dub: e.target.checked })}
                    className="rounded border-white/20 text-cyan-500 focus:ring-cyan-500/30"
                  />
                  <span className="text-xs text-slate-300 font-semibold flex items-center gap-1">
                    <Volume2 className="w-3.5 h-3.5 text-cyan-400" /> O'zbekcha ovoz mavjud
                  </span>
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditEpisodeModalOpen(false);
                    setEditingEpisode(null);
                  }}
                  className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-bold text-slate-300"
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-xs font-black text-white shadow-lg shadow-cyan-500/20 flex items-center gap-1.5"
                >
                  <Save className="w-4 h-4" />
                  <span>O'zgarishlarni Saqlash</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Assign / Edit Admin Modal */}
      {isAdminModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="bg-[#0c101c] border border-amber-500/40 rounded-3xl w-full max-w-md p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-2 text-amber-400">
                <ShieldCheck className="w-5 h-5" />
                <h3 className="font-black text-sm text-white">Yangi Admin / Xodim Tayinlash</h3>
              </div>
              <button
                onClick={() => setIsAdminModalOpen(false)}
                className="p-1 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveAdmin} className="space-y-4">
              {usersList.length > 0 && (
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-300">Mavjud foydalanuvchini tanlang</label>
                  <select
                    onChange={(e) => {
                      const sel = usersList.find(u => String(u.telegram_id) === e.target.value);
                      if (sel) {
                        setAdminForm({
                          ...adminForm,
                          telegram_id: String(sel.telegram_id || ""),
                          full_name: sel.full_name || sel.username || `User_${sel.telegram_id}`,
                        });
                      }
                    }}
                    className="w-full bg-[#111628] border border-white/10 rounded-xl px-3 py-2 text-xs text-amber-300 outline-none focus:border-amber-500"
                    defaultValue=""
                  >
                    <option value="" disabled>-- Foydalanuvchilar ro'yxatidan tanlash --</option>
                    {usersList.filter(u => u.telegram_id).map((u) => (
                      <option key={u.id} value={String(u.telegram_id)}>
                        {u.full_name || u.username} (TG ID: {u.telegram_id})
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-300">Telegram ID *</label>
                <input
                  type="number"
                  placeholder="Masalan: 123456789"
                  value={adminForm.telegram_id}
                  onChange={(e) => setAdminForm({ ...adminForm, telegram_id: e.target.value })}
                  required
                  className="w-full bg-[#111628] border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white outline-none focus:border-amber-500 font-mono"
                />
                <p className="text-[10px] text-slate-500">
                  Foydalanuvchining Telegram ID raqami (@userinfobot orqali olish mumkin)
                </p>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-300">Admin To'liq Ismi *</label>
                <input
                  type="text"
                  placeholder="Masalan: Ali Valiyev"
                  value={adminForm.full_name}
                  onChange={(e) => setAdminForm({ ...adminForm, full_name: e.target.value })}
                  required
                  className="w-full bg-[#111628] border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white outline-none focus:border-amber-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-300">Vakolat / Rol *</label>
                <select
                  value={adminForm.role}
                  onChange={(e) => setAdminForm({ ...adminForm, role: e.target.value as any })}
                  className="w-full bg-[#111628] border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white outline-none focus:border-amber-500"
                >
                  <option value="ADMIN">ADMIN - Kontent va VIP boshqaruvi</option>
                  <option value="MODERATOR">MODERATOR - Izohlar va danmaku nazorati</option>
                  {isFounder && (
                    <option value="SUPERADMIN">👑 SUPERADMIN - To'liq tizim huquqi (Faqat Founder tayinlaydi)</option>
                  )}
                </select>
                {!isFounder && (
                  <p className="text-[10px] text-amber-400/80">
                    ℹ️ SuperAdmin rolini faqat Asoschi (Founder) tayinlay oladi.
                  </p>
                )}
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsAdminModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-bold text-slate-300"
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  disabled={adminActionLoading}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-black text-xs font-black shadow-lg shadow-amber-500/20 flex items-center gap-1.5 disabled:opacity-50"
                >
                  {adminActionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  <span>Saqlash & Tayinlash</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
