"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Cookie, X, Check, ShieldCheck } from "lucide-react";

export const CookieBanner: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem("hikaku_cookie_consent");
    if (!consent) {
      // Delay slightly for smooth entrance
      const timer = setTimeout(() => setIsVisible(true), 1200);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem("hikaku_cookie_consent", "accepted");
    setIsVisible(false);
  };

  const handleDecline = () => {
    localStorage.setItem("hikaku_cookie_consent", "essential_only");
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-20 md:bottom-6 left-4 right-4 md:left-auto md:right-6 md:max-w-md z-50 animate-slide-up">
      <div className="bg-[#12141f]/95 backdrop-blur-2xl border border-purple-500/30 rounded-2xl p-4 sm:p-5 shadow-2xl shadow-purple-950/40 text-white space-y-3.5 relative overflow-hidden">
        {/* Ambient glow */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-purple-600/10 rounded-full blur-2xl pointer-events-none" />

        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-600/20 border border-purple-500/30 flex items-center justify-center text-purple-400 flex-shrink-0">
            <Cookie className="w-5 h-5 animate-bounce" />
          </div>
          <div className="space-y-1 min-w-0 pr-4">
            <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
              <span>Cookie Fayllari va Maxfiylik</span>
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            </h4>
            <p className="text-[11px] text-gray-300 leading-relaxed">
              Biz platforma tezligi, xavfsiz avtorizatsiya va sizga qulay tomosha tajribasini taqdim etish uchun Cookie fayllaridan foydalanamiz.
            </p>
          </div>
          <button
            onClick={handleDecline}
            className="p-1 rounded-lg text-gray-400 hover:text-white transition-colors absolute top-3 right-3"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center justify-between gap-2 pt-1 border-t border-white/5">
          <Link
            href="/privacy"
            className="text-[11px] text-purple-400 hover:text-purple-300 underline font-medium"
          >
            Batafsil ma'lumot
          </Link>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDecline}
              className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 text-xs font-semibold transition-colors"
            >
              Rad etish
            </button>
            <button
              onClick={handleAccept}
              className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 hover:opacity-95 text-white text-xs font-bold shadow-neon transition-all flex items-center gap-1"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Qabul Qilish</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
