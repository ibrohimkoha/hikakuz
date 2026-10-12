"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Search,
  Dices,
  Sparkles,
  Film,
  Flame,
  Crown,
  Play,
  Shield,
  ShieldCheck,
  User as UserIcon,
  Heart,
  Settings,
  Send,
  Mic,
} from "lucide-react";
import { useAuth } from "@/context/auth-context";
import { useSearch } from "@/context/search-context";
import { UserPanel } from "@/components/user-panel";
import { Logo } from "@/components/logo";

interface NavbarProps {
  onOpenSearch?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenSearch }) => {
  const { user, setIsAuthModalOpen } = useAuth();
  const { openSearch } = useSearch();
  const handleOpenSearch = onOpenSearch || openSearch;

  const [isScrolled, setIsScrolled] = useState(false);
  const [isHeaderVisible, setIsHeaderVisible] = useState(true);
  const [isUserPanelOpen, setIsUserPanelOpen] = useState(false);

  useEffect(() => {
    let lastScrollY = window.scrollY;
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      setIsScrolled(currentScrollY > 20);

      // On mobile, hide when scrolling down, show when scrolling up
      if (currentScrollY > 70) {
        if (currentScrollY > lastScrollY + 8) {
          setIsHeaderVisible(false);
        } else if (currentScrollY < lastScrollY - 8) {
          setIsHeaderVisible(true);
        }
      } else {
        setIsHeaderVisible(true);
      }
      lastScrollY = currentScrollY;
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <>
      <header
        className={`fixed top-2 sm:top-3.5 left-0 right-0 z-40 px-2 sm:px-6 pointer-events-none transition-transform duration-300 ease-in-out ${
          isHeaderVisible ? "translate-y-0" : "-translate-y-24 md:translate-y-0"
        }`}
      >
        <div
          className={`max-w-6xl mx-auto rounded-2xl md:rounded-full pointer-events-auto px-3 sm:px-5 py-2 sm:py-2.5 flex items-center justify-between gap-2 sm:gap-4 transition-all duration-300 ${
            isScrolled
              ? "bg-[#080d1a]/95 backdrop-blur-2xl border border-rose-500/35 shadow-[0_12px_45px_rgba(0,0,0,0.85)] scale-[0.99]"
              : "bg-[#090e1c]/90 backdrop-blur-2xl border border-white/15 shadow-[0_10px_35px_rgba(0,0,0,0.6)]"
          }`}
        >
          {/* Brand Logo with Cyber-Anime Crest & Japanese Subtitle */}
          <Logo size="sm" className="shrink-0" />

          {/* Desktop Navigation Links (Minimalist Cyber) */}
          <nav className="hidden md:flex items-center gap-1 bg-[#12172a]/70 backdrop-blur-md border border-white/10 px-2.5 py-1 rounded-full shadow-inner">
            <Link
              href="/"
              className="text-xs font-bold text-slate-300 px-3 py-1.5 rounded-full hover:text-white hover:bg-white/10 transition-colors"
            >
              Bosh sahifa
            </Link>
            <Link
              href="/katalog?sort=popular"
              className="text-xs font-bold text-slate-300 px-3 py-1.5 rounded-full hover:text-white hover:bg-white/10 transition-colors flex items-center gap-1"
            >
              <Flame className="w-3.5 h-3.5 text-rose-500 fill-rose-500" /> Trend
            </Link>
            <Link
              href="/katalog"
              className="text-xs font-bold text-slate-300 px-3 py-1.5 rounded-full hover:text-white hover:bg-white/10 transition-colors flex items-center gap-1"
            >
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" /> Katalog
            </Link>
            <Link
              href="/fandubs"
              className="text-xs font-bold text-amber-300 px-3 py-1.5 rounded-full hover:text-white hover:bg-amber-500/20 transition-all flex items-center gap-1"
            >
              <Mic className="w-3.5 h-3.5 text-amber-400" /> Fandublar
            </Link>
            <a
              href="https://t.me/hikakuz"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-bold text-sky-400 px-3 py-1.5 rounded-full hover:text-white hover:bg-sky-500/20 transition-all flex items-center gap-1.5 group"
            >
              <Send className="w-3 h-3 text-sky-400 group-hover:scale-110 transition-transform" />
              <span>Telegram</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            </a>
          </nav>

          {/* Right Actions: Search, VIP, User Profile */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
            {/* Mobile Quick Search Button */}
            <button
              type="button"
              onClick={handleOpenSearch}
              aria-label="Anime qidiruv oynasini ochish"
              className="md:hidden flex items-center justify-center p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-rose-400 hover:text-white transition-all active:scale-95"
              title="Qidiruv"
            >
              <Search className="w-4 h-4 text-rose-400" />
            </button>

            {/* Desktop Quick Search Button */}
            <button
              type="button"
              onClick={handleOpenSearch}
              aria-label="Qidiruv oynasini ochish (Ctrl+K)"
              className="hidden md:flex items-center gap-2 bg-[#121626]/80 border border-white/10 hover:border-rose-500/50 text-slate-400 hover:text-white px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl text-xs transition-all shadow-inner group cursor-pointer"
            >
              <Search className="w-4 h-4 text-rose-500 group-hover:scale-110 transition-transform" />
              <span className="hidden lg:inline">Qidirish...</span>
              <kbd className="hidden lg:inline text-[9px] uppercase font-mono bg-white/10 text-slate-300 px-1.5 py-0.5 rounded border border-white/10">
                Ctrl+K
              </kbd>
            </button>

            {/* Admin Panel Quick Access for logged in Admins */}
            {user?.is_admin && (
              <Link
                href="/admin"
                aria-label="Admin panelga o'tish"
                className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl bg-gradient-to-r from-rose-600 to-amber-500 text-white hover:brightness-110 transition-all shadow-[0_0_15px_rgba(225,29,72,0.35)] text-[11px] sm:text-xs font-black shrink-0 border border-amber-400/40"
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Admin</span>
              </Link>
            )}

            {/* Homiylik (Server Maqsadi) Tugmasi */}
            <Link
              href="/homiylik"
              aria-label="Platformani qo'llab-quvvatlash (Homiylik)"
              className="hidden md:flex items-center gap-1.5 px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-xl bg-gradient-to-r from-rose-500/15 via-pink-500/15 to-rose-500/15 border border-rose-500/35 text-rose-300 hover:text-white hover:bg-rose-500/25 transition-all shadow-[0_0_12px_rgba(244,63,94,0.15)] text-[11px] sm:text-xs font-black shrink-0"
              title="Loyiha Serverini Qo'llab-quvvatlash"
            >
              <Heart className="w-3.5 h-3.5 text-rose-400 fill-rose-400 shrink-0" />
              <span>Homiylik</span>
            </Link>

            {/* User Profile / Dashboard Slide-over Trigger */}
            {user ? (
              <button
                type="button"
                onClick={() => setIsUserPanelOpen(true)}
                aria-label="Foydalanuvchi profilini ochish"
                className="flex items-center gap-2 p-1.5 sm:px-3 sm:py-1.5 rounded-xl bg-white/5 border border-white/10 hover:border-rose-500/50 hover:bg-white/10 transition-all group active:scale-95 shrink-0 cursor-pointer"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {user.photo_url ? (
                  <img
                    src={user.photo_url}
                    alt={user.first_name || "Foydalanuvchi"}
                    className="w-7 h-7 rounded-lg object-cover border border-rose-500/40 group-hover:border-rose-500 transition-colors"
                  />
                ) : (
                  <div className="w-7 h-7 rounded-lg bg-rose-600/20 text-rose-500 flex items-center justify-center text-xs font-bold border border-rose-500/30">
                    {user.first_name?.[0] || "U"}
                  </div>
                )}
                <span className="text-xs font-bold text-white max-w-[90px] truncate hidden sm:inline">
                  {user.first_name}
                </span>
                {user.is_vip && (
                  <Crown className="w-3 h-3 text-amber-400 fill-amber-400 hidden sm:inline" />
                )}
              </button>
            ) : (
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsUserPanelOpen(true)}
                  aria-label="Sozlamalar va ko'rish tarixini ochish"
                  className="hidden sm:flex p-2 rounded-xl bg-white/5 border border-white/10 text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                  title="Sozlamalar va Tarix"
                >
                  <Settings className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setIsAuthModalOpen(true)}
                  aria-label="Tizimga kirish"
                  className="flex items-center gap-1.5 px-3 sm:px-3.5 py-1.5 sm:py-2 rounded-xl bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-600 text-white font-black text-xs shadow-neon transition-all active:scale-95 shrink-0 cursor-pointer"
                >
                  <UserIcon className="w-3.5 h-3.5" />
                  <span>Kirish</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Global User Panel Drawer */}
      <UserPanel
        isOpen={isUserPanelOpen}
        onClose={() => setIsUserPanelOpen(false)}
      />
    </>
  );
};
