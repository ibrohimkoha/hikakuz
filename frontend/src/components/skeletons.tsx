"use client";

import React from "react";

// 1. Single Anime Card Skeleton (3:4 aspect ratio)
export const SkeletonCard: React.FC = () => {
  return (
    <div className="flex flex-col rounded-2xl bg-[#0c101c] border border-white/5 overflow-hidden select-none">
      {/* Poster shimmer */}
      <div className="relative aspect-[3/4] w-full skeleton-shimmer bg-white/[0.03]">
        {/* Top Badges placeholder */}
        <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between">
          <div className="w-12 h-5 rounded-lg skeleton-shimmer bg-white/10" />
          <div className="w-7 h-7 rounded-xl skeleton-shimmer bg-white/10" />
        </div>
        {/* Bottom Episode count tag */}
        <div className="absolute bottom-2.5 left-2.5">
          <div className="w-16 h-5 rounded-md skeleton-shimmer bg-white/10" />
        </div>
      </div>

      {/* Info Content placeholder */}
      <div className="flex flex-col p-3 space-y-2">
        <div className="w-4/5 h-3.5 rounded skeleton-shimmer bg-white/10" />
        <div className="w-1/2 h-2.5 rounded skeleton-shimmer bg-white/5" />
        <div className="flex items-center gap-1.5 pt-1">
          <div className="w-12 h-4 rounded skeleton-shimmer bg-white/5" />
          <div className="w-14 h-4 rounded skeleton-shimmer bg-white/5" />
        </div>
      </div>
    </div>
  );
};

// 2. Carousel Section Skeleton (Header + Row of Cards)
export const SkeletonCarousel: React.FC<{ titleWidth?: string }> = ({
  titleWidth = "w-44",
}) => {
  return (
    <section className="space-y-4 my-8">
      {/* Section Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl skeleton-shimmer bg-white/10" />
          <div className="space-y-1.5">
            <div className={`h-5 rounded-lg skeleton-shimmer bg-white/10 ${titleWidth}`} />
            <div className="w-32 h-3 rounded skeleton-shimmer bg-white/5" />
          </div>
        </div>
        <div className="w-16 h-4 rounded skeleton-shimmer bg-white/5" />
      </div>

      {/* Responsive Cards Row */}
      <div className="grid grid-cols-2 xs:grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className={i >= 2 ? "hidden sm:block" : ""}
          >
            <SkeletonCard />
          </div>
        ))}
      </div>
    </section>
  );
};

// 3. Hero Carousel Cinematic Spotlight Skeleton
export const SkeletonHero: React.FC = () => {
  return (
    <div className="relative overflow-hidden rounded-3xl bg-[#0b0e1b] border border-white/10 shadow-2xl h-[58vh] min-h-[420px] max-h-[560px] p-6 sm:p-10 flex flex-col justify-end">
      {/* Background ambient shimmer */}
      <div className="absolute inset-0 skeleton-shimmer bg-white/[0.02]" />

      {/* Hero content placeholder */}
      <div className="relative z-10 max-w-2xl space-y-4">
        {/* Pills & badges */}
        <div className="flex items-center gap-2">
          <div className="w-20 h-6 rounded-full skeleton-shimmer bg-white/10" />
          <div className="w-14 h-6 rounded-full skeleton-shimmer bg-white/10" />
          <div className="w-24 h-6 rounded-full skeleton-shimmer bg-white/5 hidden sm:block" />
        </div>

        {/* Title */}
        <div className="space-y-2">
          <div className="w-3/4 h-8 sm:h-11 rounded-2xl skeleton-shimmer bg-white/15" />
          <div className="w-1/2 h-5 rounded-xl skeleton-shimmer bg-white/10" />
        </div>

        {/* Synopsis lines */}
        <div className="space-y-1.5 pt-1 hidden sm:block">
          <div className="w-full h-3 rounded skeleton-shimmer bg-white/5" />
          <div className="w-5/6 h-3 rounded skeleton-shimmer bg-white/5" />
          <div className="w-2/3 h-3 rounded skeleton-shimmer bg-white/5" />
        </div>

        {/* Buttons */}
        <div className="flex items-center gap-3 pt-2">
          <div className="w-36 h-11 rounded-xl skeleton-shimmer bg-rose-600/30" />
          <div className="w-28 h-11 rounded-xl skeleton-shimmer bg-white/10" />
        </div>
      </div>
    </div>
  );
};

// 4. Watch Page Skeleton (Player + Episode List + Details)
export const SkeletonWatch: React.FC = () => {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Back button placeholder */}
      <div className="w-28 h-7 rounded-xl skeleton-shimmer bg-white/5" />

      {/* Main Grid: Player + Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Video Player Column */}
        <div className="lg:col-span-2 space-y-4">
          {/* 16:9 Aspect Video Box */}
          <div className="relative aspect-video w-full rounded-3xl overflow-hidden bg-black border border-white/10 skeleton-shimmer flex items-center justify-center">
            <div className="w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center" />
          </div>

          {/* Player controls / title info under player */}
          <div className="p-4 sm:p-5 rounded-2xl bg-white/5 border border-white/10 space-y-3">
            <div className="flex items-center justify-between">
              <div className="w-2/3 h-6 rounded-lg skeleton-shimmer bg-white/10" />
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl skeleton-shimmer bg-white/10" />
                <div className="w-9 h-9 rounded-xl skeleton-shimmer bg-white/10" />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-16 h-5 rounded-md skeleton-shimmer bg-white/5" />
              <div className="w-20 h-5 rounded-md skeleton-shimmer bg-white/5" />
              <div className="w-24 h-5 rounded-md skeleton-shimmer bg-white/5" />
            </div>
          </div>
        </div>

        {/* Episodes Sidebar Column */}
        <div className="space-y-4">
          <div className="p-4 sm:p-5 rounded-3xl bg-[#0c101c] border border-white/10 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <div className="w-24 h-5 rounded skeleton-shimmer bg-white/10" />
              <div className="w-14 h-4 rounded skeleton-shimmer bg-white/5" />
            </div>

            {/* Grid of episode buttons */}
            <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-4 gap-2">
              {Array.from({ length: 12 }).map((_, i) => (
                <div
                  key={i}
                  className="h-10 rounded-xl skeleton-shimmer bg-white/5 border border-white/5"
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// 5. Search Modal Results Skeleton
export const SkeletonSearch: React.FC = () => {
  return (
    <div className="space-y-2 p-2">
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-3 p-2.5 rounded-2xl bg-white/5 border border-white/5"
        >
          <div className="w-10 h-14 rounded-xl skeleton-shimmer bg-white/10 shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="w-3/5 h-3.5 rounded skeleton-shimmer bg-white/10" />
            <div className="w-2/5 h-2.5 rounded skeleton-shimmer bg-white/5" />
          </div>
        </div>
      ))}
    </div>
  );
};
