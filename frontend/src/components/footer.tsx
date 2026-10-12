"use client";

import React from "react";
import Link from "next/link";
import { Shield, FileText, Info, Send, Heart, Sparkles, ExternalLink, Bot, Crown, BookOpen, Mic2 } from "lucide-react";
import { Logo } from "@/components/logo";

export const Footer: React.FC = () => {
  return (
    <footer className="bg-[#05070e]/95 border-t border-white/10 text-slate-400 text-xs mt-16 pt-12 pb-24 md:pb-12 relative overflow-hidden">
      {/* Background ambient neon glow */}
      <div className="absolute top-0 left-1/4 w-96 h-32 bg-rose-600/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-96 h-32 bg-cyan-600/10 blur-[120px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Col 1: Brand & Bio */}
          <div className="space-y-3.5 md:col-span-2">
            <Logo size="md" />
            <p className="text-xs text-slate-400 max-w-md leading-relaxed">
              O&apos;zbekistondagi eng zamonaviy, tezyurar va qulay anime platformasi. Barcha animelar yuqori sifatda (Full HD), professional o&apos;zbekcha dublyaj hamda subtitrlarda taqdim etiladi.
            </p>
            <div className="flex flex-wrap items-center gap-2.5 pt-1">
              <a
                href="https://t.me/hikakuz"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/30 text-sky-300 hover:text-white transition-all text-xs font-bold group"
              >
                <Send className="w-3.5 h-3.5 text-sky-400 group-hover:scale-110 transition-transform" />
                <span>@hikakuz</span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              </a>
              <a
                href="https://t.me/hikakuzbot"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 hover:text-white transition-all text-xs font-bold group"
              >
                <Bot className="w-3.5 h-3.5 text-rose-400 group-hover:scale-110 transition-transform" />
                <span>@hikakuzbot</span>
              </a>
            </div>
          </div>

          {/* Col 2: Tezkor Sahifalar */}
          <div className="space-y-3">
            <h4 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-rose-500" />
              <span>Bo&apos;limlar</span>
            </h4>
            <ul className="space-y-2">
              <li>
                <Link href="/" className="hover:text-rose-400 transition-colors">
                  Bosh Sahifa
                </Link>
              </li>
              <li>
                <Link href="/homiylik" className="hover:text-rose-400 transition-colors flex items-center gap-1.5 font-semibold text-slate-300">
                  <Heart className="w-3.5 h-3.5 text-rose-400 fill-rose-400/30" />
                  <span>Homiylik & Qo&apos;llab-quvvatlash</span>
                </Link>
              </li>
              <li>
                <Link href="/#trending" className="hover:text-rose-400 transition-colors">
                  Trenddagi Animelar
                </Link>
              </li>
              <li>
                <Link href="/#genres" className="hover:text-rose-400 transition-colors">
                  Janrlar Katalogi
                </Link>
              </li>
              <li>
                <Link href="/fandubs" className="hover:text-amber-400 transition-colors flex items-center gap-1.5">
                  <Mic2 className="w-3.5 h-3.5 text-amber-400" />
                  <span>Fandub Studiyalar</span>
                </Link>
              </li>
              <li>
                <Link href="/docs" className="hover:text-indigo-400 transition-colors flex items-center gap-1.5 text-indigo-300 font-semibold">
                  <BookOpen className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Fandub Qo&apos;llanma</span>
                </Link>
              </li>
              <li>
                <a
                  href="https://t.me/hikakuz"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-sky-400 transition-colors flex items-center gap-1"
                >
                  <span>Telegram Kanal</span>
                  <ExternalLink className="w-3 h-3 text-slate-500" />
                </a>
              </li>
            </ul>
          </div>

          {/* Col 3: Qonuniy & Huquq */}
          <div className="space-y-3">
            <h4 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-cyan-400" />
              <span>Qonuniy & Yordam</span>
            </h4>
            <ul className="space-y-2">
              <li>
                <Link href="/dmca" className="hover:text-rose-400 transition-colors flex items-center gap-1.5 text-rose-300/90 font-medium">
                  <Shield className="w-3.5 h-3.5 text-rose-400" />
                  <span>DMCA & Mualliflik Huquqi</span>
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="hover:text-slate-200 transition-colors flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-slate-400" />
                  <span>Maxfiylik Siyosati (Privacy)</span>
                </Link>
              </li>
              <li>
                <a
                  href="https://t.me/hikakuzbot"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-rose-400 transition-colors flex items-center gap-1.5"
                >
                  <Bot className="w-3.5 h-3.5 text-slate-400" />
                  <span>Qo&apos;llab-quvvatlash (Bot)</span>
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Legal Disclaimer Box */}
        <div className="p-4 rounded-2xl bg-[#090d1a]/80 border border-white/5 text-[11px] text-slate-400 leading-relaxed space-y-2 shadow-inner">
          <p className="font-bold text-slate-200 flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span>Huquqiy Ogohlantirish (Legal Disclaimer):</span>
          </p>
          <p>
            Hikaku Anime platformasi faqat o&apos;zbek tiliga havaskor tarjima va axborot ulashuvchi notijorat chopar (aggregator) hisoblanadi. Sayt ma&apos;muriyati serverlarida noqonuniy fayllarni saqlamaydi, barcha video oqimlari ochiq manbalardan olingan. Agar siz mualliflik huquqi egasi bo&apos;lsangiz va materialingizni olib tashlashni istasangiz, iltimos <Link href="/dmca" className="text-rose-400 underline hover:text-rose-300">DMCA sahifasi</Link> yoki <a href="https://t.me/hikakuzbot" target="_blank" rel="noopener noreferrer" className="text-sky-400 underline">@hikakuzbot</a> orqali murojaat qiling.
          </p>
        </div>

        {/* Bottom Bar */}
        <div className="pt-6 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
          <p className="text-[11px] text-slate-500">
            &copy; {new Date().getFullYear()} <b className="text-slate-300">Hikaku Anime</b> (hikaku.uz). Barcha huquqlar himoyalangan.
          </p>
          <p className="text-[11px] text-slate-400 flex items-center justify-center gap-1">
            <span>Made with</span>
            <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500" />
            <span>for Uzbek Anime Community</span>
          </p>
        </div>
      </div>
    </footer>
  );
};
