"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Mic,
  Tv,
  Film,
  Upload,
  UploadCloud,
  Plus,
  Trash2,
  Edit,
  Save,
  X,
  Check,
  CheckCircle2,
  AlertTriangle,
  Users,
  Search,
  ChevronRight,
  Sparkles,
  ExternalLink,
  Shield,
  Loader2,
  Lock,
  Crown,
  Eye,
  Settings,
  ArrowLeft,
  Play,
  RefreshCw,
  Zap,
  CreditCard,
  Calendar,
  UserPlus,
  Clock,
  Coins,
  Receipt,
  FileCheck,
  Send,
  Palette,
  Megaphone,
  Globe,
  Instagram,
  MessageCircle,
  AtSign,
  Image as ImageIcon,
} from "lucide-react";
import { useAuth } from "@/context/auth-context";
import { Anime, Episode } from "@/types/anime";

interface StudioInfo {
  id: number;
  name: string;
  slug: string;
  logo_url: string;
  description: string;
  created_at: string;
}

interface StudioMember {
  id: number;
  fandub_id: number;
  telegram_id: number;
  role: string;
  username?: string;
  full_name?: string;
  created_at: string;
}

interface FandubVIPSettings {
  id: number;
  fandub_id: number;
  card_number: string;
  card_holder: string;
  vip_price: number;
  contact_url: string;
}

interface FandubVIPUser {
  id: number;
  fandub_id: number;
  user_id: number;
  telegram_id: number;
  full_name: string;
  username: string;
  days: number;
  expires_at: string;
  created_at: string;
}

interface FandubReceipt {
  id: number;
  fandub_id: number;
  user_id: number;
  telegram_id: number;
  image_file_id: string;
  amount: number;
  status: string;
  admin_note: string;
  created_at: string;
}

