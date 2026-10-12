"use client";

import React from "react";
import {
  Sparkles,
  Flame,
  Swords,
  Heart,
  Laugh,
  Compass,
  Zap,
  Ghost,
  Shield,
  Star,
  Film,
} from "lucide-react";

export interface GenreItem {
  id: string;
  name: string;
  icon: React.ElementType;
}

export const GENRES_LIST: GenreItem[] = [
  { id: "all", name: "Barchasi", icon: Sparkles },
  { id: "shounen", name: "Shounen", icon: Flame },
  { id: "action", name: "Jangari", icon: Swords },
  { id: "romance", name: "Romantika", icon: Heart },
  { id: "comedy", name: "Komediya", icon: Laugh },
  { id: "adventure", name: "Sarguzasht", icon: Compass },
  { id: "magic", name: "Sehr-jodu", icon: Zap },
  { id: "supernatural", name: "G'ayritabiiy", icon: Ghost },
  { id: "fantasy", name: "Fantaziya", icon: Star },
  { id: "drama", name: "Drama", icon: Film },
  { id: "sci-fi", name: "Ilmiy-fantastik", icon: Shield },
];

interface GenreChipsProps {
  selectedGenre: string;
  onSelectGenre: (id: string) => void;
}

export const GenreChips: React.FC<GenreChipsProps> = ({
  selectedGenre,
  onSelectGenre,
}) => {
  return (
    <div className="relative w-full py-1">
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar scroll-smooth py-1 px-0.5">
        {GENRES_LIST.map((item) => {
          const Icon = item.icon;
          const isSelected = selectedGenre === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onSelectGenre(item.id)}
              className={`group flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-xl text-xs font-bold transition-all duration-300 active:scale-95 whitespace-nowrap shrink-0 border ${
                isSelected
                  ? "bg-gradient-to-r from-rose-600 to-rose-500 text-white border-rose-400 shadow-[0_0_20px_rgba(225,29,72,0.4)] scale-105"
                  : "bg-[#101422]/90 text-slate-300 border-white/10 hover:border-rose-500/40 hover:bg-white/5 hover:text-white"
              }`}
              aria-label={`Janr: ${item.name}`}
            >
              <Icon
                className={`w-3.5 h-3.5 transition-transform duration-300 group-hover:scale-110 ${
                  isSelected ? "text-white fill-white/20" : "text-rose-400"
                }`}
              />
              <span>{item.name}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
