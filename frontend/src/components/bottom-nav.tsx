"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Film, Layers, Search, Send, User as UserIcon, Mic } from "lucide-react";
import { useAuth } from "@/context/auth-context";
import { useSearch } from "@/context/search-context";
import { UserPanel } from "@/components/user-panel";

interface BottomNavProps {
  onOpenSearch?: () => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ onOpenSearch }) => {
  const pathname = usePathname();
  const { user } = useAuth();
  const { openSearch } = useSearch();
  const handleOpenSearch = onOpenSearch || openSearch;

  const [isUserPanelOpen, setIsUserPanelOpen] = useState(false);

  return (
    <>
      <div className="md:hidden fixed bottom-3 left-3 right-3 z-40 max-w-md mx-auto pointer-events-auto">
        <nav className="rounded-2xl p-1.5 flex items-center justify-around shadow-[0_12px_40px_rgba(0,0,0,0.95),0_0_25px_rgba(225,29,72,0.15)] border border-white/15 backdrop-blur-2xl bg-[#080c18]/95">
          {/* Asosiy */}
          <Link
            href="/"
            aria-label="Bosh sahifa"
            className={`relative flex flex-col items-center gap-0.5 py-1.5 px-3 rounded-xl transition-all duration-200 ${
              pathname === "/"
                ? "text-rose-400 bg-rose-600/20 font-black shadow-[0_0_15px_rgba(225,29,72,0.3)] border border-rose-500/30 scale-105"
                : "text-slate-400 hover:text-white font-medium active:scale-95"
            }`}
          >
            <Film className="w-4.5 h-4.5" />
            <span className="text-[10px] tracking-tight">Asosiy</span>
          </Link>

          {/* Katalog */}
          <Link
            href="/katalog"
            aria-label="Anime katalogi"
            className={`relative flex flex-col items-center gap-0.5 py-1.5 px-3 rounded-xl transition-all duration-200 ${
              pathname.startsWith("/katalog")
                ? "text-rose-400 bg-rose-600/20 font-black shadow-[0_0_15px_rgba(225,29,72,0.3)] border border-rose-500/30 scale-105"
                : "text-slate-400 hover:text-white font-medium active:scale-95"
            }`}
          >
            <Layers className="w-4.5 h-4.5" />
            <span className="text-[10px] tracking-tight">Katalog</span>
          </Link>

          {/* Fandublar */}
          <Link
            href="/fandubs"
            aria-label="Dublyaj Studiyalari"
            className={`relative flex flex-col items-center gap-0.5 py-1.5 px-3 rounded-xl transition-all duration-200 ${
              pathname.startsWith("/fandub")
                ? "text-amber-400 bg-amber-500/20 font-black shadow-[0_0_15px_rgba(245,158,11,0.3)] border border-amber-500/30 scale-105"
                : "text-slate-400 hover:text-amber-300 font-medium active:scale-95"
            }`}
          >
            <Mic className="w-4.5 h-4.5" />
            <span className="text-[10px] tracking-tight">Fandub</span>
          </Link>

          {/* Qidiruv Trigger */}
          <button
            type="button"
            onClick={handleOpenSearch}
            aria-label="Qidiruv oynasini ochish"
            className="flex flex-col items-center gap-0.5 py-1.5 px-3 rounded-xl text-slate-400 hover:text-white transition-all font-medium active:scale-90 cursor-pointer"
          >
            <Search className="w-4.5 h-4.5 text-rose-400" />
            <span className="text-[10px] tracking-tight">Qidiruv</span>
          </button>

          {/* Profil / User Panel */}
          {user ? (
            <button
              type="button"
              onClick={() => setIsUserPanelOpen(true)}
              aria-label="Foydalanuvchi profilini ochish"
              className="flex flex-col items-center gap-0.5 py-1.5 px-3 rounded-xl cursor-pointer text-slate-300 hover:text-white active:scale-90 transition-all"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {user.photo_url ? (
                <img
                  src={user.photo_url}
                  alt={user.first_name || "Foydalanuvchi"}
                  className="w-5 h-5 rounded-full object-cover border border-rose-500 shadow-neon"
                />
              ) : (
                <div className="w-5 h-5 rounded-full bg-gradient-to-tr from-rose-600 to-rose-500 text-white flex items-center justify-center text-[10px] font-black shadow-neon">
                  {user.first_name?.[0] || "U"}
                </div>
              )}
              <span className="text-[10px] truncate max-w-[48px] tracking-tight font-medium">
                {user.first_name?.split(" ")[0]}
              </span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setIsUserPanelOpen(true)}
              aria-label="Foydalanuvchi profilini ochish yoki kirish"
              className="flex flex-col items-center gap-0.5 py-1.5 px-3 rounded-xl text-slate-400 hover:text-white font-medium active:scale-90 transition-all cursor-pointer"
            >
              <UserIcon className="w-4.5 h-4.5" />
              <span className="text-[10px] tracking-tight">Profil</span>
            </button>
          )}
        </nav>
      </div>

      <UserPanel
        isOpen={isUserPanelOpen}
        onClose={() => setIsUserPanelOpen(false)}
      />
    </>
  );
};
