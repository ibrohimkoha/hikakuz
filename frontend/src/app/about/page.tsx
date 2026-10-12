"use client";

import React from "react";
import Link from "next/link";
import { Navbar } from "@/components/navbar";
import { Info, Sparkles, Play, Users, Heart, ArrowLeft, ExternalLink } from "lucide-react";

export default function AboutPage() {
  return (
    <>
      <Navbar />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-16 space-y-8 text-white">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs font-semibold text-gray-400 hover:text-purple-400 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Bosh sahifaga qaytish</span>
        </Link>

        {/* Header */}
        <div className="space-y-3 border-b border-white/10 pb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-purple-600 to-pink-500 flex items-center justify-center text-white shadow-neon">
              <Info className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
                Hikaku Anime Haqida
              </h1>
              <p className="text-xs text-gray-400">
                O'zbekistonda anime madaniyati va sifatli o'zbekcha dublyaj platformasi
              </p>
            </div>
          </div>
        </div>

        {/* Body Content */}
        <div className="space-y-6 text-xs sm:text-sm text-gray-300 leading-relaxed bg-[#0e0f17] border border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl">
          <section className="space-y-3">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-yellow-400" />
              <span>Bizning Missiyamiz</span>
            </h2>
            <p>
              <b>Hikaku Anime</b> — o'zbek anime ixlosmandlari uchun zamonaviy, tezkor va yuqori sifatli (Full HD) animelarni ona tilimizda tomosha qilish imkoniyatini yaratish maqsadida tashkil etilgan.
            </p>
            <p>
              Biz havaskor va professional ovozlashtirish studiyalari (Hikaku Dub, Meduza Dub va boshqalar) bilan hamkorlikda yangi va ommabop animelarni tezkorlik bilan o'zbek tiliga o'girib, muxlislarga bepul va qulay tarzda yetkazib beramiz.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Users className="w-4 h-4 text-purple-400" />
              <span>Hikaku.uz Ekotizimi</span>
            </h2>
            <p>
              Loyihamiz <b>Hikaku.uz</b> ekotizimining ajralmas qismi hisoblanadi. Foydalanuvchilar nafaqat sevimli animelarini tomosha qilishlari, balki anime qahramonlari, qobiliyatlari va taqqoslash bahslarida faol ishtirok etishlari mumkin.
            </p>
            <a
              href="https://hikaku.uz"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-purple-600/20 border border-purple-500/30 text-purple-300 hover:bg-purple-600/30 text-xs font-bold transition-colors"
            >
              <span>Hikaku.uz Bosh Sahifasiga O'tish</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </section>

          <section className="space-y-3 pt-2">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Play className="w-4 h-4 text-pink-400" />
              <span>Texnologik Afzalliklar</span>
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/5 space-y-1">
                <p className="font-bold text-white text-xs">⚡ Ultra-Tezkor Yuklanish</p>
                <p className="text-[11px] text-gray-400">Backblaze B2 bulut tizimi orqali videolarni qotmasdan strim qilish.</p>
              </div>
              <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/5 space-y-1">
                <p className="font-bold text-white text-xs">📱 100% Mobil Qulaylik</p>
                <p className="text-[11px] text-gray-400">Smartfon va planshetlar uchun to'liq moslashtirilgan interfeys.</p>
              </div>
            </div>
          </section>
        </div>
      </main>

    </>
  );
}
