"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Navbar } from "@/components/navbar";
import { BottomNav } from "@/components/bottom-nav";
import {
  BookOpen,
  Sparkles,
  Shield,
  Zap,
  Crown,
  Palette,
  Film,
  Users,
  Send,
  CheckCircle2,
  ChevronRight,
  ExternalLink,
  Lock,
  ArrowRight,
  HelpCircle,
  Play,
  UploadCloud,
  FileCheck,
  Megaphone,
  Layers,
  Clock,
  Coins,
} from "lucide-react";

interface GuideSection {
  id: string;
  badge: string;
  title: string;
  shortDesc: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  steps: {
    title: string;
    description: string;
    details?: string[];
    tip?: string;
  }[];
}

const GUIDE_SECTIONS: GuideSection[] = [
  {
    id: "profile-branding",
    badge: "1-Qadam",
    title: "Studiya Profili & Shaxsiy Brending",
    shortDesc: "Studiyangiz vitrinasini moslashtiring: logo, cover banner, rangli mavzu, e'lonlar va aloqalar.",
    icon: Palette,
    color: "from-indigo-500 to-cyan-500",
    steps: [
      {
        title: "1. Studiya ma'lumotlarini to'ldirish",
        description: "Studiya kabinetida (/fandub) nomingiz, logotipingiz hamda studiyangiz haqidagi qisqacha tavsifni kiriting.",
        details: [
          "Studiya logotipi — kvadrat (1:1) formatda, tiniq PNG yoki WebP tavsiya etiladi.",
          "Tavsif — jamoangiz qachon tashkil topgani va qaysi yo'nalishdagi animelarga ovoz berishingizni yozing.",
        ],
      },
      {
        title: "2. Rangli Mavzu & Cover Banner tanlash",
        description: "Hikaku har bir fandub studiyasiga o'zining shaxsiy brend rangini tanlash imkonini beradi.",
        details: [
          "Mavjud ranglar: 🟣 Indigo, 🟢 Zumrad (Emerald), 🟡 Qahrabo (Amber), 💜 Binafsha (Violet), 🔵 Moviy (Cyan), 🔴 Atirgul (Rose).",
          "Keng formatli Cover Banner (16:9 yoki 3:1) yuklab, vitrinangizni to'liq premium ko'rinishga keltiring.",
        ],
        tip: "Mavzu rangi studiyangizning ommaviy sahifasidagi tugmalar, ramkalar va animatsiyalarda to'liq aks etadi.",
      },
      {
        title: "3. Jonli E'lonlar Satri (Announcement Bar)",
        description: "Yangi fasl premyerasi, qismlar chiqish jadvali yoki studiya yangiliklarini e'lon qilish uchun yuqori neon satrini yoqing.",
        details: [
          "E'lon matnini istalgan vaqtda o'zgartirish va bitta tugma bilan yoqish/o'chirish mumkin.",
          "Ushbu e'lon sizning sahifangizga kirgan har bir tomoshabin diqqatini birinchi bo'lib tortadi.",
        ],
      },
      {
        title: "4. Rasmiy Telegram Kanal & Admin Profili",
        description: "Tomoshabinlar siz bilan bevosita bog'lanishi uchun Telegram kanalingiz (@kanal) va aloqa profilingizni (@admin) kiriting.",
        details: [
          "Kiritilgan kanallar avtomatik tekshirilib, tomoshabinlarga toza kliklanadigan havolalar shaklida ko'rsatiladi.",
        ],
      },
    ],
  },
  {
    id: "upload-hls",
    badge: "2-Qadam",
    title: "Video Yuklash & Avtomatik HLS",
    shortDesc: "Brauzerdan to'g'ridan-to'g'ri B2 bulutiga yuklash va soniyalar ichida HLS (.m3u8) ga o'tkazish.",
    icon: Zap,
    color: "from-amber-500 to-rose-500",
    steps: [
      {
        title: "1. Animeni tanlash",
        description: "Studiya kabinetidagi tezkor qidiruvli Combobox orqali 356+ ta anime orasidan o'zingiz ovoz bergan asarni tanlang.",
        details: [
          "Qidiruv satriga anime nomining bir necha harfini yozsangiz kifoya (masalan: 'Mash'ala', 'Naruto').",
          "Tanlangan animening posteri va mavjud qismlari darhol namoyon bo'ladi.",
        ],
      },
      {
        title: "2. Qism raqami va sarlavhasini belgilash",
        description: "Tizim keyingi navbatdagi qism raqamini avtomatik taklif etadi (masalan: 1-qism, 2-qism). Sarlavha studiyangiz nomini o'z ichiga oladi.",
        details: [
          "Agar qism faqat VIP obunachilar uchun bo'lsa, '👑 Faqat VIP foydalanuvchilar uchun' katakchasini belgilang.",
        ],
      },
      {
        title: "3. Direct-to-B2 Yuklash & Avto-HLS Konvertatsiyasi",
        description: "Video faylni tanlashingiz bilan u brauzeringizdan to'g'ridan-to'g'ri Backblaze B2 bulut saqlagichiga xavfsiz yuklanadi.",
        details: [
          "1. Qabul: Fayl B2 bulutiga to'g'ridan-to'g'ri jo'natiladi (server trafigi tejaladi).",
          "2. HLS Konvertatsiya: FFmpeg stream-copy orqali video sifatini zarracha pasaytirmasdan 6 soniyalik HLS segmentlariga (.m3u8) o'giriladi.",
          "3. Avto-Saqlash: .m3u8 pleylist tayyor bo'lgach, qism avtomatik bazaga kiritiladi.",
        ],
        tip: "Hikaku platformasida barcha videolar faqat HLS formatida saqlanadi. Bu tomoshabinlar uchun videoni 0.75 soniyada, hech qanday qotishlarsiz boshlab beradi.",
      },
    ],
  },
  {
    id: "vip-monetization",
    badge: "3-Qadam",
    title: "VIP Monetizatsiya & To'lov Kvitansiyalari",
    shortDesc: "Oylik obuna narxini belgilash, VIP qulflash va kvitansiyalarni bir bosishda tasdiqlash.",
    icon: Crown,
    color: "from-amber-400 to-yellow-600",
    steps: [
      {
        title: "1. Oylik VIP Narxi va To'lov Rekvizitlarini kiritish",
        description: "Studiya kabinetida 'VIP Sozlamalari' tabiga o'tib, obunachilar uchun oylik narxni (masalan: 10,000 so'm) hamda to'lov qabul qiluvchi karta raqamingizni kiriting.",
        details: [
          "Ushbu ma'lumotlar faqat sizning studiyangizga tegishli bo'lib, barcha daromad 100% o'zingizda qoladi.",
          "Shuningdek, Telegram VIP botingiz yoki admin profilingiz havolasini biriktirishingiz shart.",
        ],
      },
      {
        title: "2. Qismlarni VIP Qulflash",
        description: "Yangi chiqqan qismlarni 'Faqat VIP' rejimida chiqaring. Oddiy foydalanuvchilar ushbu qismni ochganda qulflangan zamonaviy oyna ko'rinadi.",
        details: [
          "Qulflangan oynada siz belgilagan narx, studiyangiz nomi va bevosita sizga yoki botingizga olib boruvchi '💬 Fandub Adminga Yozish / VIP Olish' tugmasi chiqadi.",
          "Hech qanday uchinchi tomon yoki soxta linklar bo'lmaydi — tomoshabin faqat siz bilan bog'lanadi.",
        ],
      },
      {
        title: "3. Kvitansiyalarni Tasdiqlash & VIP Berish",
        description: "Foydalanuvchi to'lov qilib chekni yuborganida yoki sayt orqali kvitansiya jo'natganda, studiya kabinetida bitta bosishda VIP statusini yoqing.",
        details: [
          "'VIP Obunachilar' tabida yangi kvitansiyalar aks etadi.",
          "'✅ Tasdiqlash' tugmasi bosilishi bilan foydalanuvchiga avtomatik tarzda 30 kunlik VIP obuna beriladi va qulflangan qismlar bir zumda ochiladi.",
        ],
      },
    ],
  },
  {
    id: "team-management",
    badge: "4-Qadam",
    title: "Dublyorlar & Jamoa Boshqaruvi",
    shortDesc: "Ovoz beruvchilar, tarjimonlar va rejissyorlarni studiyangizga biriktiring va profilida aks ettiring.",
    icon: Users,
    color: "from-purple-500 to-indigo-500",
    steps: [
      {
        title: "1. Jamoa a'zolarini qo'shish",
        description: "Studiya kabinetidagi 'Jamoa' bo'limida yangi a'zolarni ularning Telegram ID raqami orqali biriktiring.",
        details: [
          "A'zoga mos rolni belgilang: 🎙️ Ovoz beruvchi (Dublyor), ✍️ Tarjimon, 🎧 Ovoz rejissyori (Sound Editor), 🎬 Tashkilotchi.",
          "Har bir a'zoning Telegram nikneymi avtomatik sinxronlanadi.",
        ],
      },
      {
        title: "2. Ommaviy Vitrinada A'zolarni Ko'rsatish",
        description: "Sizning studiya sahifangizda (/fandubs/[slug]) barcha jamoa a'zolari o'z rollari va Telegram profillari bilan ko'rinadi.",
        details: [
          "Tomoshabinlar sevimli ovoz egalarining shaxsiy Telegram kanallariga yoki profillariga o'tishi mumkin.",
          "Bu studiyangiz dublyorlariga shaxsiy auditoriya yig'ishga yordam beradi.",
        ],
      },
    ],
  },
  {
    id: "stream-security",
    badge: "5-Qadam",
    title: "Ovozli Kontent Xavfsizligi & Stream Token",
    shortDesc: "Video va ovozlarning noqonuniy o'g'irlanishidan ko'p qatlamli himoya tizimi.",
    icon: Shield,
    color: "from-cyan-500 to-blue-600",
    steps: [
      {
        title: "1. Vaqtinchalik Dinamik Stream Tokenlar",
        description: "Hikaku videoni to'g'ridan-to'g'ri ochiq havola orqali bermaydi. Har bir tomoshabin uchun serverda maxsus dinamik token yaratiladi.",
        details: [
          "Token har 2 soatda avtomatik eskiradi.",
          "Agar kimdir videoning to'g'ridan-to'g'ri manzilini nusxalab olsa ham, boshqa brauzer yoki IP manzilda u ishlamaydi.",
        ],
      },
      {
        title: "2. HLS Shifrlash & Segmentatsiya",
        description: "Videolar butun holda (.mp4) berilmaydi, balki bir necha yuzlab kichik shifrlangan .ts bo'laklariga ajratilgan holda uzatiladi.",
        details: [
          "Brauzer kengaytmalari yoki oddiy 'Download Video' dasturlari faylni to'liq yuklab ololmaydi.",
          "Backblaze B2 bulutidagi asl manbalar begona ko'zlardan to'liq yashirilgan.",
        ],
      },
      {
        title: "3. VIP Ruxsat Nazorati",
        description: "VIP qismga so'rov kelganda, Go backend foydalanuvchining ayni shu fandub uchun VIP obunasi borligini ma'lumotlar bazasida millisekundlarda tekshiradi.",
        details: [
          "Agar obuna bo'lmasa, video stream manzili umuman berilmaydi va faqat xavfsiz VIP ogohlantirish oynasi qaytariladi.",
        ],
      },
    ],
  },
];

