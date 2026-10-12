"use client";

import React from "react";
import Link from "next/link";
import { Navbar } from "@/components/navbar";
import { Shield, Mail, Send, AlertTriangle, CheckCircle, ArrowLeft } from "lucide-react";

export default function DMCAPage() {
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
            <div className="w-12 h-12 rounded-2xl bg-yellow-500/20 border border-yellow-500/30 flex items-center justify-center text-yellow-400 shadow-neon">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
                DMCA & Mualliflik Huquqi Siyosati
              </h1>
              <p className="text-xs text-gray-400">
                Digital Millennium Copyright Act & Huquqiy Ogohlantirish
              </p>
            </div>
          </div>
        </div>

        {/* Body Content */}
        <div className="space-y-6 text-xs sm:text-sm text-gray-300 leading-relaxed bg-[#0e0f17] border border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl">
          <section className="space-y-2">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-yellow-400" />
              <span>1. Sayt Maqomi & Chopar Ekanligi (Disclaimer)</span>
            </h2>
            <p>
              <b>Hikaku Anime (anime.hikaku.uz)</b> platformasi notijorat, madaniy va o'zbek tiliga havaskor ovozlashtirish hamda tarjima qiluvchi axborot chopari (distributor & content aggregator) hisoblanadi.
            </p>
            <p>
              Sayt ma'muriyati platformada joylashtirilgan original animatsiyalar, musiqalar va personajlarning asl mualliflik huquqiga egalik qilmaydi va egalik qilishga da'vo qilmaydi. Barcha intellektual mulk huquqlari ularning qonuniy egalariga (ishlab chiqaruvchi studiyalar va litsenziarorlarga) tegishlidir.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-400" />
              <span>2. Huquq Egalari Bilan Hamkorlik & O'chirish Qoidasi (Takedown Policy)</span>
            </h2>
            <p>
              Biz xalqaro mualliflik huquqlarini (DMCA va tegishli konvensiyalarni) to'liq hurmat qilamiz. Agar siz biron-bir animatsion asarning qonuniy huquq egasi (yoki uning rasmiy vakili) bo'lsangiz va sizning huquqlaringiz buzilgan deb hisoblasangiz, biz bilan bog'lanishingiz mumkin.
            </p>
            <p>
              Murojaatingiz qonuniy tasdiqlangach, shikoyat qilingan material <b>24–48 soat</b> ichida saytdan va bulut omboridan butunlay olib tashlanadi.
            </p>
          </section>

          <section className="space-y-3 p-5 rounded-2xl bg-white/[0.02] border border-white/10">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">
              Murojaat Uchun Kerakli Ma'lumotlar:
            </h3>
            <ul className="list-disc list-inside space-y-1.5 text-gray-300 text-xs pl-2">
              <li>Mualliflik huquqi egasining to'liq nomi yoki kompaniya rekvizitlari;</li>
              <li>Sizning vakolatli vakil ekanligingizni tasdiqlovchi rasmiy hujjat yoki havola;</li>
              <li>Saytimizdagi qoidabuzarlik deb hisoblangan aniq sahifa havolasi (URL);</li>
              <li>Bog'lanish uchun rasmiy e-pochta manzili va telefon raqami.</li>
            </ul>
          </section>

          <section className="space-y-3 pt-2">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Mail className="w-4 h-4 text-purple-400" />
              <span>3. Mualliflar Uchun To'g'ridan-to'g'ri Aloqa</span>
            </h2>
            <p>
              Mualliflik huquqi masalalarida quyidagi rasmiy kanallar orqali murojaat qilishingiz mumkin:
            </p>
            <div className="flex flex-wrap gap-3 pt-1">
              <a
                href="https://t.me/hikaku_admin"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-purple-600/20 border border-purple-500/30 text-purple-300 hover:bg-purple-600/30 text-xs font-bold transition-colors"
              >
                <Send className="w-4 h-4 text-purple-400" />
                <span>Telegram: @hikaku_admin</span>
              </a>
              <a
                href="mailto:hikakuanime@gmail.com"
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-gray-300 hover:text-white text-xs font-bold transition-colors"
              >
                <Mail className="w-4 h-4 text-gray-400" />
                <span>Email: hikakuanime@gmail.com</span>
              </a>
            </div>
          </section>
        </div>
      </main>

    </>
  );
}
