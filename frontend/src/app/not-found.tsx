import Link from "next/link";
import { Home, Compass } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center text-center px-4">
      <div className="relative mb-6">
        <div className="w-24 h-24 rounded-3xl bg-gradient-to-tr from-purple-600/20 via-indigo-600/20 to-cyan-500/20 border border-purple-500/30 flex items-center justify-center shadow-[0_0_40px_rgba(168,85,247,0.25)]">
          <Compass className="w-12 h-12 text-cyan-400 animate-spin" style={{ animationDuration: "12s" }} />
        </div>
        <span className="absolute -bottom-2 -right-2 px-2.5 py-0.5 rounded-full bg-rose-500/20 border border-rose-500/40 text-[10px] font-black text-rose-400 tracking-wider">
          404 ERROR
        </span>
      </div>

      <h1 className="text-3xl sm:text-4xl font-black text-white mb-2 tracking-tight">
        Sahifa Topilmadi
      </h1>
      <p className="text-slate-400 text-xs sm:text-sm max-w-md mb-8 leading-relaxed">
        Siz qidirayotgan sahifa mavjud emas, nomi o&apos;zgartirilgan yoki unga kirish uchun ruxsat berilmagan.
      </p>

      <Link
        href="/"
        className="px-6 py-3 rounded-2xl bg-gradient-to-r from-purple-600 via-indigo-600 to-cyan-500 text-white font-bold text-xs shadow-[0_0_25px_rgba(0,240,255,0.3)] hover:scale-105 transition-all inline-flex items-center gap-2"
      >
        <Home className="w-4 h-4" /> Bosh sahifaga qaytish
      </Link>
    </div>
  );
}