const FAQS = [
  {
    q: "Qanday qilib Hikaku platformasida yangi Fandub studiya ochish mumkin?",
    a: "Yangi studiya ochish mutlaqo bepul! Platforma administratsiyasiga (@iskurama) Telegram orqali yozasiz, studiyangiz nomi va Telegram kanalingizni taqdim etasiz. Admin sizning Telegram ID raqamingizga studiya huquqini biriktiradi va siz /fandub kabinetiga darhol kira olasiz.",
  },
  {
    q: "Yuklangan qism saytda qancha vaqtda paydo bo'ladi?",
    a: "Video B2 bulutiga yuklanib, HLS konvertatsiyasi yakunlanishi bilan (odatda 15-40 soniya) qism saytda hamda studiyangiz vitrinasida avtomatik ravishda paydo bo'ladi. Hech qanday qo'shimcha kutilish talab qilinmaydi.",
  },
  {
    q: "VIP obunadan tushgan pul qayerga tushadi?",
    a: "Barcha to'lovlar 100% to'g'ridan-to'g'ri sizning o'zingizning karta raqamingizga yoki botingizga tushadi. Hikaku platformasi fandub studiyalarning daromadidan hech qanday komissiya yoki foiz ushlab qolmaydi.",
  },
  {
    q: "Videolarimni boshqa saytlar o'g'irlab ketishi mumkinmi?",
    a: "Yo'q, Hikaku barcha videolarni HLS (.m3u8) adaptiv segmentatsiyasi va dinamik vaqtinchalik Stream Tokenlar bilan himoyalaydi. To'g'ridan-to'g'ri MP4 havolasi bo'lmagani sababli kontentni o'g'irlash yoki nusxalash amalda imkonsiz.",
  },
];

