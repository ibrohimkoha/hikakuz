"use client";

import React, { useState, useEffect } from "react";
import { Zap, Check, X } from "lucide-react";

export function CacheConsentBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      const consent = localStorage.getItem("hikaku_cache_consent");
      if (consent === null) {
        const timer = setTimeout(() => setVisible(true), 1500);
        return () => clearTimeout(timer);
      }
    } catch (e) {}
  }, []);

  const handleAccept = () => {
    try {
      localStorage.setItem("hikaku_cache_consent", "granted");
    } catch (e) {}
    setVisible(false);
  };

  const handleDecline = () => {
    try {
      localStorage.setItem("hikaku_cache_consent", "declined");
    } catch (e) {}
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-20 sm:bottom-6 left-4 right-4 sm:left-6 sm:right-auto sm:max-w-md z-50 animate-slide-up">
      <div className="p-4 sm:p-5 rounded-3xl bg-[#090e1c]/95 backdrop-blur-2xl border border-cyan-500/40 shadow-[0_10px_35px_rgba(0,0,0,0.8)] space-y-3">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-2xl bg-cyan-500/20 border border-cyan-500/30 text-cyan-400 flex items-center justify-center shrink-0">
            <Zap className="w-4 h-4" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 text-xs font-bold text-white">
              <span>Tezkor Keshdan Foydalanish</span>
              <span className="px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 text-[9px] font-mono font-black">0ms</span>
            </div>
            <p className="text-[11px] text-slate-300 mt-1 leading-relaxed">
              Hikaku.uz animelar va posterlarni chaqmoqdek tez ochish uchun qurilmangizning mahalliy keshidan foydalanadi. Ruxsat berasizmi?
            </p>
          </div>
          <button
            onClick={handleDecline}
            className="text-slate-500 hover:text-white p-1 rounded-lg hover:bg-white/5 transition-all"
            aria-label="Kesh bildirishnomasini yopish"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center gap-2 pt-1">
          <button
            onClick={handleAccept}
            className="flex-1 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-xs font-bold shadow-[0_0_15px_rgba(6,182,212,0.3)] transition-all flex items-center justify-center gap-1.5 active:scale-95"
            aria-label="Mahalliy keshdan foydalanishga ruxsat berish"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Ruxsat berish</span>
          </button>
          <button
            onClick={handleDecline}
            className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white text-xs font-semibold border border-white/10 transition-all active:scale-95"
            aria-label="Mahalliy keshdan foydalanishni rad etish"
          >
            Rad etish
          </button>
        </div>
      </div>
    </div>
  );
}
