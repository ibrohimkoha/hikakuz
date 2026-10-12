"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";

interface LogoProps {
  size?: "sm" | "md" | "lg";
  withText?: boolean;
  withSubtitle?: boolean;
  className?: string;
  href?: string;
}

export const Logo: React.FC<LogoProps> = ({
  size = "md",
  withText = true,
  withSubtitle = true,
  className = "",
  href = "/",
}) => {
  const sizeMap = {
    sm: {
      img: 32,
      imgClass: "w-8 h-8",
      titleClass: "text-base tracking-wider",
      badgeClass: "text-[8px] px-1 py-0.2",
    },
    md: {
      img: 40,
      imgClass: "w-9 h-9 sm:w-10 sm:h-10",
      titleClass: "text-lg sm:text-xl tracking-wider",
      badgeClass: "text-[9px] px-1.5 py-0.5",
    },
    lg: {
      img: 56,
      imgClass: "w-12 h-12 sm:w-14 sm:h-14",
      titleClass: "text-2xl sm:text-3xl tracking-wider",
      badgeClass: "text-[10px] px-2 py-0.5",
    },
  };

  const s = sizeMap[size];

  const content = (
    <div className={`flex items-center gap-2.5 group select-none ${className}`}>
      {/* Cyber Katana Crest Icon */}
      <div className={`relative ${s.imgClass} rounded-2xl overflow-hidden shrink-0 p-0.5 bg-gradient-to-tr from-rose-600 via-purple-600 to-amber-400 shadow-[0_0_20px_rgba(225,29,72,0.35)] group-hover:shadow-[0_0_28px_rgba(244,63,94,0.6)] transition-all duration-300 group-hover:scale-105`}>
        <div className="w-full h-full rounded-[14px] overflow-hidden bg-[#060911] flex items-center justify-center relative">
          <Image
            src="/hikaku-crest.jpg"
            alt="Hikaku Anime Logo"
            width={s.img}
            height={s.img}
            className="w-full h-full object-cover object-center transform group-hover:scale-110 transition-transform duration-300"
            priority
          />
          {/* Subtle Cyber Glow Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-white/10 pointer-events-none" />
        </div>
      </div>

      {/* Typography */}
      {withText && (
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5 leading-none">
            <span className={`font-black ${s.titleClass} bg-gradient-to-r from-white via-slate-100 to-rose-300 bg-clip-text text-transparent group-hover:from-rose-400 group-hover:to-white transition-all`}>
              HIKAKU
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.8)] animate-pulse" />
          </div>

          {withSubtitle && (
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className={`font-bold tracking-widest text-rose-400/90 bg-rose-500/15 border border-rose-500/30 rounded ${s.badgeClass}`}>
                ヒカク
              </span>
              <span className="text-[9px] font-black tracking-widest uppercase text-slate-400 group-hover:text-slate-200 transition-colors">
                ANIME
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="inline-flex shrink-0">
        {content}
      </Link>
    );
  }

  return content;
};
