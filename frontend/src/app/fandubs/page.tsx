"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Navbar } from "@/components/navbar";
import { BottomNav } from "@/components/bottom-nav";
import {
  Mic,
  Users,
  Tv,
  Film,
  Crown,
  Sparkles,
  ChevronRight,
  Search,
  ExternalLink,
  ShieldCheck,
  Flame,
  ArrowRight,
  Heart,
  Loader2,
  X,
} from "lucide-react";
import { useAuth } from "@/context/auth-context";

interface FandubStudio {
  id: number;
  name: string;
  slug: string;
  logo_url: string;
  description: string;
  episodes_count: number;
  animes_count: number;
  followers_count: number;
  vip_price: number;
  contact_url: string;
  created_at: string;
}

export default function FandubsDirectoryPage() {
  const { user } = useAuth();
  const [studios, setStudios] = useState<FandubStudio[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>("");

  useEffect(() => {
    const fetchStudios = async () => {
      try {
        const res = await fetch("/api/v1/fandubs");
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          setStudios(json.data);
        }
      } catch (err) {
        console.error("Failed to load fandub studios:", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchStudios();
  }, []);

  const filteredStudios = studios.filter((s) =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (s.description && s.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="min-h-screen bg-[#060911] text-slate-100 flex flex-col selection:bg-rose-500 selection:text-white">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-3.5 sm:px-6 lg:px-8 pt-20 sm:pt-28 pb-28 space-y-6 sm:space-y-10">
        {/* Hero Spotlight */}
        <div className="relative rounded-3xl p-5 sm:p-8 md:p-10 overflow-hidden bg-gradient-to-br from-[#131127] via-[#0d1020] to-[#070a14] border border-amber-500/20 shadow-2xl">
          <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/10 blur-3xl rounded-full pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-80 h-80 bg-rose-600/10 blur-3xl rounded-full pointer-events-none" />

          <div className="relative z-10 max-w-3xl space-y-3.5 sm:space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[11px] sm:text-xs font-bold tracking-wider uppercase">
              <Mic className="w-3.5 h-3.5" /> Dublyaj Ekotizimi
            </div>
            <h1 className="text-xl sm:text-3xl md:text-4xl lg:text-5xl font-black text-white tracking-tight leading-tight">
              O&apos;zbekiston{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-rose-500 to-purple-400">
                Fandub Studiyalari
              </span>
            </h1>
            <p className="text-[11px] sm:text-xs md:text-sm text-slate-300 leading-relaxed max-w-2xl">
              Sevimli anime qahramonlaringizga o&apos;zbek tilida jon bag&apos;ishlayotgan ovoz aktyorlari,
              tarjimonlar va ijodiy studiyalar ekotizimi. Har bir studiyaning o&apos;z katalogi, VIP obunasi
              va jamoasi bilan tanishing.
            </p>

            {/* Clean Full-Width Search Bar (Without Studiya Kabineti) */}
            <div className="pt-2 max-w-xl w-full">
              <div className="relative w-full">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Studiyani nomi yoki tavsifi bo'yicha qidirish..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-11 pr-10 py-3 rounded-2xl bg-[#04060c]/90 border border-white/10 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/60 transition-all shadow-inner"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-white transition-colors"
                    aria-label="Qidiruvni tozalash"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Studios Grid */}
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-sm sm:text-base font-black text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>Barcha Rasmiy Studiyalar ({filteredStudios.length})</span>
            </h2>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {[...Array(6)].map((_, i) => (
                <div
                  key={i}
                  className="h-64 rounded-3xl bg-[#0a0f1d]/60 border border-white/5 animate-pulse p-6 space-y-4"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-2xl bg-white/5" />
                    <div className="space-y-2 flex-1">
                      <div className="h-4 w-32 bg-white/10 rounded" />
                      <div className="h-3 w-24 bg-white/5 rounded" />
                    </div>
                  </div>
                  <div className="h-10 bg-white/5 rounded-xl" />
                  <div className="h-10 bg-white/5 rounded-xl" />
                </div>
              ))}
            </div>
          ) : filteredStudios.length === 0 ? (
            <div className="text-center py-16 px-4 rounded-3xl bg-[#0a0f1d]/50 border border-white/5 space-y-3">
              <Mic className="w-12 h-12 text-slate-500 mx-auto" />
              <p className="text-sm text-slate-400 font-bold">Hech qanday studiya topilmadi</p>
              <p className="text-xs text-slate-500">Qidiruv so&apos;zini o&apos;zgartirib ko&apos;ring</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {filteredStudios.map((studio) => {
                const targetSlug = studio.slug || studio.id.toString();
                return (
                  <div
                    key={studio.id}
                    className="group relative rounded-3xl bg-gradient-to-b from-[#0e1424] to-[#080d1a] border border-white/10 hover:border-amber-500/40 p-5 sm:p-6 transition-all duration-300 hover:shadow-[0_12px_40px_rgba(245,158,11,0.15)] flex flex-col justify-between space-y-5"
                  >
                    {/* Top Info */}
                    <div className="space-y-4">
                      <div className="flex items-start gap-4">
                        {/* Studio Logo */}
                        <div className="relative w-16 h-16 rounded-2xl overflow-hidden bg-gradient-to-tr from-amber-500/20 to-rose-500/20 border border-white/10 p-1 shrink-0 group-hover:scale-105 transition-transform">
                          {studio.logo_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={studio.logo_url}
                              alt={studio.name}
                              className="w-full h-full object-cover rounded-xl"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-amber-400 font-black text-xl">
                              {studio.name.charAt(0)}
                            </div>
                          )}
                          <div className="absolute -bottom-1 -right-1 p-1 bg-amber-500 text-black rounded-full shadow-neon">
                            <ShieldCheck className="w-3 h-3" />
                          </div>
                        </div>

                        {/* Studio Name & Badge */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <h3 className="text-base sm:text-lg font-black text-white truncate group-hover:text-amber-400 transition-colors">
                              {studio.name}
                            </h3>
                            <Crown className="w-4 h-4 text-amber-400 shrink-0" />
                          </div>
                          <p className="text-[11px] text-slate-400 line-clamp-2 mt-1 leading-relaxed">
                            {studio.description || "O'zbek tilidagi eng sara animelarni professional ovoz bilan taqdim etuvchi jamoa."}
                          </p>
                        </div>
                      </div>

                      {/* Studio Stats Badges */}
                      <div className="grid grid-cols-3 gap-2 pt-1 text-center">
                        <div className="p-2 rounded-xl bg-white/5 border border-white/5">
                          <span className="text-xs font-black text-white block">
                            {studio.episodes_count || 0}
                          </span>
                          <span className="text-[10px] text-slate-400">Qismlar</span>
                        </div>
                        <div className="p-2 rounded-xl bg-white/5 border border-white/5">
                          <span className="text-xs font-black text-white block">
                            {studio.animes_count || 0}
                          </span>
                          <span className="text-[10px] text-slate-400">Animelar</span>
                        </div>
                        <div className="p-2 rounded-xl bg-white/5 border border-white/5">
                          <span className="text-xs font-black text-amber-400 block">
                            {studio.followers_count || 0}
                          </span>
                          <span className="text-[10px] text-slate-400">Kuzatuvchi</span>
                        </div>
                      </div>

                      {/* VIP Subscription Badge */}
                      <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs">
                        <span className="text-amber-300 font-semibold flex items-center gap-1">
                          <Crown className="w-3.5 h-3.5 text-amber-400" /> VIP Obuna
                        </span>
                        <span className="font-bold text-white">
                          {(studio.vip_price || 10000).toLocaleString()} so&apos;m/oy
                        </span>
                      </div>
                    </div>

                    {/* Action Button */}
                    <Link
                      href={`/fandubs/${targetSlug}`}
                      className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-gradient-to-r from-amber-500 to-rose-600 hover:from-amber-400 hover:to-rose-500 text-white text-xs font-black shadow-neon transition-all group-hover:scale-[1.02]"
                    >
                      <span>Studiya Ekotizimiga O&apos;tish</span>
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </Link>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