export default function FandubStudioPage() {
  const router = useRouter();
  const { user, isLoading: isAuthLoading, setIsAuthModalOpen, logout } = useAuth();

  const [studio, setStudio] = useState<StudioInfo | null>(null);
  const [role, setRole] = useState<string>("MEMBER");
  const [stats, setStats] = useState<{ episodes_count: number; animes_count: number }>({
    episodes_count: 0,
    animes_count: 0,
  });
  const [members, setMembers] = useState<StudioMember[]>([]);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [animes, setAnimes] = useState<Anime[]>([]);
  const [availableFandubs, setAvailableFandubs] = useState<StudioInfo[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [isUnauthorized, setIsUnauthorized] = useState(false);

  // Edit Studio Modal
  const [isEditStudioOpen, setIsEditStudioOpen] = useState(false);
  const [editName, setEditName] = useState("");
  const [editLogo, setEditLogo] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [isSavingStudio, setIsSavingStudio] = useState(false);

  // Team Members Modal & Management State
  const [isMembersModalOpen, setIsMembersModalOpen] = useState(false);
  const [newMemberInput, setNewMemberInput] = useState("");
  const [newMemberRole, setNewMemberRole] = useState("VOICE");
  const [isAddingMember, setIsAddingMember] = useState(false);
  const [isDeletingMemberId, setIsDeletingMemberId] = useState<number | null>(null);

  // Logo & Banner File Uploads to Storage
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [isUploadingBanner, setIsUploadingBanner] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);

  // Upload Form State (Real-time B2 Direct Upload Engine)
  const [selectedAnimeId, setSelectedAnimeId] = useState<number>(0);
  const [epNumber, setEpNumber] = useState<number>(1);
  const [epTitle, setEpTitle] = useState<string>("");
  const [epIsVIP, setEpIsVIP] = useState<boolean>(false);
  const [videoFileInfo, setVideoFileInfo] = useState<{ name: string; size: string } | null>(null);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadedB2Key, setUploadedB2Key] = useState<string>("");
  const [uploadedThumbUrl, setUploadedThumbUrl] = useState<string>("");
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadJob, setUploadJob] = useState<{ id: string; status: string; progress: number; message: string } | null>(null);
  const [isDraggingVideo, setIsDraggingVideo] = useState<boolean>(false);
  const [isSavingEpisode, setIsSavingEpisode] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const currentXhrRef = useRef<XMLHttpRequest | null>(null);
  const [animeComboboxQuery, setAnimeComboboxQuery] = useState("");
  const [isAnimeComboboxOpen, setIsAnimeComboboxOpen] = useState(false);
  const selectedAnimeIdRef = useRef<number>(0);
  const epNumberRef = useRef<number>(1);

  useEffect(() => {
    selectedAnimeIdRef.current = selectedAnimeId;
  }, [selectedAnimeId]);

  useEffect(() => {
    epNumberRef.current = epNumber;
  }, [epNumber]);

  // Edit Episode Modal
  const [editingEp, setEditingEp] = useState<Episode | null>(null);
  const [editEpTitle, setEditEpTitle] = useState("");
  const [editEpNumber, setEditEpNumber] = useState(1);
  const [editEpIsVIP, setEditEpIsVIP] = useState(false);
  const [isSavingEpEdit, setIsSavingEpEdit] = useState(false);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState("");
  const [filterAnimeId, setFilterAnimeId] = useState<number>(0);

  // Toast
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  // VIP & Customization Management State
  const [activeStudioTab, setActiveStudioTab] = useState<"episodes" | "vip" | "customization">("episodes");
  const [vipSettings, setVipSettings] = useState<FandubVIPSettings | null>(null);
  const [cardNumber, setCardNumber] = useState("");
  const [cardHolder, setCardHolder] = useState("");
  const [vipPrice, setVipPrice] = useState<number>(10000);
  const [contactUrl, setContactUrl] = useState("");
  const [isSavingVIPSettings, setIsSavingVIPSettings] = useState(false);

  // Customization & Socials State
  const [themeColor, setThemeColor] = useState<string>("amber");
  const [bannerUrl, setBannerUrl] = useState<string>("");
  const [telegramChannel, setTelegramChannel] = useState<string>("");
  const [telegramAdmin, setTelegramAdmin] = useState<string>("");
  const [telegramAds, setTelegramAds] = useState<string>("");
  const [instagramUrl, setInstagramUrl] = useState<string>("");
  const [announcementText, setAnnouncementText] = useState<string>("");
  const [announcementActive, setAnnouncementActive] = useState<boolean>(false);
  const [isSavingCustomProfile, setIsSavingCustomProfile] = useState<boolean>(false);

  const [vipUsers, setVipUsers] = useState<FandubVIPUser[]>([]);
  const [isLoadingVIPUsers, setIsLoadingVIPUsers] = useState(false);
  const [vipSearchQuery, setVipSearchQuery] = useState("");
  const [isAddVIPModalOpen, setIsAddVIPModalOpen] = useState(false);
  const [newVIPTgId, setNewVIPTgId] = useState("");
  const [newVIPFullName, setNewVIPFullName] = useState("");
  const [newVIPUsername, setNewVIPUsername] = useState("");
  const [newVIPDays, setNewVIPDays] = useState<number>(30);
  const [isGrantingVIP, setIsGrantingVIP] = useState(false);

  const [receipts, setReceipts] = useState<FandubReceipt[]>([]);
  const [receiptTab, setReceiptTab] = useState<"ALL" | "PENDING">("PENDING");

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4500);
  };

  const getTgId = (): number => {
    if (user?.telegram_id) return user.telegram_id;
    if (user?.id && !user?.email) return user.id;
    if (user?.is_admin) return 5415350162;
    return 0;
  };

  // Team Member Management Handlers
  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studio || !newMemberInput.trim()) return;
    setIsAddingMember(true);
    try {
      const tgId = getTgId();
      const isNum = /^\d+$/.test(newMemberInput.trim());
      const payload: any = {
        role: newMemberRole,
      };
      if (isNum) {
        payload.telegram_id = Number(newMemberInput.trim());
      } else {
        payload.username = newMemberInput.trim();
      }
      const res = await fetch(`/api/v1/fandub/members?fandub_id=${studio.id}&telegram_id=${tgId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        showToast("🎉 Jamoadosh muvaffaqiyatli qo'shildi!");
        setNewMemberInput("");
        const mRes = await fetch(`/api/v1/fandub/members?fandub_id=${studio.id}&telegram_id=${tgId}`);
        const mData = await mRes.json();
        if (mData.success && mData.members) {
          setMembers(mData.members);
        }
      } else {
        showToast(data.error || "Jamoadoshni qo'shishda xatolik", "error");
      }
    } catch (err) {
      showToast("Server xatosi", "error");
    } finally {
      setIsAddingMember(false);
    }
  };

  const handleRemoveMember = async (memberId: number, memberTgId: number) => {
    if (!studio || !confirm("Ushbu a'zoni jamoangizdan chiqarishni tasdiqlaysizmi?")) return;
    setIsDeletingMemberId(memberId);
    try {
      const tgId = getTgId();
      const res = await fetch(`/api/v1/fandub/members?fandub_id=${studio.id}&telegram_id=${tgId}&id=${memberId}&target_tg_id=${memberTgId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        showToast("Jamoadosh muvaffaqiyatli chiqarildi");
        setMembers((prev) => prev.filter((m) => m.id !== memberId));
      } else {
        showToast(data.error || "O'chirishda xatolik", "error");
      }
    } catch (err) {
      showToast("Server xatosi", "error");
    } finally {
      setIsDeletingMemberId(null);
    }
  };

  // Image Upload / Delete Handlers (B2 / Local Storage)
  const handleUploadImage = async (file: File, type: "logo" | "banner") => {
    if (!studio) return;
    if (type === "logo") setIsUploadingLogo(true);
    else setIsUploadingBanner(true);

    try {
      const tgId = getTgId();
      const formData = new FormData();
      formData.append("file", file);
      formData.append("type", type);
      formData.append("fandub_id", studio.id.toString());

      const res = await fetch(`/api/v1/fandub/upload-image?telegram_id=${tgId}`, {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (data.success && data.url) {
        showToast(`🎉 ${type === "logo" ? "Logotip" : "Fon banneri"} muvaffaqiyatli saqlandi!`);
        if (type === "logo") {
          setStudio((prev) => prev ? { ...prev, logo_url: data.url } : null);
          setEditLogo(data.url);
        } else {
          setBannerUrl(data.url);
        }
      } else {
        showToast(data.error || "Rasmni yuklashda xatolik", "error");
      }
    } catch (err) {
      showToast("Rasmni yuklashda server xatosi", "error");
    } finally {
      if (type === "logo") setIsUploadingLogo(false);
      else setIsUploadingBanner(false);
    }
  };

  const handleDeleteImage = async (type: "logo" | "banner") => {
    if (!studio || !confirm(`${type === "logo" ? "Logotipni" : "Fon bannerini"} butunlay o'chirishni tasdiqlaysizmi?`)) return;
    try {
      const tgId = getTgId();
      const res = await fetch(`/api/v1/fandub/delete-image?fandub_id=${studio.id}&type=${type}&telegram_id=${tgId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        showToast(`${type === "logo" ? "Logotip" : "Fon banneri"} o'chirildi`);
        if (type === "logo") {
          setStudio((prev) => prev ? { ...prev, logo_url: "" } : null);
          setEditLogo("");
        } else {
          setBannerUrl("");
        }
      } else {
        showToast(data.error || "O'chirishda xatolik", "error");
      }
    } catch (err) {
      showToast("Server xatosi", "error");
    }
  };

  // 1. Initial Load & Auth Check
  useEffect(() => {
    if (isAuthLoading) return;

    if (!user) {
      setIsLoading(false);
      return;
    }

    const tgId = getTgId();
    if (!tgId && !user.is_admin) {
      setIsLoading(false);
      return;
    }

    loadStudioData(tgId);
  }, [user, isAuthLoading]);

  const loadStudioData = async (tgId: number, targetFandubId?: number) => {
    setIsLoading(true);
    setIsUnauthorized(false);
    try {
      // 1. Get Studio Info
      const url = targetFandubId 
        ? `/api/v1/fandub/my-studio?telegram_id=${tgId}&fandub_id=${targetFandubId}`
        : `/api/v1/fandub/my-studio?telegram_id=${tgId}`;
      const res = await fetch(url);
      if (!res.ok) {
        setIsUnauthorized(true);
        setIsLoading(false);
        return;
      }
      const data = await res.json();
      if (!data.success || !data.fandub) {
        setIsUnauthorized(true);
        setIsLoading(false);
        return;
      }

      setStudio(data.fandub);
      setRole(data.role || "MEMBER");
      if (data.stats) setStats(data.stats);
      if (data.members) setMembers(data.members);
      if (Array.isArray(data.available_fandubs)) setAvailableFandubs(data.available_fandubs);

      setEditName(data.fandub.name || "");
      setEditLogo(data.fandub.logo_url || "");
      setEditDesc(data.fandub.description || "");

      // 2. Load Studio Episodes & VIP Data (isolated to avoid blocking studio on minor errors)
      try {
        await loadStudioEpisodes(tgId, data.fandub.id);
      } catch (epErr) {
        console.error("Studio episodes fetch error:", epErr);
      }

      try {
        await loadVIPData(tgId, data.fandub.id);
      } catch (vipErr) {
        console.error("Studio VIP data fetch error:", vipErr);
      }

      try {
        await loadCustomProfileData(tgId, data.fandub.id);
      } catch (cpErr) {
        console.error("Studio custom profile fetch error:", cpErr);
      }

      // 3. Load Animes for dropdown (all 356+ from archive)
      try {
        const animeRes = await fetch("/api/v1/fandub/animes");
        const animeData = await animeRes.json();
        if (animeData.success && Array.isArray(animeData.data)) {
          setAnimes(animeData.data);
        }
      } catch (animeErr) {
        console.error("Animes dropdown fetch error:", animeErr);
      }
    } catch (e) {
      console.error("loadStudioData error:", e);
      setIsUnauthorized(true);
    } finally {
      setIsLoading(false);
    }
  };

  const loadStudioEpisodes = async (tgId: number, targetFandubId?: number) => {
    try {
      const fdId = targetFandubId || studio?.id;
      const res = await fetch(`/api/v1/fandub/episodes?telegram_id=${tgId}${fdId ? `&fandub_id=${fdId}` : ''}`);
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setEpisodes(data.data);
      }
    } catch (e) {
      console.error("Ep fetch error:", e);
    }
  };

  // Handle Anime selection (keep episode number intact as entered/detected)
  const handleAnimeChange = (animeId: number) => {
    setSelectedAnimeId(animeId);
    selectedAnimeIdRef.current = animeId;
    if (!animeId) return;
    const currentNum = epNumber > 0 ? epNumber : 1;
    setEpNumber(currentNum);
    setEpTitle(`${currentNum}-qism (${studio?.name || "Ovoz"})`);
  };

  // Save Studio Profile
  const handleSaveStudioProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    const tgId = getTgId();
    if (!tgId) return;

    setIsSavingStudio(true);
    try {
      const res = await fetch(`/api/v1/fandub/my-studio?telegram_id=${tgId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editName.trim(),
          logo_url: editLogo.trim(),
          description: editDesc.trim(),
        }),
      });
      const data = await res.json();
      if (data.success) {
        setStudio((prev) =>
          prev
            ? {
                ...prev,
                name: editName.trim(),
                logo_url: editLogo.trim(),
                description: editDesc.trim(),
              }
            : null
        );
        setIsEditStudioOpen(false);
        showToast("✅ Studiya ma'lumotlari yangilandi!");
      } else {
        showToast(data.error || "Xatolik yuz berdi", "error");
      }
    } catch (err) {
      console.error(err);
      showToast("Server xatosi", "error");
    } finally {
      setIsSavingStudio(false);
    }
  };

  // Helper: auto-detect episode number from filename
  const parseEpisodeFromFilename = (filename: string): number | null => {
    // 1. Common anime patterns: ep_05, ep5, episode 12, qism 3, seriya 2, e04, s01e05
    const epPatternMatch = filename.match(/(?:ep|episode|qism|seriya|e|s\d+e)\s*[-_.]?\s*0*(\d+)/i);
    if (epPatternMatch && epPatternMatch[1]) {
      const num = parseInt(epPatternMatch[1], 10);
      if (!isNaN(num) && num > 0) return num;
    }
    // 2. Trailing numbers before extension: kaiju_01.mp4, qora_mashala_1.mp4
    const trailingMatch = filename.replace(/\.[^/.]+$/, "").match(/[-_.\s]0*(\d+)$/);
    if (trailingMatch && trailingMatch[1]) {
      const num = parseInt(trailingMatch[1], 10);
      if (!isNaN(num) && num > 0) return num;
    }
    return null;
  };

  // Handle Video File Drop / Select (Direct B2 Upload)
  const handleVideoFileSelect = (file: File) => {
    if (!selectedAnimeId && selectedAnimeIdRef.current <= 0) {
      showToast("⚠️ Iltimos, avval 1-bosqichda animeni tanlang!", "error");
      setIsAnimeComboboxOpen(true);
      return;
    }

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

    // Auto-detect ep number from file name (prioritize detected episode if present)
    const detectedEp = parseEpisodeFromFilename(file.name);
    let targetEp = epNumber;
    if (detectedEp) {
      targetEp = detectedEp;
      setEpNumber(detectedEp);
      setEpTitle(`${detectedEp}-qism (${studio?.name || "Ovoz"})`);
      showToast(`🎯 Fayl nomidan ${detectedEp}-qism avtomatik aniqlandi!`, "success");
    }

    startDirectB2Upload(file, targetEp);
  };

  // Retry upload if stopped/failed
  const handleRetryUpload = () => {
    if (!selectedAnimeId && selectedAnimeIdRef.current <= 0) {
      showToast("⚠️ Iltimos, avval animeni tanlang!", "error");
      setIsAnimeComboboxOpen(true);
      return;
    }
    if (uploadFile) {
      startDirectB2Upload(uploadFile, epNumber);
    } else {
      fileInputRef.current?.click();
    }
  };

  // Direct B2 Upload with Real-time Progress
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
      const tgId = getTgId();
      const currentAnimeId = selectedAnimeIdRef.current || selectedAnimeId || 0;
      const ticketRes = await fetch(
        `/api/v1/fandub/b2-upload-ticket?file_name=${encodeURIComponent(file.name)}&episode_number=${targetEpNum}&anime_id=${currentAnimeId}&telegram_id=${tgId}${studio?.id ? `&fandub_id=${studio.id}` : ''}`
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
            const hlsRes = await fetch(`/api/v1/fandub/convert-hls?telegram_id=${tgId}${studio?.id ? `&fandub_id=${studio.id}` : ''}`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                b2_key: finalKey,
                anime_id: selectedAnimeIdRef.current || selectedAnimeId || 0,
                episode_number: targetEpNum,
                fandub_id: studio?.id,
              }),
            });
            const hlsData = await hlsRes.json();
            if (!hlsData.success) {
              throw new Error(hlsData.error || "HLS ga o'tkazish boshlanmadi");
            }

            if (hlsData.status === "completed" && (hlsData.result_key || hlsData.b2_key)) {
              finalKey = hlsData.result_key || hlsData.b2_key;
            } else if (hlsData.job_id) {
              const pollJobId = hlsData.job_id;
              const pollHLS = async (): Promise<string> => {
                return new Promise((resolve, reject) => {
                  const pollTimer = setInterval(async () => {
                    try {
                      const stRes = await fetch(`/api/v1/fandub/convert-hls/status?job_id=${pollJobId}&telegram_id=${tgId}`);
                      const stData = await stRes.json();
                      if (stData.success && stData.job) {
                        const j = stData.job;
                        setUploadJob({
                          id: "direct-b2",
                          status: j.status === "completed" ? "completed" : "processing",
                          progress: Math.max(50, j.progress || 50),
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
                      console.error("Fandub HLS poll error:", pollErr);
                    }
                  }, 1500);
                });
              };
              finalKey = await pollHLS();
            }
          } catch (convErr: any) {
            console.error("Fandub HLS conversion fatal error:", convErr);
            setIsUploading(false);
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
            setUploadJob(null);
            setUploadedB2Key("");
            showToast("❌ Xatolik: Video .m3u8 formatini olmadi! Saqlash bekor qilindi.", "error");
            return;
          }

          setUploadedB2Key(finalKey);
          setIsUploading(false);
          setUploadJob({
            id: "direct-b2",
            status: "completed",
            progress: 100,
            message: "🎉 Video muvaffaqiyatli HLS formatiga o'tkazildi va B2 bulutiga saqlandi!",
          });
          showToast("🎉 Video HLS formatiga o'tkazildi!", "success");
        } else {
          setIsUploading(false);
          setUploadJob(null);
          showToast(`B2 ga yuklashda xatolik: HTTP ${xhr.status}`, "error");
        }
      };

      xhr.onerror = () => {
        currentXhrRef.current = null;
        setIsUploading(false);
        setUploadJob(null);
        showToast("Tarmoq xatosi: B2 ga yuklab bo'lmadi", "error");
      };

      xhr.send(file);
    } catch (e: any) {
      setIsUploading(false);
      setUploadJob(null);
      showToast("Yuklashni boshlashda xatolik: " + (e?.message || e), "error");
    }
  };

  // Save Episode to DB (Upsert Handled)
  const handleSaveEpisode = async (e: React.FormEvent) => {
    e.preventDefault();
    const tgId = getTgId();
    if (!tgId) {
      showToast("Avtorizatsiya topilmadi", "error");
      return;
    }

    if (!selectedAnimeId) {
      showToast("Iltimos, animeni tanlang", "error");
      return;
    }
    if (isUploading) {
      showToast("Video hali B2 ga to'liq yuklanmoqda, kuting...", "error");
      return;
    }
    if (!uploadedB2Key) {
      showToast("Avval video faylni yuklang!", "error");
      return;
    }

    if (!uploadedB2Key.endsWith(".m3u8")) {
      showToast("❌ Qat'iy qoida: Qism faqat HLS (.m3u8) formatida saqlanishi shart! Video hali HLS ga o'tkazilmagan.", "error");
      return;
    }

    setIsSavingEpisode(true);
    try {
      const res = await fetch(`/api/v1/fandub/upload-episode?telegram_id=${tgId}${studio?.id ? `&fandub_id=${studio.id}` : ''}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          anime_id: selectedAnimeId,
          episode_number: epNumber,
          title: epTitle.trim() || `${epNumber}-qism (${studio?.name})`,
          b2_key: uploadedB2Key,
          thumbnail_url: uploadedThumbUrl,
          is_vip_only: epIsVIP,
          fandub_id: studio?.id,
        }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(`🎉 ${data.message || "Qism muvaffaqiyatli saqlandi!"}`);

        // Update or Prepend in local state
        const newEp: Episode = {
          id: data.episode_id || Date.now(),
          anime_id: selectedAnimeId,
          episode_number: epNumber,
          title: epTitle.trim() || `${epNumber}-qism (${studio?.name})`,
          stream_url: "",
          b2_key: uploadedB2Key,
          thumbnail_url: uploadedThumbUrl,
          duration: 1440,
          is_vip_only: epIsVIP,
          has_uzbek_dub: true,
          has_subtitles: true,
          fandub_id: studio?.id || 1,
        };

        setEpisodes((prev) => {
          const idx = prev.findIndex((ep) => ep.anime_id === selectedAnimeId && ep.episode_number === epNumber);
          if (idx >= 0) {
            const updated = [...prev];
            updated[idx] = { ...updated[idx], ...newEp };
            return updated;
          }
          return [newEp, ...prev];
        });

        // Reset upload inputs
        setUploadedB2Key("");
        setUploadFile(null);
        setVideoFileInfo(null);
        setUploadJob(null);

        // Advance to next episode
        setEpNumber((prev) => prev + 1);
        setEpTitle(`${epNumber + 1}-qism (${studio?.name || "Ovoz"})`);

        // Reload episodes in background
        loadStudioEpisodes(tgId, studio?.id);
      } else {
        showToast(data.error || "Epizodni saqlashda xatolik", "error");
      }
    } catch (err) {
      console.error(err);
      showToast("Server bilan bog'lanishda xatolik", "error");
    } finally {
      setIsSavingEpisode(false);
    }
  };

  // Open Edit Modal
  const openEditModal = (ep: Episode) => {
    setEditingEp(ep);
    setEditEpTitle(ep.title);
    setEditEpNumber(ep.episode_number);
    setEditEpIsVIP(ep.is_vip_only);
  };

  // Save Edit Episode
  const handleSaveEpEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEp) return;
    const tgId = getTgId();
    if (!tgId) return;

    setIsSavingEpEdit(true);
    try {
      const res = await fetch(`/api/v1/fandub/episode?telegram_id=${tgId}${studio?.id ? `&fandub_id=${studio.id}` : ''}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingEp.id,
          episode_number: editEpNumber,
          title: editEpTitle.trim(),
          is_vip_only: editEpIsVIP,
          b2_key: editingEp.b2_key,
          fandub_id: studio?.id,
        }),
      });
      const data = await res.json();
      if (data.success) {
        showToast("✅ Epizod muvaffaqiyatli yangilandi!");
        setEditingEp(null);
        await loadStudioEpisodes(tgId, studio?.id);
      } else {
        showToast(data.error || "Xatolik", "error");
      }
    } catch (err) {
      console.error(err);
      showToast("Server xatosi", "error");
    } finally {
      setIsSavingEpEdit(false);
    }
  };

  // Delete Episode
  const handleDeleteEpisode = async (epId: number) => {
    if (!confirm("Haqiqatan ham ushbu qismni o'chirmoqchimisiz?")) return;
    const tgId = getTgId();
    if (!tgId) return;

    try {
      const res = await fetch(`/api/v1/fandub/episode?telegram_id=${tgId}&id=${epId}${studio?.id ? `&fandub_id=${studio.id}` : ''}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        showToast("🗑️ Epizod o'chirildi!");
        setEpisodes(episodes.filter((e) => e.id !== epId));
      } else {
        showToast(data.error || "O'chirishda xatolik", "error");
      }
    } catch (err) {
      console.error(err);
      showToast("Server xatosi", "error");
    }
  };

  // 1. Loading Screen
  if (isAuthLoading || (isLoading && user && (getTgId() || user.is_admin))) {
    return (
      <main className="min-h-screen bg-[#050711] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
          <span className="text-xs font-bold text-slate-400">Fandub studiyasi yuklanmoqda...</span>
        </div>
      </main>
    );
  }

  // 2. 404 Stealth Screen for Unauthorized / Unauthenticated Users
  if (isUnauthorized || !user || (!getTgId() && !user.is_admin)) {
    return (
      <main className="min-h-screen bg-[#050711] text-white flex flex-col items-center justify-center p-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-radial-vignette opacity-70 pointer-events-none" />
        <div className="relative z-10 max-w-md w-full bg-[#0a0e1e]/90 border border-white/10 rounded-3xl p-8 backdrop-blur-2xl text-center shadow-2xl space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-500 flex items-center justify-center mx-auto shadow-neon">
            <Shield className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-3xl font-black tracking-tight text-white mb-2">404</h1>
            <p className="text-sm font-semibold text-slate-300">
              Sahifa topilmadi yoki ushbu Fandub studiyasiga kirish huquqiga ega emassiz.
            </p>
          </div>
          <p className="text-xs text-slate-500 leading-relaxed">
            Fandub studiyasi portali faqat Superadmin tomonidan tasdiqlangan ovoz beruvchilar va uploaderlar uchun ochiq.
          </p>
          <div className="pt-2">
            <Link
              href="/"
              className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold text-xs transition-all active:scale-98"
            >
              <ArrowLeft className="w-4 h-4" /> Bosh sahifaga qaytish
            </Link>
          </div>
        </div>
      </main>
    );
  }

  // Custom Profile & Styling Loader
  const loadCustomProfileData = async (tgId: number, fandubId: number) => {
    try {
      const res = await fetch(`/api/v1/fandub/custom-profile?telegram_id=${tgId}&fandub_id=${fandubId}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.profile) {
          setThemeColor(data.profile.theme_color || "amber");
          setBannerUrl(data.profile.banner_url || "");
          setTelegramChannel(data.profile.telegram_channel || "");
          setTelegramAdmin(data.profile.telegram_admin || "");
          setTelegramAds(data.profile.telegram_ads || "");
          setInstagramUrl(data.profile.instagram_url || "");
          setAnnouncementText(data.profile.announcement_text || "");
          setAnnouncementActive(Boolean(data.profile.announcement_active));
        }
      }
    } catch (err) {
      console.error("Custom profile fetch error:", err);
    }
  };

  const handleSaveCustomProfile = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!studio) return;
    const tgId = getTgId();
    if (!tgId) {
      showToast("Telegram sessiyasi topilmadi", "error");
      return;
    }

    setIsSavingCustomProfile(true);
    try {
      const res = await fetch(`/api/v1/fandub/custom-profile?telegram_id=${tgId}&fandub_id=${studio.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fandub_id: studio.id,
          logo_url: editLogo.trim(),
          theme_color: themeColor,
          banner_url: bannerUrl.trim(),
          telegram_channel: telegramChannel.trim(),
          telegram_admin: telegramAdmin.trim(),
          telegram_ads: telegramAds.trim(),
          instagram_url: instagramUrl.trim(),
          announcement_text: announcementText.trim(),
          announcement_active: announcementActive,
        }),
      });

      const data = await res.json();
      if (data.success) {
        showToast("🎨 Dizayn va aloqa sozlamalari muvaffaqiyatli saqlandi!", "success");
        if (editLogo.trim()) {
          setStudio((prev) => (prev ? { ...prev, logo_url: editLogo.trim() } : null));
        }
      } else {
        showToast(data.error || "Saqlashda xatolik yuz berdi", "error");
      }
    } catch (err) {
      console.error("Save custom profile error:", err);
      showToast("Server bilan aloqa uzildi", "error");
    } finally {
      setIsSavingCustomProfile(false);
    }
  };

  // VIP Data Loader
  const loadVIPData = async (tgId: number, targetFandubId?: number) => {
    setIsLoadingVIPUsers(true);
    try {
      const fdId = targetFandubId || studio?.id;
      const fdQuery = fdId ? `&fandub_id=${fdId}` : "";
      const [setRes, usersRes, recRes] = await Promise.all([
        fetch(`/api/v1/fandub/settings?telegram_id=${tgId}${fdQuery}`),
        fetch(`/api/v1/fandub/vip-users?telegram_id=${tgId}${fdQuery}`),
        fetch(`/api/v1/fandub/receipts?telegram_id=${tgId}${fdQuery}`),
      ]);

      if (setRes.ok) {
        const setData = await setRes.json();
        if (setData.success && setData.settings) {
          setVipSettings(setData.settings);
          setCardNumber(setData.settings.card_number || "");
          setCardHolder(setData.settings.card_holder || "");
          setVipPrice(setData.settings.vip_price || 10000);
          setContactUrl(setData.settings.contact_url || "");
        }
      }

      if (usersRes.ok) {
        const usersData = await usersRes.json();
        if (usersData.success && Array.isArray(usersData.users)) {
          setVipUsers(usersData.users);
        }
      }

      if (recRes.ok) {
        const recData = await recRes.json();
        if (recData.success && Array.isArray(recData.receipts)) {
          setReceipts(recData.receipts);
        }
      }
    } catch (e) {
      console.error("Error loading VIP data:", e);
    } finally {
      setIsLoadingVIPUsers(false);
    }
  };

  // Save VIP Settings
  const handleSaveVIPSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    const tgId = getTgId();
    if (!tgId) return;

    setIsSavingVIPSettings(true);
    try {
      const res = await fetch(`/api/v1/fandub/settings?telegram_id=${tgId}${studio?.id ? `&fandub_id=${studio.id}` : ''}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          card_number: cardNumber.trim(),
          card_holder: cardHolder.trim(),
          vip_price: Number(vipPrice) || 10000,
          contact_url: contactUrl.trim(),
          fandub_id: studio?.id,
        }),
      });
      const data = await res.json();
      if (data.success) {
        showToast("VIP sozlamalari muvaffaqiyatli saqlandi!", "success");
        if (data.settings) setVipSettings(data.settings);
      } else {
        showToast(data.error || "Xatolik yuz berdi", "error");
      }
    } catch (e) {
      showToast("Server bilan bog'lanishda xatolik", "error");
    } finally {
      setIsSavingVIPSettings(false);
    }
  };

  // Grant VIP User
  const handleGrantVIPUser = async (e: React.FormEvent) => {
    e.preventDefault();
    const tgId = getTgId();
    if (!tgId) return;
    const targetTg = Number(newVIPTgId.trim());
    if (!targetTg) {
      showToast("Telegram ID kiritilishi shart!", "error");
      return;
    }

    setIsGrantingVIP(true);
    try {
      const res = await fetch(`/api/v1/fandub/vip-users/grant?telegram_id=${tgId}${studio?.id ? `&fandub_id=${studio.id}` : ''}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          target_telegram_id: targetTg,
          telegram_id: targetTg,
          full_name: newVIPFullName.trim() || `User_${targetTg}`,
          username: newVIPUsername.trim(),
          days: Number(newVIPDays) || 30,
          fandub_id: studio?.id,
        }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(`${newVIPFullName || targetTg} uchun VIP muvaffaqiyatli faollashtirildi!`, "success");
        setIsAddVIPModalOpen(false);
        setNewVIPTgId("");
        setNewVIPFullName("");
        setNewVIPUsername("");
        setNewVIPDays(30);
        await loadVIPData(tgId, studio?.id);
      } else {
        showToast(data.error || "Xatolik yuz berdi", "error");
      }
    } catch (e) {
      showToast("Server bilan bog'lanishda xatolik", "error");
    } finally {
      setIsGrantingVIP(false);
    }
  };

  // Revoke VIP User
  const handleRevokeVIPUser = async (targetTgId: number, targetName: string) => {
    if (!confirm(`${targetName || targetTgId} dan VIP maqomini olib tashlamoqchimisiz?`)) return;
    const tgId = getTgId();
    if (!tgId) return;

    try {
      const res = await fetch(`/api/v1/fandub/vip-users/revoke?telegram_id=${tgId}${studio?.id ? `&fandub_id=${studio.id}` : ''}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target_telegram_id: targetTgId, telegram_id: targetTgId, fandub_id: studio?.id }),
      });
      const data = await res.json();
      if (data.success) {
        showToast("VIP muvaffaqiyatli bekor qilindi", "success");
        setVipUsers((prev) => prev.filter((u) => u.telegram_id !== targetTgId));
      } else {
        showToast(data.error || "Xatolik yuz berdi", "error");
      }
    } catch (e) {
      showToast("Server bilan bog'lanishda xatolik", "error");
    }
  };

  // Approve Receipt
  const handleApproveReceipt = async (receiptId: number, days: number = 30) => {
    const tgId = getTgId();
    if (!tgId) return;
    try {
      const res = await fetch(`/api/v1/fandub/receipts/approve?telegram_id=${tgId}${studio?.id ? `&fandub_id=${studio.id}` : ''}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ receipt_id: receiptId, days, fandub_id: studio?.id }),
      });
      const data = await res.json();
      if (data.success) {
        showToast("To'lov cheki tasdiqlandi va VIP berildi!", "success");
        await loadVIPData(tgId, studio?.id);
      } else {
        showToast(data.error || "Xatolik yuz berdi", "error");
      }
    } catch (e) {
      showToast("Xatolik yuz berdi", "error");
    }
  };

  // Reject Receipt
  const handleRejectReceipt = async (receiptId: number) => {
    const tgId = getTgId();
    if (!tgId) return;
    const note = prompt("Rad etish sababi:") || "Rad etildi";
    try {
      const res = await fetch(`/api/v1/fandub/receipts/reject?telegram_id=${tgId}${studio?.id ? `&fandub_id=${studio.id}` : ''}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ receipt_id: receiptId, note, admin_note: note, fandub_id: studio?.id }),
      });
      const data = await res.json();
      if (data.success) {
        showToast("Chek rad etildi", "success");
        await loadVIPData(tgId, studio?.id);
      } else {
        showToast(data.error || "Xatolik yuz berdi", "error");
      }
    } catch (e) {
      showToast("Xatolik yuz berdi", "error");
    }
  };

  // Filtered Episodes
  const filteredEpisodes = episodes.filter((ep) => {
    const matchesSearch =
      ep.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (ep.anime_title && ep.anime_title.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesAnime = filterAnimeId === 0 || ep.anime_id === filterAnimeId;
    return matchesSearch && matchesAnime;
  });

  return (
    <main className="min-h-screen bg-[#050711] text-slate-100 pb-24 pt-4 sm:pt-8 px-4 sm:px-6 lg:px-8 relative">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed top-5 right-5 z-50 flex items-center gap-2.5 px-4 py-3 rounded-2xl shadow-2xl border text-xs font-black backdrop-blur-xl transition-all duration-300 animate-in fade-in slide-in-from-top-4 ${
            toast.type === "success"
              ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-300 shadow-[0_0_25px_rgba(16,185,129,0.3)]"
              : "bg-rose-500/20 border-rose-500/40 text-rose-300 shadow-[0_0_25px_rgba(244,63,94,0.3)]"
          }`}
        >
          {toast.type === "success" ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
          )}
          <span>{toast.message}</span>
        </div>
      )}

      <div className="max-w-6xl mx-auto space-y-6">
        {/* Top Header & Breadcrumb */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-400">
            <Link href="/" className="hover:text-white transition-colors">
              Hikaku
            </Link>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-indigo-400 font-black">Fandub Studio</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsMembersModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-slate-300 transition-all"
            >
              <Users className="w-3.5 h-3.5 text-indigo-400" /> Jamoa ({members.length})
            </button>

            <Link
              href="/"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-slate-300 transition-all"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Saytga Qaytish
            </Link>
          </div>
        </div>

        {/* Hero Studio Banner */}
        <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-indigo-950/40 via-[#0b0e20] to-[#080b18] border border-indigo-500/20 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="flex items-center gap-5">
              <div className="relative">
                {studio?.logo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={studio.logo_url}
                    alt={studio.name}
                    className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl object-cover border-2 border-indigo-500/40 shadow-neon"
                  />
                ) : (
                  <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-gradient-to-br from-indigo-600 to-rose-600 flex items-center justify-center text-white shadow-neon">
                    <Mic className="w-10 h-10" />
                  </div>
                )}
                <div className="absolute -bottom-2 -right-2 px-2 py-0.5 rounded-full bg-indigo-600 text-white text-[10px] font-black uppercase tracking-wider border border-white/20 shadow">
                  {role}
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center gap-3">
                  <h1 className="text-xl sm:text-2xl font-black text-white">{studio?.name}</h1>
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-[10px] font-black">
                    🟢 Faol Studiya
                  </span>
                </div>
                <p className="text-xs text-slate-400 max-w-xl line-clamp-2">
                  {studio?.description || "Ushbu studiya Hikaku Anime platformasida o'zbekcha dublyajlar yuklab boradi."}
                </p>
                <div className="flex flex-wrap items-center gap-3 pt-1 text-[11px] text-slate-400">
                  <span>🎬 Siz yuklagan epizodlar: <b className="text-white">{episodes.length} ta</b></span>
                  <span>•</span>
                  <span>👥 Jamoa: <b className="text-white">{members.length} kishi</b></span>
                </div>
                {availableFandubs.length > 1 && (
                  <div className="flex items-center gap-2 pt-2">
                    <span className="text-[11px] text-indigo-300 font-bold">Studiyani almashtirish:</span>
                    <select
                      value={studio?.id}
                      onChange={(e) => {
                        const selectedId = Number(e.target.value);
                        const tgId = getTgId();
                        if (selectedId && tgId) {
                          loadStudioData(tgId, selectedId);
                        }
                      }}
                      className="bg-[#0f1426] border border-indigo-500/30 text-indigo-300 font-bold text-xs rounded-xl px-3 py-1.5 focus:outline-none focus:border-indigo-400"
                    >
                      {availableFandubs.map((f) => (
                        <option key={f.id} value={f.id} className="bg-[#0a0d1a] text-white">
                          🎙 {f.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            </div>

            {/* Actions: Edit studio profile */}
            {(role === "ADMIN" || role === "UPLOADER") && (
              <button
                onClick={() => setIsEditStudioOpen(true)}
                className="px-4 py-2 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-200 hover:text-white text-xs font-bold flex items-center gap-2 transition-all active:scale-95 shrink-0"
              >
                <Settings className="w-4 h-4 text-indigo-400" />
                <span>Studiyani Tahrirlash</span>
              </button>
            )}
          </div>
        </div>

        {/* Studio Navigation Tabs */}
        <div className="flex flex-wrap items-center gap-3 p-1.5 rounded-2xl bg-white/5 border border-white/10 w-fit">
          <button
            onClick={() => setActiveStudioTab("episodes")}
            className={`px-5 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-2 ${
              activeStudioTab === "episodes"
                ? "bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-[0_0_20px_rgba(99,102,241,0.4)]"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Film className="w-4 h-4" />
            <span>🎬 Qismlar & Yuklash ({episodes.length})</span>
          </button>

          <button
            onClick={() => setActiveStudioTab("vip")}
            className={`px-5 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-2 ${
              activeStudioTab === "vip"
                ? "bg-gradient-to-r from-amber-500 to-rose-600 text-white shadow-[0_0_20px_rgba(245,158,11,0.4)]"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Crown className="w-4 h-4 text-amber-300" />
            <span>💎 VIP Boshqaruvi ({vipUsers.length})</span>
            {receipts.filter(r => r.status === 'PENDING').length > 0 && (
              <span className="px-1.5 py-0.5 rounded-full bg-rose-500 text-white text-[10px] font-black animate-pulse">
                {receipts.filter(r => r.status === 'PENDING').length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveStudioTab("customization")}
            className={`px-5 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-2 ${
              activeStudioTab === "customization"
                ? "bg-gradient-to-r from-emerald-500 to-cyan-600 text-white shadow-[0_0_20px_rgba(16,185,129,0.4)]"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Palette className="w-4 h-4 text-emerald-300" />
            <span>🎨 Dizayn & Aloqa</span>
          </button>
        </div>

        {activeStudioTab === "episodes" ? (
          <>
          {/* SECTION 1: EPIZOD YUKLASH STUDIO (TOP) */}
        <div className="p-6 sm:p-8 rounded-3xl bg-[#0a0e1e]/90 border border-white/10 backdrop-blur-2xl shadow-2xl space-y-6">
          <div>
            <h3 className="text-base font-black text-white flex items-center gap-2">
              <Upload className="w-5 h-5 text-indigo-400" />
              <span>Epizod (Qism) Yuklash Studio</span>
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Avval 1-bosqichda animeni tanlang, so&apos;ng 2-bosqichda video faylni yuklang. Studiya nomi avtomatik ravishda <b>{studio?.name}</b> ga biriktiriladi.
            </p>
          </div>

          {/* 1-BOSQICH: ANIME TANLASH (HAR DOIM BIRINCHI O'RINDA) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black text-white flex items-center gap-2">
                <span className="w-5 h-5 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center text-[10px] font-mono font-black border border-indigo-500/30">1</span>
                <span>Qaysi Animega? *</span>
              </label>
              {selectedAnimeId > 0 && (
                <span className="text-[11px] text-indigo-400 font-bold bg-indigo-500/10 px-2.5 py-0.5 rounded-lg border border-indigo-500/20">
                  {episodes.filter((e) => e.anime_id === selectedAnimeId).length} ta qismingiz bor
                </span>
              )}
            </div>

            {/* Anime Combobox / Selector */}
            {selectedAnimeId > 0 && animes.find((a) => a.id === selectedAnimeId) ? (
              (() => {
                const sel = animes.find((a) => a.id === selectedAnimeId)!;
                return (
                  <div className="flex items-center justify-between p-3.5 rounded-2xl bg-[#111728] border border-indigo-500/50 shadow-md">
                    <div className="flex items-center gap-3 min-w-0">
                      {sel.poster_url ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img src={sel.poster_url} alt={sel.title_uz} className="w-11 h-14 object-cover rounded-xl shrink-0 bg-black/40 shadow" />
                      ) : (
                        <div className="w-11 h-14 rounded-xl bg-white/5 flex items-center justify-center shrink-0">
                          <Film className="w-5 h-5 text-slate-400" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-white truncate">{sel.title_uz}</h4>
                          <span className="text-[10px] text-cyan-400 font-semibold px-2 py-0.5 rounded-md bg-cyan-500/10 border border-cyan-500/20">Tanlandi</span>
                        </div>
                        <div className="flex items-center gap-2 pt-1">
                          {(sel.current_episode || 0) > 0 ? (
                            <span className="text-[11px] text-emerald-400 font-semibold flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" /> {sel.current_episode} ta jami qism
                            </span>
                          ) : (
                            <span className="text-[11px] text-amber-400 font-medium">
                              📦 Arxiv (qismsiz)
                            </span>
                          )}
                          {sel.title_en && (
                            <span className="text-[11px] text-slate-400 truncate hidden sm:inline">• {sel.title_en}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        handleAnimeChange(0);
                        setIsAnimeComboboxOpen(true);
                      }}
                      className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-indigo-500/20 text-slate-300 hover:text-indigo-300 border border-white/10 text-xs font-bold transition-all shrink-0 ml-2"
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
                    className="w-full bg-[#111728] border border-indigo-500/30 focus:border-indigo-500 rounded-2xl pl-10 pr-10 py-3 text-xs text-white focus:outline-none transition-all shadow-inner"
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
                              Bunday anime topilmadi.
                            </div>
                          );
                        }

                        return matches.slice(0, 50).map((a) => (
                          <button
                            key={a.id}
                            type="button"
                            onClick={() => {
                              handleAnimeChange(a.id);
                              setIsAnimeComboboxOpen(false);
                              setAnimeComboboxQuery("");
                            }}
                            className="w-full text-left p-2.5 hover:bg-indigo-500/10 transition-colors flex items-center gap-3 group"
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
                              <div className="text-xs font-bold text-white truncate group-hover:text-indigo-300">
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

          {/* 2-BOSQICH: VIDEO FAYLNI YUKLASH (DIRECT-TO-B2) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black text-white flex items-center gap-2">
                <span className={`w-5 h-5 rounded-lg flex items-center justify-center text-[10px] font-mono font-black border ${
                  selectedAnimeId > 0
                    ? "bg-cyan-500/20 text-cyan-400 border-cyan-500/30"
                    : "bg-slate-800 text-slate-500 border-white/5"
                }`}>2</span>
                <span>Video Faylni Yuklash (Direct B2 & HLS) *</span>
              </label>
              {selectedAnimeId > 0 && (
                <span className="text-[11px] text-cyan-400 font-bold flex items-center gap-1">
                  <Zap className="w-3 h-3" /> Direct Cloud Upload
                </span>
              )}
            </div>

            <input
              type="file"
              ref={fileInputRef}
              accept="video/mp4,video/mkv,video/webm,video/quicktime"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleVideoFileSelect(file);
              }}
            />

            {!selectedAnimeId ? (
              <div
                onClick={() => {
                  setIsAnimeComboboxOpen(true);
                  showToast("👆 Iltimos, avval 1-bosqichda animeni tanlang!", "info");
                }}
                className="cursor-pointer border-2 border-dashed border-white/10 hover:border-indigo-500/40 rounded-3xl p-8 sm:p-10 text-center flex flex-col items-center justify-center gap-3 bg-[#0a0f1d]/40 hover:bg-[#0a0f1d]/70 transition-all group"
              >
                <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 group-hover:scale-105 group-hover:text-indigo-400 transition-all">
                  <Lock className="w-6 h-6 text-indigo-400/80" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-300">
                    Video yuklash uchun avval yuqoridan animeni tanlang
                  </h4>
                  <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                    Anime tanlangandan so&apos;ng video faylni yuklash oynasi avtomatik faollashadi.
                  </p>
                </div>
                <span className="px-3.5 py-1.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-xs font-bold text-indigo-300 flex items-center gap-1.5 mt-1">
                  <Search className="w-3.5 h-3.5" /> 1-bosqich: Animeni tanlash
                </span>
              </div>
            ) : !videoFileInfo ? (
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
                    : "border-cyan-500/30 bg-[#0a0f1d]/80 hover:border-cyan-400 hover:bg-[#0e1529]"
                }`}
              >
                <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 group-hover:scale-110 group-hover:bg-cyan-500/20 transition-all">
                  <UploadCloud className="w-8 h-8 animate-pulse" />
                </div>
                <div>
                  <h4 className="text-sm sm:text-base font-black text-white">
                    Videoni bu yerga tashlang yoki faylni tanlang
                  </h4>
                  <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                    MP4, MKV, WebM — video B2 bulutiga yuklanadi va serverda avtomatik ravishda HLS (.m3u8) formatiga o&apos;tkaziladi.
                  </p>
                </div>
                <div className="flex flex-wrap items-center justify-center gap-2 mt-2">
                  <span className="px-3 py-1 rounded-lg bg-white/5 border border-white/10 text-[11px] font-semibold text-slate-300 flex items-center gap-1">
                    <Zap className="w-3 h-3 text-cyan-400" /> Real-time B2 Direct
                  </span>
                  <span className="px-3 py-1 rounded-lg bg-white/5 border border-white/10 text-[11px] font-semibold text-slate-300 flex items-center gap-1">
                    <Search className="w-3 h-3 text-amber-400" /> Qism raqami avto-aniqlanadi
                  </span>
                  <span className="px-3 py-1 rounded-lg bg-white/5 border border-white/10 text-[11px] font-semibold text-slate-300 flex items-center gap-1">
                    <Shield className="w-3 h-3 text-emerald-400" /> {studio?.name || "Fandub"} studiyangizga birikadi
                  </span>
                </div>
              </div>
            ) : (
              /* Active Upload Card with Retry */
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
                      {uploadedB2Key ? <CheckCircle2 className="w-6 h-6" /> : <Film className="w-6 h-6" />}
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
                            <Check className="w-3.5 h-3.5" /> B2 ga to&apos;liq yuklandi
                          </span>
                        ) : isUploading ? (
                          <span className="text-cyan-400 font-bold flex items-center gap-1">
                            <Loader2 className="w-3.5 h-3.5 animate-spin" /> B2 ga yuklanmoqda ({uploadJob?.progress || 0}%)
                          </span>
                        ) : (
                          <span className="text-amber-400 font-bold">Yuklash to&apos;xtatildi</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center">
                    {!uploadedB2Key && !isUploading && (
                      <button
                        type="button"
                        onClick={handleRetryUpload}
                        className="px-3.5 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 text-xs font-bold text-amber-400 transition-all flex items-center gap-1.5"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>Qayta urinish</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-3.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-slate-300 hover:text-white transition-all flex items-center gap-1.5"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Faylni almashtirish</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (currentXhrRef.current) {
                          try {
                            currentXhrRef.current.abort();
                          } catch (e) {}
                          currentXhrRef.current = null;
                        }
                        setUploadedB2Key("");
                        setVideoFileInfo(null);
                        setUploadFile(null);
                        setUploadJob(null);
                        setIsUploading(false);
                      }}
                      className="px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-xs font-bold text-rose-400 transition-all flex items-center gap-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Bekor qilish</span>
                    </button>
                  </div>
                </div>

                {/* Progress Bar */}
                {isUploading && (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-cyan-400 font-mono font-bold flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 animate-spin" />
                        {uploadJob?.message || "B2 ga yuklanmoqda..."}
                      </span>
                      <span className="font-mono font-black text-cyan-400">
                        {uploadJob?.progress || 0}%
                      </span>
                    </div>
                    <div className="h-2.5 rounded-full bg-slate-800 overflow-hidden p-0.5 border border-white/5">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-500 transition-all duration-300 shadow-[0_0_12px_rgba(6,182,212,0.6)]"
                        style={{ width: `${uploadJob?.progress || 0}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 3-BOSQICH: QISM MA'LUMOTLARI VA SAQLASH */}
          <form onSubmit={handleSaveEpisode} className="space-y-4 pt-2 border-t border-white/5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Episode Number */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300">Qism Raqami *</label>
                <input
                  type="number"
                  min={1}
                  value={epNumber}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10) || 1;
                    setEpNumber(val);
                    setEpTitle(`${val}-qism (${studio?.name || "Ovoz"})`);
                  }}
                  className="w-full bg-[#111728] border border-white/10 rounded-2xl px-4 py-2.5 text-xs text-white focus:border-indigo-500 focus:outline-none"
                  required
                />
              </div>

              {/* Episode Title */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300">Qism Sarlavhasi</label>
                <input
                  type="text"
                  value={epTitle}
                  onChange={(e) => setEpTitle(e.target.value)}
                  placeholder={`${epNumber}-qism (${studio?.name})`}
                  className="w-full bg-[#111728] border border-white/10 rounded-2xl px-4 py-2.5 text-xs text-white focus:border-indigo-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Studio locked */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-400 flex items-center gap-1">
                  <Mic className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Dublyaj Studiyasi (Qulflangan)</span>
                </label>
                <input
                  type="text"
                  disabled
                  value={`🎙️ ${studio?.name} (Sizning studiyangiz)`}
                  className="w-full bg-white/5 border border-white/5 rounded-2xl px-4 py-2.5 text-xs text-indigo-300 font-bold cursor-not-allowed"
                />
              </div>

              {/* VIP Checkbox */}
              <div className="flex items-center gap-2 sm:pt-6">
                <label className="inline-flex items-center gap-2 text-xs font-bold text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={epIsVIP}
                    onChange={(e) => setEpIsVIP(e.target.checked)}
                    className="w-4 h-4 rounded bg-[#111728] border-white/10 text-amber-500 focus:ring-0"
                  />
                  <Crown className="w-4 h-4 text-amber-400 fill-amber-400" />
                  <span>Faqat VIP foydalanuvchilar uchun</span>
                </label>
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isSavingEpisode || isUploading || !uploadedB2Key || !selectedAnimeId}
                className={`w-full sm:w-auto px-8 py-3 rounded-2xl font-black text-xs transition-all flex items-center justify-center gap-2 ${
                  isSavingEpisode || isUploading || !uploadedB2Key || !selectedAnimeId
                    ? "bg-slate-800 text-slate-500 cursor-not-allowed border border-white/5"
                    : "bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white shadow-neon cursor-pointer"
                }`}
              >
                {isSavingEpisode ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Bazaga saqlanmoqda...</span>
                  </>
                ) : isUploading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
                    <span>B2 ga yuklanmoqda ({uploadJob?.progress || 0}%)...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>Videoni Saqlash</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* SECTION 2: YUKLANGAN EPIZODLAR (BOTTOM — ON THE VERY SAME SCREEN!) */}
        <div className="space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-3 border-b border-white/5">
            <div className="min-w-0">
              <h3 className="text-base sm:text-lg font-black text-white flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center shrink-0">
                  <Film className="w-4 h-4 text-indigo-400" />
                </div>
                <span>Yuklangan Epizodlar</span>
                <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 font-bold text-xs">
                  {filteredEpisodes.length} / {episodes.length}
                </span>
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Faqat <b>{studio?.name}</b> tomonidan yuklangan qismlar. Har bir qismni ko&apos;rish, tahrirlash yoki o&apos;chirish mumkin.
              </p>
            </div>

            {/* Search & Filter Bar */}
            <div className="flex flex-wrap sm:flex-nowrap items-center gap-2.5 shrink-0 w-full md:w-auto">
              <div className="relative flex-1 sm:w-52">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Qism qidirish..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-[#111728] border border-white/10 rounded-xl pl-9 pr-8 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <div className="w-full sm:w-auto">
                <select
                  value={filterAnimeId}
                  onChange={(e) => setFilterAnimeId(Number(e.target.value))}
                  className="w-full sm:w-52 bg-[#111728] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 transition-colors cursor-pointer"
                >
                  <option value={0}>Barcha Animelar ({episodes.length})</option>
                  {animes
                    .filter((a) => episodes.some((e) => e.anime_id === a.id))
                    .map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.title_uz}
                      </option>
                    ))}
                </select>
              </div>
            </div>
          </div>

          {/* Real-Time Episodes Grid with Cyber-Glass Media Cards */}
          {filteredEpisodes.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredEpisodes.map((ep) => {
                const animeObj = animes.find((a) => a.id === ep.anime_id);
                const animePoster = animeObj?.poster_url || ep.thumbnail_url || "";
                const animeSlug = animeObj?.slug || "qora-mashala";
                const durationText = ep.duration ? `${Math.round(ep.duration / 60)} daq` : "24 daq";

                return (
                  <div
                    key={ep.id}
                    className="group relative overflow-hidden rounded-2xl bg-[#0b0f20]/90 border border-white/10 hover:border-indigo-500/50 transition-all duration-300 shadow-lg hover:shadow-indigo-500/10 flex flex-col justify-between"
                  >
                    {/* Top Banner / Poster Preview */}
                    <div className="relative h-28 w-full bg-[#12182c] overflow-hidden">
                      {animePoster ? (
                        <img
                          src={animePoster}
                          alt={ep.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-60 group-hover:opacity-85"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-indigo-950/40 to-slate-900">
                          <Film className="w-8 h-8 text-indigo-400/40" />
                        </div>
                      )}

                      {/* Gradient overlay */}
                      <div className="absolute inset-0 bg-gradient-to-t from-[#0b0f20] via-[#0b0f20]/50 to-transparent" />

                      {/* Badges on top */}
                      <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between pointer-events-none">
                        <span className="px-2.5 py-0.5 rounded-lg bg-black/70 backdrop-blur-md border border-white/15 text-indigo-300 font-black text-[10px] shadow-sm">
                          EP {ep.episode_number}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <span className="px-2 py-0.5 rounded-lg bg-emerald-500/20 backdrop-blur-md border border-emerald-500/30 text-emerald-300 font-bold text-[9px] flex items-center gap-1">
                            <Zap className="w-2.5 h-2.5" /> HLS
                          </span>
                          {ep.is_vip_only ? (
                            <span className="px-2 py-0.5 rounded-lg bg-amber-500/20 backdrop-blur-md border border-amber-500/30 text-amber-300 font-bold text-[9px] flex items-center gap-1">
                              <Crown className="w-2.5 h-2.5 fill-amber-300" /> VIP
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-lg bg-indigo-500/20 backdrop-blur-md border border-indigo-500/30 text-indigo-300 font-bold text-[9px]">
                              Bepul
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Quick Play overlay button */}
                      <a
                        href={`/watch/${animeSlug}?ep=${ep.episode_number}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40 backdrop-blur-[2px]"
                        title="Pleyerda ko'rish"
                      >
                        <div className="w-10 h-10 rounded-full bg-indigo-500 text-white flex items-center justify-center shadow-neon transform scale-90 group-hover:scale-100 transition-transform">
                          <Play className="w-4 h-4 fill-white ml-0.5" />
                        </div>
                      </a>
                    </div>

                    {/* Content Details */}
                    <div className="p-3.5 space-y-2.5 flex-1 flex flex-col justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center justify-between gap-2 text-[10px] text-slate-400">
                          <span className="line-clamp-1 font-semibold text-slate-300">
                            {ep.anime_title || animeObj?.title_uz || "Anime"}
                          </span>
                          <span className="flex items-center gap-1 shrink-0 font-mono text-slate-400">
                            <Clock className="w-2.5 h-2.5" /> {durationText}
                          </span>
                        </div>
                        <h4 className="text-xs font-black text-white line-clamp-1 group-hover:text-indigo-300 transition-colors">
                          {ep.title}
                        </h4>
                      </div>

                      {/* Footer Actions */}
                      <div className="flex items-center justify-between pt-2.5 border-t border-white/5">
                        <span className="text-[10px] text-slate-500 font-mono">ID: #{ep.id}</span>

                        <div className="flex items-center gap-1.5">
                          <a
                            href={`/watch/${animeSlug}?ep=${ep.episode_number}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 rounded-xl bg-white/5 hover:bg-indigo-500/20 text-slate-400 hover:text-indigo-300 transition-colors"
                            title="Saytda ko'rish"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                          <button
                            onClick={() => openEditModal(ep)}
                            className="p-1.5 rounded-xl bg-white/5 hover:bg-amber-500/20 text-slate-400 hover:text-amber-300 transition-colors"
                            title="Tahrirlash"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteEpisode(ep.id)}
                            className="p-1.5 rounded-xl bg-white/5 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition-colors"
                            title="O'chirish"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-12 text-center rounded-3xl bg-white/5 border border-white/10 space-y-2">
              <Film className="w-8 h-8 text-slate-500 mx-auto" />
              <h4 className="text-sm font-bold text-white">Qismlar topilmadi</h4>
              <p className="text-xs text-slate-400">
                Ushbu studiya hali qism yuklamagan yoki tanlangan anime bo&apos;yicha qism yo&apos;q.
              </p>
            </div>
          )}
        </div>
        </>
      ) : activeStudioTab === "vip" ? (
        /* VIP BOSHQARUVI TAB VIEW */
        <div className="space-y-6">
          {/* Top VIP Stat Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-5 rounded-3xl bg-[#0a0e1e]/90 border border-amber-500/20 shadow-xl flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                <Crown className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs text-slate-400 font-bold">Faol VIP A&apos;zolar</p>
                <h4 className="text-2xl font-black text-white">{vipUsers.length} kishi</h4>
              </div>
            </div>

            <div className="p-5 rounded-3xl bg-[#0a0e1e]/90 border border-indigo-500/20 shadow-xl flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                <Coins className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs text-slate-400 font-bold">VIP Obuna Narxi</p>
                <h4 className="text-2xl font-black text-white">{vipPrice ? `${Number(vipPrice).toLocaleString()} so'm` : "O'rnatilmagan"}</h4>
              </div>
            </div>
          </div>

          {/* 2-Column Grid: Settings & Members */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Column 1: Settings Form (5 cols) */}
            <div className="lg:col-span-5 p-6 rounded-3xl bg-[#0a0e1e]/90 border border-white/10 shadow-2xl space-y-5">
              <div>
                <h3 className="text-sm font-black text-white flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-amber-400" />
                  <span>Studiya VIP Sozlamalari</span>
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Foydalanuvchilar qulfdagi qismlarni ko&apos;rishda ushbu ma&apos;lumotlar va karta orqali to&apos;lov qilishadi.
                </p>
              </div>

              <form onSubmit={handleSaveVIPSettings} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300">Karta Raqami</label>
                  <input
                    type="text"
                    placeholder="8600 0000 0000 0000"
                    value={cardNumber}
                    onChange={(e) => setCardNumber(e.target.value)}
                    className="w-full bg-[#111728] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500 font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300">Karta Egasi (F.I.SH)</label>
                  <input
                    type="text"
                    placeholder="FALONCHI PISTONCHIYEV"
                    value={cardHolder}
                    onChange={(e) => setCardHolder(e.target.value)}
                    className="w-full bg-[#111728] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500 uppercase"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300">VIP Obuna Narxi (so&apos;mda)</label>
                  <input
                    type="number"
                    min="1000"
                    step="1000"
                    placeholder="10000"
                    value={vipPrice}
                    onChange={(e) => setVipPrice(Number(e.target.value))}
                    className="w-full bg-[#111728] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300">Aloqa Havolasi / Telegram Bot</label>
                  <input
                    type="text"
                    placeholder="https://t.me/fandub_bot yoki @username"
                    value={contactUrl}
                    onChange={(e) => setContactUrl(e.target.value)}
                    className="w-full bg-[#111728] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                  />
                  <p className="text-[10px] text-slate-500">
                    Foydalanuvchi qulfdagi qismda &quot;Fandub bilan bog&apos;lanish&quot; tugmasini bosganda ochiladigan havola.
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={isSavingVIPSettings}
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-rose-600 hover:from-amber-400 hover:to-rose-500 text-white font-black text-xs shadow-[0_0_20px_rgba(245,158,11,0.3)] transition-all flex items-center justify-center gap-2"
                >
                  {isSavingVIPSettings ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Saqlanmoqda...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>Sozlamalarni Saqlash</span>
                    </>
                  )}
                </button>
              </form>
            </div>

            {/* Column 2: VIP Users List (7 cols) */}
            <div className="lg:col-span-7 p-6 rounded-3xl bg-[#0a0e1e]/90 border border-white/10 shadow-2xl space-y-5">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-black text-white flex items-center gap-2">
                    <Crown className="w-4 h-4 text-amber-400" />
                    <span>VIP A&apos;zolar Ro&apos;yxati ({vipUsers.length})</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Ushbu studiyaning barcha VIP seriyalarini tomosha qilish huquqiga ega foydalanuvchilar.
                  </p>
                </div>

                <button
                  onClick={() => setIsAddVIPModalOpen(true)}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-black text-xs shadow-md transition-all flex items-center gap-1.5 shrink-0"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>+ VIP Qo&apos;shish</span>
                </button>
              </div>

              {/* Search Bar */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Telegram ID yoki ism bo'yicha qidirish..."
                  value={vipSearchQuery}
                  onChange={(e) => setVipSearchQuery(e.target.value)}
                  className="w-full bg-[#111728] border border-white/10 rounded-xl pl-8 pr-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Members List */}
              <div className="space-y-2.5 max-h-[420px] overflow-y-auto pr-1">
                {vipUsers
                  .filter((u) => {
                    const q = vipSearchQuery.toLowerCase();
                    return (
                      String(u.telegram_id).includes(q) ||
                      (u.full_name && u.full_name.toLowerCase().includes(q)) ||
                      (u.username && u.username.toLowerCase().includes(q))
                    );
                  })
                  .map((u) => {
                    const expiresDate = new Date(u.expires_at);
                    const isExpired = expiresDate.getTime() < Date.now();
                    const daysLeft = Math.max(0, Math.ceil((expiresDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)));

                    return (
                      <div
                        key={u.id}
                        className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/5 hover:border-white/10 flex items-center justify-between gap-3 transition-all"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 font-black text-xs flex items-center justify-center">
                            {u.full_name?.charAt(0)?.toUpperCase() || "U"}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-white">{u.full_name || "Foydalanuvchi"}</span>
                              {u.username && <span className="text-[10px] text-indigo-400">@{u.username}</span>}
                            </div>
                            <div className="flex items-center gap-2 text-[10px] text-slate-400">
                              <span className="font-mono">TG ID: {u.telegram_id}</span>
                              <span>•</span>
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3 text-slate-500" />
                                {isExpired ? (
                                  <span className="text-rose-400 font-bold">Muddati tugagan</span>
                                ) : (
                                  <span className="text-emerald-400 font-bold">{daysLeft} kun qoldi</span>
                                )}
                              </span>
                            </div>
                          </div>
                        </div>

                        <button
                          onClick={() => handleRevokeVIPUser(u.telegram_id, u.full_name)}
                          className="p-2 rounded-xl bg-white/5 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition-colors"
                          title="VIPni bekor qilish"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })}

                {vipUsers.length === 0 && (
                  <div className="p-8 text-center rounded-2xl bg-white/[0.02] border border-dashed border-white/10 space-y-2">
                    <Crown className="w-8 h-8 text-slate-600 mx-auto" />
                    <p className="text-xs text-slate-400">Ushbu studiyada hali VIP a&apos;zolar mavjud emas.</p>
                    <p className="text-[11px] text-slate-500">+ VIP Qo&apos;shish tugmasi orqali a&apos;zolarni biriktiring.</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Section: Receipts / To'lov Cheklari (if any) */}
          {receipts.length > 0 && (
            <div className="p-6 rounded-3xl bg-[#0a0e1e]/90 border border-white/10 shadow-2xl space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-black text-white flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-emerald-400" />
                  <span>Kelib Tushgan To&apos;lov Cheklari ({receipts.length})</span>
                </h3>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-white/5 text-slate-400 font-bold uppercase text-[10px]">
                    <tr>
                      <th className="px-4 py-3 rounded-l-xl">ID</th>
                      <th className="px-4 py-3">Telegram ID</th>
                      <th className="px-4 py-3">Miqdor</th>
                      <th className="px-4 py-3">Holat</th>
                      <th className="px-4 py-3">Chek Rasmi</th>
                      <th className="px-4 py-3 rounded-r-xl text-right">Amallar</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {receipts.map((r) => (
                      <tr key={r.id} className="hover:bg-white/[0.02]">
                        <td className="px-4 py-3 font-mono text-slate-400">#{r.id}</td>
                        <td className="px-4 py-3 font-mono font-bold text-white">{r.telegram_id}</td>
                        <td className="px-4 py-3 text-amber-300 font-bold">
                          {r.amount ? `${r.amount.toLocaleString()} so'm` : "Ko'rsatilmagan"}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                              r.status === "APPROVED"
                                ? "bg-emerald-500/20 text-emerald-300"
                                : r.status === "REJECTED"
                                ? "bg-rose-500/20 text-rose-300"
                                : "bg-amber-500/20 text-amber-300 animate-pulse"
                            }`}
                          >
                            {r.status}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {r.image_file_id ? (
                            <a
                              href={r.image_file_id}
                              target="_blank"
                              rel="noreferrer"
                              className="text-indigo-400 underline text-[11px]"
                            >
                              Rasmni ochish
                            </a>
                          ) : (
                            <span className="text-slate-600">Mavjud emas</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {r.status === "PENDING" && (
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => handleApproveReceipt(r.id, 30)}
                                className="px-2.5 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-[10px] font-bold transition-all"
                              >
                                Tasdiqlash (30 kun)
                              </button>
                              <button
                                onClick={() => handleRejectReceipt(r.id)}
                                className="px-2.5 py-1 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 text-[10px] font-bold transition-all"
                              >
                                Rad etish
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* CUSTOMIZATION & SOCIALS TAB VIEW */
        <div className="space-y-8 animate-in fade-in duration-300">
          {/* Header Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-3xl bg-[#0a0e1e]/90 border border-white/10 backdrop-blur-2xl">
            <div>
              <div className="flex items-center gap-2">
                <Palette className="w-5 h-5 text-emerald-400" />
                <h3 className="text-lg font-black text-white">Studiya Dizayni & Aloqa Sozlamalari</h3>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Fandub sahifangizni boshqalardan ajralib turadigan Cyber-Neon uslubiga moslang va ijtimoiy kanallaringizni sozlang.
              </p>
            </div>
            {studio?.slug && (
              <a
                href={`/fandubs/${studio.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-emerald-300 hover:text-emerald-200 text-xs font-bold transition-all shrink-0"
              >
                <span>🌐 Studiya Sahifasini Ko&apos;rish</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
          </div>

          {/* Form wrapper */}
          <form onSubmit={handleSaveCustomProfile} className="space-y-6">
            {/* 1. Cyber-Neon Rang Mavzusi */}
            <div className="p-6 sm:p-8 rounded-3xl bg-[#0a0e1e]/90 border border-white/10 backdrop-blur-2xl space-y-5">
              <div>
                <h4 className="text-sm font-black text-white flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-emerald-400" />
                  <span>1. Cyber-Neon Rang Mavzusi</span>
                </h4>
                <p className="text-xs text-slate-400 mt-1">
                  Ushbu rang studiyangiz sahifasidagi neon chegaralar, nurlar, tugmalar va yorliqlarda aks etadi.
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
                {[
                  { id: "amber", name: "Golden Royale", grad: "from-amber-500 to-amber-600", border: "border-amber-500", text: "text-amber-400", shadow: "shadow-amber-500/30" },
                  { id: "rose", name: "Crimson Cyber", grad: "from-rose-500 to-rose-600", border: "border-rose-500", text: "text-rose-400", shadow: "shadow-rose-500/30" },
                  { id: "purple", name: "Tokyo Violet", grad: "from-purple-500 to-indigo-600", border: "border-purple-500", text: "text-purple-400", shadow: "shadow-purple-500/30" },
                  { id: "cyan", name: "Sapphire Frost", grad: "from-cyan-500 to-blue-600", border: "border-cyan-500", text: "text-cyan-400", shadow: "shadow-cyan-500/30" },
                  { id: "emerald", name: "Emerald Matrix", grad: "from-emerald-500 to-teal-600", border: "border-emerald-500", text: "text-emerald-400", shadow: "shadow-emerald-500/30" },
                  { id: "orange", name: "Sunset Flame", grad: "from-orange-500 to-amber-600", border: "border-orange-500", text: "text-orange-400", shadow: "shadow-orange-500/30" },
                ].map((item) => {
                  const isSelected = themeColor === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setThemeColor(item.id)}
                      className={`relative p-3.5 rounded-2xl border text-left transition-all ${
                        isSelected
                          ? `bg-white/10 ${item.border} ${item.shadow} shadow-lg scale-102`
                          : "bg-black/30 border-white/10 hover:border-white/20 hover:bg-white/5"
                      }`}
                    >
                      <div className={`w-full h-8 rounded-xl bg-gradient-to-r ${item.grad} mb-2 flex items-center justify-center`}>
                        {isSelected && <Check className="w-4 h-4 text-white drop-shadow" />}
                      </div>
                      <span className={`text-[11px] font-black block truncate ${item.text}`}>
                        {item.name}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 2. Studio Cover Logo */}
            <div className="p-6 sm:p-8 rounded-3xl bg-[#0a0e1e]/90 border border-white/10 backdrop-blur-2xl space-y-5">
              <div>
                <h4 className="text-sm font-black text-white flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-pink-400" />
                  <span>2. Studiya Logotipi (Cover Image)</span>
                </h4>
                <p className="text-xs text-slate-400 mt-1">
                  Studiya logotipini to&apos;g&apos;ridan-to&apos;g&apos;ri Hikaku server xotirasiga (Storage) yuklang yoki havolasini kiriting.
                </p>
              </div>

              <input
                type="file"
                ref={logoInputRef}
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleUploadImage(f, "logo");
                }}
              />

              <div className="flex flex-col sm:flex-row items-center gap-6 p-4 rounded-2xl bg-black/40 border border-white/5">
                <div className="relative w-24 h-24 rounded-2xl overflow-hidden bg-white/5 border border-white/10 flex-shrink-0 flex items-center justify-center">
                  {(editLogo || studio?.logo_url) ? (
                    <img
                      src={editLogo || studio?.logo_url}
                      alt="Studio Logo"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = "/placeholder-avatar.png";
                      }}
                    />
                  ) : (
                    <div className="text-center p-2">
                      <ImageIcon className="w-8 h-8 text-slate-600 mx-auto mb-1" />
                      <span className="text-[10px] text-slate-500 font-semibold">Logotip yo&apos;q</span>
                    </div>
                  )}
                </div>

                <div className="space-y-3 flex-1 w-full text-center sm:text-left">
                  <div className="flex flex-wrap items-center gap-2 justify-center sm:justify-start">
                    <button
                      type="button"
                      disabled={isUploadingLogo}
                      onClick={() => logoInputRef.current?.click()}
                      className="px-4 py-2 rounded-xl bg-pink-600/20 hover:bg-pink-600/30 border border-pink-500/30 text-pink-300 hover:text-pink-200 text-xs font-bold transition-all flex items-center gap-2"
                    >
                      {isUploadingLogo ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-pink-400" />
                          <span>Yuklanmoqda...</span>
                        </>
                      ) : (
                        <>
                          <UploadCloud className="w-3.5 h-3.5 text-pink-400" />
                          <span>📁 Logotipni Storage&apos;ga Yuklash</span>
                        </>
                      )}
                    </button>

                    {(studio?.logo_url || editLogo) && (
                      <button
                        type="button"
                        onClick={() => {
                          if (studio?.logo_url) {
                            handleDeleteImage("logo");
                          } else {
                            setEditLogo("");
                          }
                        }}
                        className="px-3 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 text-xs font-bold transition-all flex items-center gap-1.5"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>O&apos;chirish</span>
                      </button>
                    )}
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-400">Yoki rasm URL havolasi:</label>
                    <input
                      type="url"
                      value={editLogo}
                      onChange={(e) => setEditLogo(e.target.value)}
                      placeholder="https://..."
                      className="w-full bg-[#111728] border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-pink-500"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* 3. Cover Banner Art */}
            <div className="p-6 sm:p-8 rounded-3xl bg-[#0a0e1e]/90 border border-white/10 backdrop-blur-2xl space-y-5">
              <div>
                <h4 className="text-sm font-black text-white flex items-center gap-2">
                  <ImageIcon className="w-4 h-4 text-indigo-400" />
                  <span>3. Keng Formatli Fon Banneri (Background Image)</span>
                </h4>
                <p className="text-xs text-slate-400 mt-1">
                  Studiya sahifasining yuqori fon rasmini Storage&apos;ga yuklang yoki rasm havolasini kiriting.
                </p>
              </div>

              <input
                type="file"
                ref={bannerInputRef}
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleUploadImage(f, "banner");
                }}
              />

              {/* Banner Live Preview */}
              <div className="relative w-full h-36 sm:h-48 rounded-2xl overflow-hidden bg-black/60 border border-white/10 flex items-center justify-center">
                {bannerUrl ? (
                  <img
                    src={bannerUrl}
                    alt="Banner Preview"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=1200&auto=format&fit=crop&q=80";
                    }}
                  />
                ) : (
                  <div className="text-center p-4 space-y-1">
                    <ImageIcon className="w-8 h-8 text-slate-600 mx-auto" />
                    <p className="text-xs text-slate-500 font-bold">Standart Cyber fon faol</p>
                    <p className="text-[10px] text-slate-600">Maxsus banner qo&apos;yish uchun fayl yuklang yoki havola kiriting</p>
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-[#060813] via-transparent to-transparent pointer-events-none" />
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  disabled={isUploadingBanner}
                  onClick={() => bannerInputRef.current?.click()}
                  className="px-4 py-2 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/30 text-indigo-300 hover:text-indigo-200 text-xs font-bold transition-all flex items-center gap-2"
                >
                  {isUploadingBanner ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-400" />
                      <span>Yuklanmoqda...</span>
                    </>
                  ) : (
                    <>
                      <UploadCloud className="w-3.5 h-3.5 text-indigo-400" />
                      <span>📁 Fon Bannerini Storage&apos;ga Yuklash</span>
                    </>
                  )}
                </button>

                {bannerUrl && (
                  <button
                    type="button"
                    onClick={() => handleDeleteImage("banner")}
                    className="px-3 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 text-xs font-bold transition-all flex items-center gap-1.5"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Fonni O&apos;chirish</span>
                  </button>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300">Banner Rasm URL Manzili</label>
                <div className="relative">
                  <input
                    type="url"
                    value={bannerUrl}
                    onChange={(e) => setBannerUrl(e.target.value)}
                    placeholder="https://i.imgur.com/... yoki to'g'ridan-to'g'ri rasm havolasi"
                    className="w-full bg-[#111728] border border-white/10 rounded-2xl px-4 py-3 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                  {bannerUrl && (
                    <button
                      type="button"
                      onClick={() => setBannerUrl("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
                <p className="text-[11px] text-slate-500">
                  Tavsiya etiladigan o&apos;lcham: 1920x450 piksel yoki keng formatli landshaft banner.
                </p>
              </div>
            </div>

            {/* 3. Dedicated Social & Contact Fields */}
            <div className="p-6 sm:p-8 rounded-3xl bg-[#0a0e1e]/90 border border-white/10 backdrop-blur-2xl space-y-5">
              <div>
                <h4 className="text-sm font-black text-white flex items-center gap-2">
                  <MessageCircle className="w-4 h-4 text-sky-400" />
                  <span>3. Rasmiy Aloqa & Ijtimoiy Tarmoqlar</span>
                </h4>
                <p className="text-xs text-slate-400 mt-1">
                  Ushbu ma&apos;lumotlar studiyangiz profilida alohida chiroyli tugmalar (chips) shaklida ko&apos;rinadi.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Telegram Kanal */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                    <Send className="w-3.5 h-3.5 text-sky-400" />
                    <span>Telegram Kanal</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={telegramChannel}
                      onChange={(e) => setTelegramChannel(e.target.value)}
                      placeholder="@studio_uz yoki https://t.me/studio_uz"
                      className="w-full bg-[#111728] border border-white/10 rounded-2xl px-4 py-3 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-sky-500"
                    />
                  </div>
                  <p className="text-[10px] text-slate-500">Tomoshabinlar obuna bo&apos;lishi uchun asosiy kanal</p>
                </div>

                {/* Rahbar / Bosh Dublyor */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                    <AtSign className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Rahbar / Bosh Ovoz Beruvchi</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={telegramAdmin}
                      onChange={(e) => setTelegramAdmin(e.target.value)}
                      placeholder="@admin_username"
                      className="w-full bg-[#111728] border border-white/10 rounded-2xl px-4 py-3 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <p className="text-[10px] text-slate-500">Studiyaga murojaat yoki takliflar uchun shaxsiy profil</p>
                </div>

                {/* Reklama & Hamkorlik */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                    <Crown className="w-3.5 h-3.5 text-amber-400" />
                    <span>Reklama & Hamkorlik Aloqasi</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={telegramAds}
                      onChange={(e) => setTelegramAds(e.target.value)}
                      placeholder="@ads_manager"
                      className="w-full bg-[#111728] border border-white/10 rounded-2xl px-4 py-3 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                  <p className="text-[10px] text-slate-500">Studiyada reklama beruvchi homiylar uchun kontakt</p>
                </div>

                {/* Instagram */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                    <Instagram className="w-3.5 h-3.5 text-rose-400" />
                    <span>Instagram Sahifasi</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={instagramUrl}
                      onChange={(e) => setInstagramUrl(e.target.value)}
                      placeholder="@studio_uz yoki https://instagram.com/studio_uz"
                      className="w-full bg-[#111728] border border-white/10 rounded-2xl px-4 py-3 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-rose-500"
                    />
                  </div>
                  <p className="text-[10px] text-slate-500">Studiyaning rasmiy Instagram sahifasi</p>
                </div>
              </div>
            </div>

            {/* 4. Studiya E'loni (Announcement Pin) */}
            <div className="p-6 sm:p-8 rounded-3xl bg-[#0a0e1e]/90 border border-white/10 backdrop-blur-2xl space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-black text-white flex items-center gap-2">
                    <Megaphone className="w-4 h-4 text-amber-400" />
                    <span>4. Studiya E&apos;loni (Yuqori Banner)</span>
                  </h4>
                  <p className="text-xs text-slate-400 mt-1">
                    Profil sahifangiz tepasida yonib turuvchi maxsus xabar (masalan: premyera vaqti yoki kasting).
                  </p>
                </div>

                {/* Active Toggle Switch */}
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <span className="text-xs font-bold text-slate-300">
                    {announcementActive ? "Yoqilgan" : "O'chirilgan"}
                  </span>
                  <div
                    onClick={() => setAnnouncementActive(!announcementActive)}
                    className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer ${
                      announcementActive ? "bg-emerald-500" : "bg-white/10"
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded-full bg-white transition-transform absolute top-0.5 ${
                        announcementActive ? "translate-x-6" : "translate-x-0.5"
                      }`}
                    />
                  </div>
                </label>
              </div>

              <div className="space-y-2">
                <textarea
                  value={announcementText}
                  onChange={(e) => setAnnouncementText(e.target.value)}
                  rows={2}
                  placeholder="Masalan: 🔥 Narutoning yangi qismlari har juma soat 20:00 da Hikaku.uz da chiqadi! Ovoz berish jamoasiga kasting davom etmoqda..."
                  className="w-full bg-[#111728] border border-white/10 rounded-2xl p-4 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Live Preview of Announcement */}
              {announcementActive && announcementText && (
                <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3 shadow-[0_0_25px_rgba(245,158,11,0.15)] animate-in fade-in">
                  <Megaphone className="w-5 h-5 text-amber-400 shrink-0 mt-0.5 animate-bounce" />
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-amber-400 block">
                      Studiya E&apos;loni (Jonli Ko&apos;rinish)
                    </span>
                    <p className="text-xs font-semibold text-slate-200 mt-0.5">
                      {announcementText}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Save Button */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="submit"
                disabled={isSavingCustomProfile}
                className="px-8 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-black text-xs shadow-[0_0_25px_rgba(16,185,129,0.3)] transition-all active:scale-95 disabled:opacity-50 flex items-center gap-2"
              >
                {isSavingCustomProfile ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Saqlanmoqda...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>Dizayn & Aloqa Sozlamalarini Saqlash</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}
      </div>

      {/* MODAL 1: EDIT STUDIO PROFILE */}
      {isEditStudioOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-md bg-[#0d1224] border border-white/10 rounded-3xl p-6 space-y-5 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black text-white flex items-center gap-2">
                <Settings className="w-4 h-4 text-indigo-400" />
                <span>Studiya Profilini Tahrirlash</span>
              </h3>
              <button
                onClick={() => setIsEditStudioOpen(false)}
                className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveStudioProfile} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-300">Studiya Nomi *</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full bg-[#111728] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300">Logotip (Storage yoki URL)</label>
                <div className="flex items-center gap-2">
                  <input
                    type="url"
                    value={editLogo}
                    onChange={(e) => setEditLogo(e.target.value)}
                    placeholder="https://..."
                    className="w-full bg-[#111728] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                  <button
                    type="button"
                    disabled={isUploadingLogo}
                    onClick={() => logoInputRef.current?.click()}
                    className="px-3 py-2 rounded-xl bg-pink-500/20 hover:bg-pink-500/30 border border-pink-500/30 text-pink-300 text-xs font-bold whitespace-nowrap flex items-center gap-1.5"
                    title="Storage'ga yuklash"
                  >
                    {isUploadingLogo ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UploadCloud className="w-3.5 h-3.5" />}
                    <span>Yuklash</span>
                  </button>
                  {editLogo && (
                    <button
                      type="button"
                      onClick={() => handleDeleteImage("logo")}
                      className="p-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400"
                      title="O'chirish"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-300">Studiya Tavsifi</label>
                <textarea
                  rows={3}
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  placeholder="Studiya faoliyati, jamoasi va aloqa haqida..."
                  className="w-full bg-[#111728] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEditStudioOpen(false)}
                  className="px-4 py-2 rounded-xl bg-white/5 text-slate-300 text-xs font-bold hover:bg-white/10"
                >
                  Bekor Qilish
                </button>
                <button
                  type="submit"
                  disabled={isSavingStudio}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-neon transition-all flex items-center gap-1.5"
                >
                  {isSavingStudio ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  <span>Saqlash</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: EDIT EPISODE */}
      {editingEp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-md bg-[#0d1224] border border-white/10 rounded-3xl p-6 space-y-5 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black text-white flex items-center gap-2">
                <Edit className="w-4 h-4 text-indigo-400" />
                <span>Epizodni Tahrirlash</span>
              </h3>
              <button
                onClick={() => setEditingEp(null)}
                className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEpEdit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-300">Qism Raqami *</label>
                <input
                  type="number"
                  min={1}
                  value={editEpNumber}
                  onChange={(e) => setEditEpNumber(Number(e.target.value))}
                  className="w-full bg-[#111728] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-300">Qism Nomi / Sarlavhasi *</label>
                <input
                  type="text"
                  value={editEpTitle}
                  onChange={(e) => setEditEpTitle(e.target.value)}
                  className="w-full bg-[#111728] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <label className="inline-flex items-center gap-2 text-xs font-bold text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editEpIsVIP}
                    onChange={(e) => setEditEpIsVIP(e.target.checked)}
                    className="w-4 h-4 rounded bg-[#111728] border-white/10 text-amber-500 focus:ring-0"
                  />
                  <Crown className="w-4 h-4 text-amber-400 fill-amber-400" />
                  <span>Faqat VIP foydalanuvchilar uchun</span>
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingEp(null)}
                  className="px-4 py-2 rounded-xl bg-white/5 text-slate-300 text-xs font-bold hover:bg-white/10"
                >
                  Bekor Qilish
                </button>
                <button
                  type="submit"
                  disabled={isSavingEpEdit}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-neon transition-all flex items-center gap-1.5"
                >
                  {isSavingEpEdit ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  <span>Saqlash</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: TEAM MEMBERS */}
      {isMembersModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-lg bg-[#0d1224] border border-white/10 rounded-3xl p-6 space-y-5 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black text-white flex items-center gap-2">
                <Users className="w-4 h-4 text-indigo-400" />
                <span>{studio?.name} — Jamoa A&apos;zolari</span>
              </h3>
              <button
                onClick={() => setIsMembersModalOpen(false)}
                className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Add New Member Form */}
            <form onSubmit={handleAddMember} className="p-4 rounded-2xl bg-black/40 border border-white/10 space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-indigo-300">
                <UserPlus className="w-3.5 h-3.5" />
                <span>Yangi Jamoadosh Qo&apos;shish</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                <div className="sm:col-span-7">
                  <input
                    type="text"
                    placeholder="Telegram ID yoki @username"
                    value={newMemberInput}
                    onChange={(e) => setNewMemberInput(e.target.value)}
                    className="w-full bg-[#111728] border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
                    required
                  />
                </div>
                <div className="sm:col-span-5">
                  <select
                    value={newMemberRole}
                    onChange={(e) => setNewMemberRole(e.target.value)}
                    className="w-full bg-[#111728] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="Dublyajchi">Dublyajchi</option>
                    <option value="Tarjimon">Tarjimon</option>
                    <option value="Taymer">Taymer</option>
                    <option value="Sound Maker">Sound Maker</option>
                    <option value="Admin">Admin</option>
                  </select>
                </div>
              </div>
              <button
                type="submit"
                disabled={isAddingMember || !newMemberInput.trim()}
                className="w-full py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-neon"
              >
                {isAddingMember ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Qo&apos;shilmoqda...</span>
                  </>
                ) : (
                  <>
                    <Plus className="w-3.5 h-3.5" />
                    <span>Jamoadoshni Biriktirish</span>
                  </>
                )}
              </button>
            </form>

            {/* Current Members List */}
            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {members.length > 0 ? (
                members.map((m) => (
                  <div
                    key={m.id}
                    className="p-3 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-between gap-3 hover:border-white/10 transition-all"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-indigo-500/20 text-indigo-300 flex items-center justify-center font-bold text-xs flex-shrink-0">
                        {m.username ? "@" : "TG"}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          {m.full_name && (
                            <h4 className="text-xs font-bold text-white truncate max-w-[120px]">
                              {m.full_name}
                            </h4>
                          )}
                          {m.username ? (
                            <span className="text-[11px] text-sky-400 truncate">@{m.username.replace(/^@/, "")}</span>
                          ) : (
                            <span className="text-xs font-bold text-white">ID: {m.telegram_id}</span>
                          )}
                        </div>
                        <p className="text-[10px] text-slate-500">
                          ID: {m.telegram_id} • {new Date(m.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="px-2.5 py-1 rounded-xl bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 font-bold text-[10px] uppercase">
                        {m.role}
                      </span>
                      <button
                        type="button"
                        disabled={isDeletingMemberId === m.id}
                        onClick={() => handleRemoveMember(m.id, m.telegram_id)}
                        className="w-7 h-7 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 flex items-center justify-center transition-all disabled:opacity-50"
                        title="Jamoani tark ettirish"
                      >
                        {isDeletingMemberId === m.id ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <Trash2 className="w-3 h-3" />
                        )}
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-400 text-center py-4">Hozircha a&apos;zolar yo&apos;q</p>
              )}
            </div>

            <div className="pt-2">
              <button
                onClick={() => setIsMembersModalOpen(false)}
                className="w-full py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-bold text-slate-300"
              >
                Yopish
              </button>
            </div>
          </div>
        </div>
      )}
      {/* MODAL 3: ADD VIP USER */}
      {isAddVIPModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-md bg-[#0d1224] border border-white/10 rounded-3xl p-6 space-y-5 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black text-white flex items-center gap-2">
                <Crown className="w-4 h-4 text-amber-400" />
                <span>Yangi VIP Foydalanuvchi Qo&apos;shish</span>
              </h3>
              <button
                onClick={() => setIsAddVIPModalOpen(false)}
                className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleGrantVIPUser} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-300">Telegram ID *</label>
                <input
                  type="number"
                  placeholder="Masalan: 123456789"
                  value={newVIPTgId}
                  onChange={(e) => setNewVIPTgId(e.target.value)}
                  className="w-full bg-[#111728] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-300">Foydalanuvchi Ismi</label>
                <input
                  type="text"
                  placeholder="Masalan: Ali Valiyev"
                  value={newVIPFullName}
                  onChange={(e) => setNewVIPFullName(e.target.value)}
                  className="w-full bg-[#111728] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-300">Telegram Username (@belgisiz)</label>
                <input
                  type="text"
                  placeholder="alivali"
                  value={newVIPUsername}
                  onChange={(e) => setNewVIPUsername(e.target.value.replace('@', ''))}
                  className="w-full bg-[#111728] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-300">Muddati (Kunlarda) *</label>
                <select
                  value={newVIPDays}
                  onChange={(e) => setNewVIPDays(Number(e.target.value))}
                  className="w-full bg-[#111728] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                >
                  <option value={7}>7 Kun (1 hafta)</option>
                  <option value={15}>15 Kun</option>
                  <option value={30}>30 Kun (1 oy)</option>
                  <option value={90}>90 Kun (3 oy)</option>
                  <option value={180}>180 Kun (6 oy)</option>
                  <option value={365}>365 Kun (1 yil)</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={isGrantingVIP}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-black text-xs shadow-md transition-all flex items-center justify-center gap-2"
              >
                {isGrantingVIP ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Qo&apos;shilmoqda...</span>
                  </>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4" />
                    <span>VIPni Faollashtirish</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
