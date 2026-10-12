"use client";

import React, { useEffect, useRef, useState } from "react";
import { X, Sparkles, Send, ShieldCheck, CheckCircle2, Loader2, Crown, ExternalLink } from "lucide-react";
import { useAuth } from "@/context/auth-context";
import { UserSession } from "@/types/user";
import { Logo } from "@/components/logo";

const GOOGLE_CLIENT_ID = "531444252311-g1di8c500s4lhn13o67qb2k2mcr2sicm.apps.googleusercontent.com";
const TELEGRAM_BOT_NAME = "hikakuzbot";

export const AuthModal: React.FC = () => {
  const { isAuthModalOpen, setIsAuthModalOpen, login } = useAuth();
  const [tgPolling, setTgPolling] = useState(false);
  const [tgBotUrl, setTgBotUrl] = useState<string | null>(null);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const telegramContainerRef = useRef<HTMLDivElement | null>(null);
  const googleContainerRef = useRef<HTMLDivElement | null>(null);
  const pollIntervalRef = useRef<any>(null);

  // Clear polling on close
  useEffect(() => {
    if (!isAuthModalOpen) {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      setTgPolling(false);
      setTgBotUrl(null);
      setErrorMsg(null);
    }
  }, [isAuthModalOpen]);

  // 1. One-Tap Telegram Bot Login with Session Polling (Mobile & Desktop Friendly)
  const handleStartTelegramBotLogin = async () => {
    setTgPolling(true);
    setErrorMsg(null);
    try {
      const res = await fetch("/api/v1/auth/telegram/token", { method: "POST" });
      const data = await res.json();
      if (data.success && data.token) {
        setTgBotUrl(data.bot_url);
        
        // Mobile-aware redirect / open
        const isMobile = typeof navigator !== "undefined" && /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
        if (isMobile) {
          window.location.href = data.bot_url;
        } else {
          window.open(data.bot_url, "_blank");
        }

        // Start polling
        const token = data.token;
        pollIntervalRef.current = setInterval(async () => {
          try {
            const checkRes = await fetch(`/api/v1/auth/telegram/check?token=${token}`);
            const checkData = await checkRes.json();
            if (checkData.success && checkData.verified && checkData.session) {
              clearInterval(pollIntervalRef.current);
              setTgPolling(false);

              const s = checkData.session;
              const isAdmin = Boolean(s.is_admin || s.telegram_id === 5415350162 || s.telegram_id === 6149114216);
              const session: UserSession = {
                id: s.telegram_id || Date.now(),
                telegram_id: s.telegram_id,
                first_name: s.first_name || "Foydalanuvchi",
                last_name: s.last_name || "",
                username: s.username || "",
                photo_url: s.photo_url || "",
                is_vip: isAdmin || s.is_vip,
                is_admin: isAdmin,
                admin_role: isAdmin ? "ADMIN" : "USER",
                token: token,
              };
              login(session);
              setIsAuthModalOpen(false);
            }
          } catch (e) {
            console.error("Poll check error:", e);
          }
        }, 2000);
      } else {
        setErrorMsg("Telegram sessiya yaratishda xatolik yuz berdi");
        setTgPolling(false);
      }
    } catch (err) {
      console.error(err);
      setErrorMsg("Server bilan bog\x27lanishda xatolik");
      setTgPolling(false);
    }
  };

  // 2. Setup Google Sign-In & Telegram Widget
  useEffect(() => {
    if (!isAuthModalOpen) return;

    // Telegram Widget Callback Fallback
    (window as any).onTelegramAuth = async (user: any) => {
      console.log("Telegram Auth Widget Success:", user);
      let isFounder = user.id === 5415350162 || user.id === 4351671 || user.username === "iskurama";
      let isAdmin = isFounder || user.id === 6149114216;
      let role = isFounder ? "FOUNDER" : isAdmin ? "SUPERADMIN" : "USER";

      try {
        const checkRes = await fetch(`/api/v1/auth/role?telegram_id=${user.id}`);
        const checkData = await checkRes.json();
        if (checkData.success) {
          isAdmin = isAdmin || checkData.is_admin;
          if (checkData.role) role = checkData.role;
        }
      } catch (err) {
        console.error("Failed to check role on widget login:", err);
      }

      const session: UserSession = {
        id: user.id,
        telegram_id: user.id,
        first_name: user.first_name || "Foydalanuvchi",
        last_name: user.last_name || "",
        username: user.username || "",
        photo_url: user.photo_url || "",
        is_vip: isAdmin,
        is_admin: isAdmin,
        admin_role: role,
        token: `tg_token_${user.id}_${Date.now()}`,
      };

      login(session);
    };

    if (telegramContainerRef.current) {
      telegramContainerRef.current.innerHTML = "";
      const script = document.createElement("script");
      script.src = "https://telegram.org/js/telegram-widget.js?22";
      script.setAttribute("data-telegram-login", TELEGRAM_BOT_NAME);
      script.setAttribute("data-size", "large");
      script.setAttribute("data-radius", "12");
      script.setAttribute("data-onauth", "onTelegramAuth(user)");
      script.setAttribute("data-request-access", "write");
      script.async = true;
      telegramContainerRef.current.appendChild(script);
    }

    // Google GSI Initialization
    const initGoogleGSI = () => {
      if ((window as any).google?.accounts?.id) {
        try {
          (window as any).google.accounts.id.initialize({
            client_id: GOOGLE_CLIENT_ID,
            callback: (response: any) => {
              try {
                const base64Url = response.credential.split(".")[1];
                const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
                const jsonPayload = decodeURIComponent(
                  atob(base64)
                    .split("")
                    .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
                    .join("")
                );
                const data = JSON.parse(jsonPayload);

                const isFounder =
                  data.email === "miroxmedovibrohim5@gmail.com" ||
                  data.email.includes("iskurama") ||
                  data.email.includes("ibrohim");

                const isAdmin = isFounder;

                const session: UserSession = {
                  id: Math.abs(data.sub?.slice(-8)) || 4351671,
                  telegram_id: isAdmin ? 5415350162 : undefined,
                  email: data.email,
                  first_name: data.given_name || data.name || "Google User",
                  last_name: data.family_name || "",
                  photo_url: data.picture || "",
                  is_vip: isAdmin,
                  is_admin: isAdmin,
                  admin_role: isFounder ? "FOUNDER" : isAdmin ? "SUPERADMIN" : "USER",
                  token: isAdmin ? "tg_token_5415350162_" + Date.now() : response.credential,
                };

                login(session);
              } catch (err) {
                console.error("Google decode error:", err);
              }
            },
          });

          if (googleContainerRef.current) {
            googleContainerRef.current.innerHTML = "";
            (window as any).google.accounts.id.renderButton(googleContainerRef.current, {
              theme: "filled_blue",
              size: "large",
              width: 280,
              shape: "pill",
              text: "continue_with",
            });
          }
        } catch (e) {
          console.error("GSI Init Error:", e);
        }
      }
    };

    if (!(window as any).google?.accounts?.id) {
      const existingScript = document.getElementById("google-gsi-client");
      if (!existingScript) {
        const script = document.createElement("script");
        script.id = "google-gsi-client";
        script.src = "https://accounts.google.com/gsi/client";
        script.async = true;
        script.defer = true;
        script.onload = () => initGoogleGSI();
        document.body.appendChild(script);
      }
    } else {
      initGoogleGSI();
    }

    const timer = setInterval(() => {
      if ((window as any).google?.accounts?.id) {
        initGoogleGSI();
        clearInterval(timer);
      }
    }, 250);

    return () => {
      clearInterval(timer);
    };
  }, [isAuthModalOpen, login]);

  if (!isAuthModalOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-md animate-fade-in font-sans">
      {/* Backdrop tap to close */}
      <div
        className="absolute inset-0"
        onClick={() => setIsAuthModalOpen(false)}
      />

      {/* Modal Card (Responsive BottomSheet on Mobile, Centered Card on Desktop) */}
      <div className="relative z-10 w-full sm:max-w-md bg-[#0a0d1a] border-t sm:border border-rose-900/40 rounded-t-[32px] sm:rounded-3xl p-6 sm:p-8 shadow-2xl space-y-5 max-h-[92dvh] overflow-y-auto no-scrollbar">
        {/* Mobile Drag Handle Pill */}
        <div className="w-12 h-1.5 bg-white/20 rounded-full mx-auto sm:hidden mb-2" />

        {/* Close Button */}
        <button
          onClick={() => setIsAuthModalOpen(false)}
          className="absolute top-5 right-5 p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header with Logo */}
        <div className="text-center space-y-2.5">
          <div className="flex justify-center">
            <Logo size="md" href="" />
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            Hikaku Anime Hisobiga Kirish
          </h2>
          <p className="text-xs text-slate-400">
            VIP obuna va barcha qismlarni HD sifatda tomosha qilish uchun kiring
          </p>
        </div>

        {errorMsg && (
          <div className="p-3 rounded-xl bg-red-500/20 border border-red-500/30 text-red-300 text-xs text-center">
            {errorMsg}
          </div>
        )}

        {/* Auth Options Container */}
        <div className="space-y-3.5 pt-1">
          {/* 1. Google One-Tap / Button */}
          <div className="flex flex-col items-center justify-center p-4 rounded-2xl bg-[#0e1222] border border-rose-900/30 space-y-2 min-h-[76px]">
            <span className="text-[11px] font-bold text-slate-300 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-rose-400" />
              Google hisobingiz orqali kiring:
            </span>
            <div ref={googleContainerRef} className="flex justify-center w-full min-h-[44px] items-center" />
          </div>

          {/* 2. Telegram Widget */}
          <div className="flex flex-col items-center justify-center p-3 rounded-2xl bg-[#0e1222] border border-white/5">
            <div ref={telegramContainerRef} className="flex justify-center" />
          </div>

          {/* Subtle Divider */}
          <div className="flex items-center gap-3 my-1">
            <div className="h-[1px] flex-1 bg-white/10" />
            <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-500">
              yoki
            </span>
            <div className="h-[1px] flex-1 bg-white/10" />
          </div>

          {/* 3. Telegram Bot Button (Subtle, Clean, Mobile & Desktop Friendly) */}
          <div className="space-y-2">
            <button
              onClick={handleStartTelegramBotLogin}
              disabled={tgPolling}
              className="w-full py-2.5 px-4 rounded-2xl bg-white/[0.03] hover:bg-[#229ED9]/15 border border-white/10 hover:border-[#229ED9]/40 text-slate-300 hover:text-white transition-all text-xs font-semibold flex items-center justify-center gap-2 group min-h-[42px]"
            >
              {tgPolling ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-[#229ED9]" />
                  <span className="text-slate-300">
                    Botda <b className="text-white">[Tasdiqlash]</b> tugmasini bosing...
                  </span>
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5 text-[#229ED9] group-hover:scale-110 transition-transform" />
                  <span>Telegram Bot orqali tezkor kirish</span>
                </>
              )}
            </button>

            {tgPolling && tgBotUrl && (
              <div className="p-2.5 rounded-xl bg-[#229ED9]/10 border border-[#229ED9]/20 text-[11px] text-center space-y-1.5 animate-fade-in">
                <p className="text-slate-300">
                  Telegram ilovangiz ochilmadimi?
                </p>
                <a
                  href={tgBotUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[#229ED9] hover:underline font-bold"
                >
                  <span>@hikakuzbot ni ochish</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            )}
          </div>
        </div>

        <p className="text-[10px] text-slate-500 text-center leading-relaxed">
          Tizimga kirish orqali siz sayt qoidalari va maxfiylik shartlariga rozilik bildirasiz.
        </p>
      </div>
    </div>
  );
};
