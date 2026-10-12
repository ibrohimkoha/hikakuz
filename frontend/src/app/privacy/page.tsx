"use client";

import React from "react";
import Link from "next/link";
import { Navbar } from "@/components/navbar";
import { FileText, Shield, Cookie, Lock, ArrowLeft } from "lucide-react";

export default function PrivacyPage() {
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
            <div className="w-12 h-12 rounded-2xl bg-purple-600/20 border border-purple-500/30 flex items-center justify-center text-purple-400 shadow-neon">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
                Maxfiylik Siyosati (Privacy Policy)
              </h1>
              <p className="text-xs text-gray-400">
                Foydalanuvchilar ma'lumotlari xavfsizligi va daxlsizligi kafolati
              </p>
            </div>
          </div>
        </div>

        {/* Body Content */}
        <div className="space-y-6 text-xs sm:text-sm text-gray-300 leading-relaxed bg-[#0e0f17] border border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl">
          <section className="space-y-2">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Shield className="w-4 h-4 text-emerald-400" />
              <span>1. Qanday Ma'lumotlar To'planadi?</span>
            </h2>
            <p>
              Hikaku Anime platformasida ro'yxatdan o'tganingizda yoki xizmatlardan foydalanganingizda quyidagi minimal ma'lumotlar saqlanishi mumkin:
            </p>
            <ul className="list-disc list-inside space-y-1.5 pl-2 text-gray-300 text-xs">
              <li><b>Telegram hisobi</b>: Telegram ID raqami, ism va username (avtorizatsiya va VIP statusini belgilash uchun);</li>
              <li><b>Google hisobi</b>: Ism va e-pochta manzili (agar Google orqali kirsangiz);</li>
              <li><b>Saqlanganlar va Tarix</b>: Siz sevimlilarga qo'shgan animelar va qoldirgan izohlaringiz.</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Cookie className="w-4 h-4 text-yellow-400" />
              <span>2. Cookie (Kuki) Fayllaridan Foydalanish</span>
            </h2>
            <p>
              Platformamiz foydalanuvchi qulayligini ta'minlash uchun Cookie va LocalStorage xotirasidan foydalanadi:
            </p>
            <ul className="list-disc list-inside space-y-1.5 pl-2 text-gray-300 text-xs">
              <li>Hisobingizga kirgan holatingizni saqlab qolish (Session Token);</li>
              <li>Video pleyer ovoz va sifat sozlamalarini eslab qolish;</li>
              <li>Platformaning yuklanish tezligini oshirish.</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Lock className="w-4 h-4 text-purple-400" />
              <span>3. Ma'lumotlar Xavfsizligi va Uchinchi Shaxslar</span>
            </h2>
            <p>
              Biz foydalanuvchilarimizning shaxsiy ma'lumotlarini qadrlaymiz. Sizning hisob ma'lumotlaringiz hech qachon uchinchi shaxslarga sotilmaydi yoki noqonuniy tarqatilmaydi.
            </p>
            <p>
              Barcha aloqa kanallari zamonaviy HTTPS va HMAC shifrlash protokollari bilan himoyalangan.
            </p>
          </section>
        </div>
      </main>

    </>
  );
}
