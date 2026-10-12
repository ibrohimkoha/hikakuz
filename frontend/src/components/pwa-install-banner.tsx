"use client";

import React, { useState, useEffect } from "react";
import { Download, X, Share, PlusSquare, Sparkles } from "lucide-react";

export function PWAInstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showAndroidBanner, setShowAndroidBanner] = useState(false);
  const [showIOSBanner, setShowIOSBanner] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    // Check if already in standalone (installed app) mode
    const isStandalone = window.matchMedia("(display-mode: standalone)").matches || (window.navigator as any).standalone;
    if (isStandalone) return;

    // Check localStorage dismissal
    const dismissed = localStorage.getItem("pwa_dismissed");
    if (dismissed && Date.now() - parseInt(dismissed) < 7 * 24 * 60 * 60 * 1000) {
      return;
    }

    // Android/Chrome beforeinstallprompt event
    const handleBeforeInstall = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowAndroidBanner(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);

    // iOS Detection
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    if (isIOS && !isStandalone) {
      setShowIOSBanner(true);
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        setShowAndroidBanner(false);
      }
      setDeferredPrompt(null);
    }
  };

  const handleDismiss = () => {
    localStorage.setItem("pwa_dismissed", Date.now().toString());
    setShowAndroidBanner(false);
    setShowIOSBanner(false);
    setIsDismissed(true);
  };

  if (isDismissed || (!showAndroidBanner && !showIOSBanner)) return null;

  return (
    <aside
      aria-label="Ilovani o'rnatish taklifi"
      className="fixed top-16 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-sm z-40 p-4 rounded-2xl bg-[#14161f]/95 backdrop-blur-xl border border-purple-500/30 shadow-neon animate-slide-down flex items-start gap-3"
    >
      <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center flex-shrink-0 border border-purple-500/30">
        <Sparkles className="w-5 h-5 animate-pulse" />
      </div>

      <div className="flex-1 space-y-1 text-xs">
        <h4 className="font-bold text-white flex items-center gap-1.5">
          <span>Hikaku Anime Ilovasi</span>
          <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-accent-purple text-white">PWA</span>
        </h4>
        <p className="text-gray-400 text-[11px] leading-tight">
          {showIOSBanner
            ? "Ilovani o'rnatish uchun pastdagi 'Ulashish' tugmasini bosing va 'Bosh ekranga qo'shish'ni tanlang."
            : "Qulay va tezkor tomosha qilish uchun telefoningizga o'rnating!"}
        </p>

        {showAndroidBanner && (
          <button
            onClick={handleInstallClick}
            className="mt-2 px-3 py-1.5 rounded-lg bg-gradient-to-r from-accent-purple to-purple-600 hover:from-purple-600 hover:to-accent-purple text-white font-bold text-[11px] flex items-center gap-1.5 shadow-md transition-all"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Ilovani O&apos;rnatish</span>
          </button>
        )}

        {showIOSBanner && (
          <div className="mt-2 flex items-center gap-2 text-[10px] text-purple-300 font-semibold bg-purple-950/40 p-1.5 rounded-lg border border-purple-800/40">
            <Share className="w-3 h-3" />
            <span>➔</span>
            <PlusSquare className="w-3 h-3" />
            <span>Bosh ekranga qo&apos;shish</span>
          </div>
        )}
      </div>

      <button
        onClick={handleDismiss}
        className="p-1 text-gray-400 hover:text-white rounded-lg hover:bg-white/5 transition-all"
      >
        <X className="w-4 h-4" />
      </button>
    </aside>
  );
}