export default function DocsKnowledgeBasePage() {
  const [activeSectionId, setActiveSectionId] = useState<string>("profile-branding");
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);

  const activeSection = GUIDE_SECTIONS.find((s) => s.id === activeSectionId) || GUIDE_SECTIONS[0];

  return (
    <div className="min-h-screen bg-[#05070e] text-slate-200 selection:bg-rose-500 selection:text-white relative">
      <Navbar />

      {/* Ambient background glow */}
      <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[800px] h-[350px] bg-gradient-to-tr from-indigo-600/15 via-rose-600/10 to-amber-500/15 blur-[140px] pointer-events-none" />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-28 pb-24 relative z-10 space-y-12">
        {/* HERO SECTION */}
        <section className="text-center space-y-5 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-xs font-bold shadow-neon">
            <BookOpen className="w-3.5 h-3.5 text-indigo-400" />
            <span>Fandub Bilimlar Bazasi & Qo&apos;llanma</span>
          </div>

          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-white tracking-tight leading-tight">
            Fandub Studiyalar uchun{" "}
            <span className="bg-gradient-to-r from-indigo-400 via-rose-400 to-amber-400 bg-clip-text text-transparent">
              To&apos;liq Qo&apos;llanma
            </span>
          </h1>

          <p className="text-sm sm:text-base text-slate-400 leading-relaxed">
            Hikaku platformasida o&apos;z studiyangizni oching, ovozli epizodlarni yuqori tezlikda (Avto-HLS)
            joylang, mustaqil VIP obuna orqali daromad oling va ovozli kontentingizni ko&apos;p qatlamli himoya qiling.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <Link
              href="/fandub"
              className="px-6 py-3 rounded-2xl bg-gradient-to-r from-indigo-600 to-rose-600 hover:from-indigo-500 hover:to-rose-500 text-white text-xs sm:text-sm font-black shadow-neon transition-all flex items-center gap-2 group"
            >
              <Film className="w-4 h-4 text-white" />
              <span>Studiya Kabinetiga Kirish</span>
              <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>

            <a
              href="https://t.me/iskurama"
              target="_blank"
              rel="noopener noreferrer"
              className="px-6 py-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-slate-200 text-xs sm:text-sm font-bold transition-all flex items-center gap-2"
            >
              <Send className="w-4 h-4 text-sky-400" />
              <span>Studiya Ochish / Bog&apos;lanish</span>
            </a>
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-6 border-t border-white/5">
            <div className="p-3 rounded-2xl bg-white/5 border border-white/5 text-center">
              <Zap className="w-4 h-4 text-emerald-400 mx-auto mb-1" />
              <div className="text-xs font-black text-white">0.75s HLS</div>
              <div className="text-[10px] text-slate-400">Tezkor Ijro</div>
            </div>
            <div className="p-3 rounded-2xl bg-white/5 border border-white/5 text-center">
              <Shield className="w-4 h-4 text-cyan-400 mx-auto mb-1" />
              <div className="text-xs font-black text-white">Token Himoya</div>
              <div className="text-[10px] text-slate-400">Anti-Piracy</div>
            </div>
            <div className="p-3 rounded-2xl bg-white/5 border border-white/5 text-center">
              <Crown className="w-4 h-4 text-amber-400 mx-auto mb-1" />
              <div className="text-xs font-black text-white">100% Daromad</div>
              <div className="text-[10px] text-slate-400">Komissiyasiz VIP</div>
            </div>
            <div className="p-3 rounded-2xl bg-white/5 border border-white/5 text-center">
              <Palette className="w-4 h-4 text-purple-400 mx-auto mb-1" />
              <div className="text-xs font-black text-white">6 Cyber Rang</div>
              <div className="text-[10px] text-slate-400">Shaxsiy Brending</div>
            </div>
          </div>
        </section>

        {/* INTERACTIVE GUIDE WORKSPACE */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Navigation Sidebar */}
          <div className="lg:col-span-4 space-y-2.5 lg:sticky lg:top-28">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 px-3 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-indigo-400" />
              <span>Qo&apos;llanma Bo&apos;limlari</span>
            </h3>

            <div className="space-y-2">
              {GUIDE_SECTIONS.map((sec) => {
                const Icon = sec.icon;
                const isActive = sec.id === activeSectionId;

                return (
                  <button
                    key={sec.id}
                    onClick={() => setActiveSectionId(sec.id)}
                    className={`w-full text-left p-3.5 rounded-2xl border transition-all flex items-start gap-3.5 group ${
                      isActive
                        ? "bg-gradient-to-r from-[#141b34] to-[#0e1428] border-indigo-500/50 shadow-neon"
                        : "bg-[#0b0f20]/70 border-white/5 hover:border-white/15 hover:bg-[#10162e]/80"
                    }`}
                  >
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-105 ${
                        isActive
                          ? "bg-indigo-500 text-white shadow-sm"
                          : "bg-white/5 text-slate-400 group-hover:text-white"
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wide">
                          {sec.badge}
                        </span>
                        {isActive && <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />}
                      </div>
                      <h4
                        className={`text-xs font-black line-clamp-1 transition-colors ${
                          isActive ? "text-white" : "text-slate-300 group-hover:text-white"
                        }`}
                      >
                        {sec.title}
                      </h4>
                      <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">{sec.shortDesc}</p>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Fandub Direct Help Box */}
            <div className="p-4 rounded-2xl bg-gradient-to-br from-[#12182c] to-[#0b0f20] border border-white/10 space-y-3 mt-4">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-300 flex items-center justify-center">
                  <Sparkles className="w-3.5 h-3.5" />
                </div>
                <h4 className="text-xs font-black text-white">Yordam kerakmi?</h4>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Studiya ochish, anime biriktirish yoki video yuklashda savollaringiz bo&apos;lsa, to&apos;g&apos;ridan-to&apos;g&apos;ri murojaat qiling.
              </p>
              <a
                href="https://t.me/iskurama"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/30 text-sky-300 text-xs font-bold transition-colors"
              >
                <Send className="w-3.5 h-3.5" />
                <span>@iskurama ga yozish</span>
              </a>
            </div>
          </div>

          {/* Right Detailed Section Content */}
          <div className="lg:col-span-8 space-y-6">
            <div className="p-6 sm:p-8 rounded-3xl bg-[#0b0f20]/90 border border-white/10 shadow-2xl backdrop-blur-xl space-y-6">
              {/* Header */}
              <div className="flex flex-wrap items-center justify-between gap-3 pb-6 border-b border-white/10">
                <div className="space-y-1">
                  <span className="px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 font-bold text-xs">
                    {activeSection.badge}
                  </span>
                  <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight pt-1">
                    {activeSection.title}
                  </h2>
                </div>

                <div className="p-3 rounded-2xl bg-white/5 border border-white/10">
                  {React.createElement(activeSection.icon, { className: "w-6 h-6 text-indigo-400" })}
                </div>
              </div>

              {/* Steps List */}
              <div className="space-y-6">
                {activeSection.steps.map((step, idx) => (
                  <div
                    key={idx}
                    className="p-5 rounded-2xl bg-[#111728]/80 border border-white/5 hover:border-white/15 transition-all space-y-3"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-6 h-6 rounded-full bg-indigo-500/20 text-indigo-300 flex items-center justify-center font-bold text-xs shrink-0">
                        {idx + 1}
                      </div>
                      <h3 className="text-sm sm:text-base font-black text-white">{step.title}</h3>
                    </div>

                    <p className="text-xs sm:text-sm text-slate-300 leading-relaxed pl-8">
                      {step.description}
                    </p>

                    {step.details && step.details.length > 0 && (
                      <ul className="space-y-1.5 pl-8 pt-1">
                        {step.details.map((d, dIdx) => (
                          <li key={dIdx} className="text-xs text-slate-400 flex items-start gap-2">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                            <span>{d}</span>
                          </li>
                        ))}
                      </ul>
                    )}

                    {step.tip && (
                      <div className="ml-8 mt-2 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs flex items-start gap-2">
                        <Sparkles className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                        <span>{step.tip}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Bottom Quick Switch */}
              <div className="flex items-center justify-between pt-4 border-t border-white/5">
                <Link
                  href="/fandub"
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs shadow-neon transition-all flex items-center gap-2"
                >
                  <span>Kabinetda Qo&apos;llash</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>

                <span className="text-[11px] text-slate-500">
                  Hikaku Fandub Hub v2.0
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* FREQUENTLY ASKED QUESTIONS (FAQ) */}
        <section className="space-y-6 max-w-4xl mx-auto pt-8">
          <div className="text-center space-y-2">
            <h2 className="text-2xl sm:text-3xl font-black text-white flex items-center justify-center gap-2">
              <HelpCircle className="w-6 h-6 text-indigo-400" />
              <span>Ko&apos;p So&apos;raladigan Savollar</span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-400">
              Fandub studiyalar va ijodkorlar tomonidan eng ko&apos;p beriladigan muhim savollarga javoblar.
            </p>
          </div>

          <div className="space-y-3">
            {FAQS.map((faq, idx) => {
              const isOpen = openFaqIndex === idx;

              return (
                <div
                  key={idx}
                  className="rounded-2xl bg-[#0b0f20]/80 border border-white/10 overflow-hidden transition-colors"
                >
                  <button
                    onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                    className="w-full text-left p-4 sm:p-5 flex items-center justify-between gap-4 hover:bg-white/5 transition-colors"
                  >
                    <span className="text-xs sm:text-sm font-bold text-white">{faq.q}</span>
                    <ChevronRight
                      className={`w-4 h-4 text-slate-400 shrink-0 transition-transform ${
                        isOpen ? "rotate-90 text-indigo-400" : ""
                      }`}
                    />
                  </button>

                  {isOpen && (
                    <div className="px-4 sm:px-5 pb-5 pt-1 text-xs sm:text-sm text-slate-300 leading-relaxed border-t border-white/5 bg-[#111728]/40">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* FINAL CALL TO ACTION */}
        <section className="p-8 sm:p-12 rounded-3xl bg-gradient-to-r from-indigo-900/40 via-purple-900/30 to-rose-900/40 border border-white/15 text-center space-y-5 relative overflow-hidden shadow-2xl">
          <div className="max-w-2xl mx-auto space-y-3 relative z-10">
            <h2 className="text-2xl sm:text-3xl font-black text-white">
              Studiyangizni bugunoq Hikaku bilan birlashtiring
            </h2>
            <p className="text-xs sm:text-sm text-slate-300">
              O&apos;zbekistondagi minglab anime ishqibozlariga ovozingizni yetkazing, mehnatingizni qadrlang va
              rasmiy studiya maqomiga ega bo&apos;ling.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3 pt-3">
              <Link
                href="/fandub"
                className="px-6 py-3 rounded-2xl bg-white text-slate-950 hover:bg-slate-200 font-black text-xs sm:text-sm shadow-xl transition-all flex items-center gap-2"
              >
                <span>Studiya Kabinetini Ochish</span>
                <ChevronRight className="w-4 h-4" />
              </Link>
              <a
                href="https://t.me/iskurama"
                target="_blank"
                rel="noopener noreferrer"
                className="px-6 py-3 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold text-xs sm:text-sm transition-all flex items-center gap-2"
              >
                <Send className="w-4 h-4 text-sky-400" />
                <span>Aloqa (@iskurama)</span>
              </a>
            </div>
          </div>
        </section>
      </main>

      <BottomNav />
    </div>
  );
}
