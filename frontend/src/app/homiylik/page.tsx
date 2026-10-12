"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Heart,
  Server,
  Sparkles,
  Copy,
  Check,
  Send,
  Home,
  ShieldCheck,
  HelpCircle,
  Film,
  Zap,
} from "lucide-react";

export default function HomiylikPage() {
  const [copied, setCopied] = useState(false);
  const [settings, setSettings] = useState({
    card_number: "8600 0000 0000 0000",
    card_holder: "Hikaku Server Fondi",
    vip_price: 100000,
    support_bot: "hikakuzbot",
  });
  const [collectedAmount, setCollectedAmount] = useState(35000); // 35,000 so'm default progress
  const targetGoal = 100000; // 100,000 so'm / month

  useEffect(() => {
    fetch("/api/v1/admin/settings")
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.settings) {
          setSettings(data.settings);
        }
      })
      .catch(() => {});
  }, []);

  const handleCopyCard = () => {
    const rawCard = settings.card_number.replace(/\s+/g, "");
    navigator.clipboard.writeText(rawCard);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const percent = Math.min(100, Math.round((collectedAmount / targetGoal) * 100));

  return (
    <div className="min-h-screen bg-[#060911] text-slate-100 flex flex-col font-sans selection:bg-rose-600 selection:text-white pt-24 sm:pt-28 pb-16 px-4">
      <div className="max-w-3xl mx-auto w-full space-y-8 animate-fade-in">
        
        {/* Top Mission Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-rose-500/15 border border-rose-500/30 text-rose-400 text-xs font-black tracking-wider uppercase shadow-[0_0_20px_rgba(244,63,94,0.2)]">
            <Heart className="w-4 h-4 fill-rose-500 text-rose-500 animate-pulse" />
            <span>100% Bepul Platforma Missiyasi</span>
          </div>

          <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight leading-tight">
            Animelar Barcha Uchun <span className="text-transparent bg-clip-text bg-gradient-to-r from-rose-500 via-pink-400 to-amber-400">Doim Bepul!</span>
          </h1>

          <p className="text-xs sm:text-sm text-slate-300 max-w-xl mx-auto leading-relaxed">
            Hikaku Anime saytida hech qanday pullik obunalar, VIP cheklovlar yoki asabga teguvchi reklamalar yo&apos;q va bo&apos;lmaydi. Barcha qismlar barcha uchun 100% ochiq.
          </p>
        </div>

        {/* Server Goal Card (100,000 so'm / month) */}
        <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-b from-[#11172a] to-[#0a0e1c] border border-rose-500/30 shadow-2xl space-y-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-5">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-rose-600 to-amber-500 flex items-center justify-center text-white shadow-neon shrink-0">
                <Server className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                  <span>Oylik Server Maqsadi</span>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-bold border border-emerald-500/30">
                    2 TB Xotira
                  </span>
                </h2>
                <p className="text-xs text-slate-400">
                  Backblaze B2 bulutli xotirasi va serverning 1 oylik xarajati
                </p>
              </div>
            </div>

            <div className="text-right sm:text-right">
              <div className="text-xl sm:text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-rose-400 to-amber-300 font-mono">
                100 000 so&apos;m
              </div>
              <div className="text-[11px] text-slate-400">Oylik zarur mablag&apos;</div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs font-bold">
              <span className="text-slate-300 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                Yig&apos;ilgan mablag&apos;: <span className="text-white font-mono">{collectedAmount.toLocaleString()} so&apos;m</span>
              </span>
              <span className="text-rose-400 font-mono">{percent}%</span>
            </div>

            <div className="w-full h-3.5 bg-black/50 rounded-full overflow-hidden p-0.5 border border-white/10">
              <div
                className="h-full rounded-full bg-gradient-to-r from-rose-600 via-pink-500 to-amber-400 shadow-[0_0_15px_rgba(244,63,94,0.6)] transition-all duration-700"
                style={{ width: `${percent}%` }}
              />
            </div>
            <p className="text-[11px] text-slate-400 italic">
              Bu oy uchun server xarajati deyarli yopilmoqda. Qolgan mablag&apos;: {(targetGoal - collectedAmount).toLocaleString()} so&apos;m.
            </p>
          </div>

          {/* Payment Card Box */}
          <div className="p-5 rounded-2xl bg-[#070b14] border border-white/10 space-y-4">
            <div className="text-xs font-bold text-slate-300 flex items-center justify-between">
              <span>Ixtiyoriy Donat Uchun Karta:</span>
              <span className="text-[10px] text-slate-500 font-mono">Humo / Uzcard</span>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-[#111728] border border-rose-500/20">
              <div>
                <div className="text-base sm:text-lg font-mono font-black text-white tracking-widest">
                  {settings.card_number}
                </div>
                <div className="text-xs text-slate-400 font-medium">
                  {settings.card_holder}
                </div>
              </div>

              <button
                onClick={handleCopyCard}
                className={`flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs transition-all active:scale-95 shrink-0 ${
                  copied
                    ? "bg-emerald-500 text-black shadow-[0_0_15px_rgba(16,185,129,0.5)]"
                    : "bg-rose-600 hover:bg-rose-500 text-white shadow-neon"
                }`}
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                <span>{copied ? "Nusxalandi!" : "Kartani nusxalash"}</span>
              </button>
            </div>

            <p className="text-center text-[11px] text-slate-400 leading-relaxed">
              Istalgan <span className="text-rose-400 font-bold">5 000</span>, <span className="text-rose-400 font-bold">10 000</span> yoki <span className="text-rose-400 font-bold">20 000</span> so&apos;mlik samimiy yordamingiz saytimizning doimo bepul va yuqori tezlikda ishlashiga bevosita hissa qo&apos;shadi.
            </p>
          </div>

          {/* Telegram Support Link */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 text-xs text-slate-400">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Har bir tushgan mablag&apos; faqat server va 2TB xotiraga sarflanadi.</span>
            </div>

            <a
              href={`https://t.me/${settings.support_bot.replace("@", "")}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sky-400 hover:text-white font-bold flex items-center gap-1.5 transition-colors shrink-0"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Chek yuborish / Aloqa</span>
            </a>
          </div>
        </div>

        {/* FAQ / Clarification */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
          <div className="p-4 rounded-2xl bg-[#0c101c] border border-white/5 space-y-1.5">
            <div className="text-xs font-black text-rose-400 flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5" /> Tezkor Strim
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Backblaze B2 to&apos;g&apos;ridan-to&apos;g&apos;ri CDN orqali barcha qismlar 1 soniyada ochiladi.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-[#0c101c] border border-white/5 space-y-1.5">
            <div className="text-xs font-black text-cyan-400 flex items-center gap-1.5">
              <Film className="w-3.5 h-3.5" /> 0 ta Reklama
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Videoda va saytda hech qanday xalaqit beruvchi banner yoki kazino reklamalari yo&apos;q.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-[#0c101c] border border-white/5 space-y-1.5">
            <div className="text-xs font-black text-amber-400 flex items-center gap-1.5">
              <HelpCircle className="w-3.5 h-3.5" /> Majburiyat Yo&apos;q
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Homiylik faqat xohishga ko&apos;ra. Sayt doimo 100% barcha uchun bepul bo&apos;lib qoladi.
            </p>
          </div>
        </div>

        {/* Back to Home Button */}
        <div className="text-center pt-4">
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-white/5 hover:bg-white/10 text-xs font-bold text-slate-300 hover:text-white border border-white/10 transition-all hover:scale-105"
          >
            <Home className="w-4 h-4" /> Bosh sahifaga qaytish
          </Link>
        </div>

      </div>
    </div>
  );
}
