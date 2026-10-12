"use client";

import React from "react";
import { Sparkles, Swords, MessageSquare, ArrowRight } from "lucide-react";

export const HikakuBanner: React.FC = () => {
  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#1b1429] via-[#161224] to-[#121629] border border-accent-rose/30 p-6 sm:p-8 shadow-2xl my-10 group">
      {/* Neon Glow Effects */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-accent-rose/20 rounded-full blur-3xl pointer-events-none group-hover:bg-accent-rose/30 transition-all duration-500" />
      <div className="absolute bottom-0 left-0 w-60 h-60 bg-accent-red/15 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="space-y-3 text-center md:text-left max-w-xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-amber-400/10 text-amber-300 border border-amber-400/30">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Hikaku Anime Jamiyati
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Anime bahslari va Eng Yangi Relizlar — <span className="text-amber-400">Hikaku.uz</span> da!
          </h2>
          <p className="text-sm text-gray-300 leading-relaxed">
            Qaysi qahramon kuchliroq? Eng yaxshi syujet kimda? O&apos;zbekistonning eng katta anime jamiyatida o&apos;z fikringizni qoldiring, ovoz bering va qismlarni tomosha qiling!
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3">
          <a
            href="https://t.me/hikakuz"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2.5 px-6 py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-black font-extrabold text-sm shadow-lg hover:scale-105 transition-all"
          >
            <Swords className="w-4 h-4" /> Telegram Jamiyatimiz
            <ArrowRight className="w-4 h-4" />
          </a>
        </div>
      </div>
    </div>
  );
};
