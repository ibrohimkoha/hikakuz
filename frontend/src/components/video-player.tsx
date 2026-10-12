"use client";

import React, { useEffect, useRef, useState } from "react";
import videojs from "video.js";
import "video.js/dist/video-js.css";
import {
  RotateCcw,
  RotateCw,
  AlertCircle,
  RefreshCw,
  Server,
  Check,
  X,
  SlidersHorizontal,
  Gauge,
} from "lucide-react";

// Register custom Video.js Settings Button (Gear Cog)
const VjsButton = (videojs as any).getComponent("Button");
if (VjsButton && !(videojs as any).getComponent("SettingsButton")) {
  class SettingsButton extends VjsButton {
    constructor(player: any, options: any) {
      super(player, options);
      this.controlText("Sozlamalar");
      this.addClass("vjs-settings-button");
    }
    buildCSSClass() {
      return "vjs-settings-button " + super.buildCSSClass();
    }
    handleClick(e: any) {
      e.stopPropagation();
      this.player().trigger("toggle-settings");
    }
  }
  (videojs as any).registerComponent("SettingsButton", SettingsButton);
}

interface VideoPlayerProps {
  src: string;
  poster?: string;
  comments?: any[];
  initialTime?: number;
  onEnded?: () => void;
  onTimeUpdate?: (currentTime: number, duration: number) => void;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({
  src,
  poster,
  comments = [],
  initialTime,
  onEnded,
  onTimeUpdate,
}) => {
  const videoRef = useRef<HTMLDivElement | null>(null);
  const playerRef = useRef<any>(null);
  const [lightsOff, setLightsOff] = useState(false);
  const [tapFeedback, setTapFeedback] = useState<{ side: "left" | "right"; text: string } | null>(null);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [activeSrc, setActiveSrc] = useState(src);
  const [isRetrying, setIsRetrying] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settingsTab, setSettingsTab] = useState<"quality" | "speed">("quality");
  const [currentQuality, setCurrentQuality] = useState("Auto");
  const [currentSpeed, setCurrentSpeed] = useState(1);

  const handleQualitySelect = (val: string) => {
    setCurrentQuality(val);
    try {
      localStorage.setItem("anivorm_pref_quality", val);
      if (playerRef.current) {
        const ql = playerRef.current.qualityLevels?.();
        if (ql && ql.length > 0) {
          for (let i = 0; i < ql.length; i++) {
            if (val === "Auto") {
              ql[i].enabled = true;
            } else {
              const h = parseInt(val);
              ql[i].enabled = ql[i].height === h;
            }
          }
        }
      }
    } catch {}
    setTapFeedback({ side: "right", text: `🎬 Sifat: ${val}` });
    setTimeout(() => setTapFeedback(null), 1500);
    setIsSettingsOpen(false);
  };

  const handleSpeedSelect = (speed: number) => {
    setCurrentSpeed(speed);
    if (playerRef.current) {
      playerRef.current.playbackRate(speed);
    }
    setTapFeedback({ side: "right", text: `⚡ Tezlik: ${speed}x` });
    setTimeout(() => setTapFeedback(null), 1500);
    setIsSettingsOpen(false);
  };

  useEffect(() => {
    setActiveSrc(src);
    setHasError(false);
    setErrorMessage("");
  }, [src]);

  useEffect(() => {
    if (!videoRef.current) return;
    setHasError(false);
    setErrorMessage("");
    setIsRetrying(false);

    const isHLS = activeSrc.includes(".m3u8") || activeSrc.includes("/hls/") || activeSrc.includes("/stream/episode");

    const videoElement = document.createElement("video-js");
    videoElement.classList.add("vjs-big-play-centered", "vjs-theme-anivorm");
    // Anti-Download & CORS Protection
    videoElement.setAttribute("controlsList", "nodownload");
    videoElement.setAttribute("disablePictureInPicture", "true");
    videoElement.setAttribute("crossorigin", "anonymous");
    videoElement.setAttribute("oncontextmenu", "return false;");
    videoElement.setAttribute("playsinline", "true");
    videoElement.setAttribute("webkit-playsinline", "true");

    videoRef.current.innerHTML = "";
    videoRef.current.appendChild(videoElement);

    const playerOptions: any = {
      autoplay: false,
      controls: true,
      responsive: true,
      fluid: true,
      poster: poster,
      preload: "auto",
      playbackRates: [0.5, 0.75, 1, 1.25, 1.5, 2],
      liveui: false,
      controlBar: {
        playToggle: true,
        volumePanel: { inline: true },
        currentTimeDisplay: true,
        timeDivider: false,
        durationDisplay: false,
        remainingTimeDisplay: true,
        progressControl: true,
        playbackRateMenuButton: false,
        fullscreenToggle: true,
        pictureInPictureToggle: false,
        liveDisplay: false,
        seekToLive: false,
        chaptersButton: false,
        descriptionsButton: false,
        subsCapsButton: false,
        audioTrackButton: false,
        customControlSpacer: false,
      },
      sources: [
        {
          src: activeSrc,
          type: isHLS ? "application/x-mpegURL" : "video/mp4",
        },
      ],
      errorDisplay: false,
      userActions: {
        hotkeys: true,
      },
    };

    if (isHLS) {
      playerOptions.html5 = {
        vhs: {
          overrideNative: true,
          limitRenditionByPlayerDimensions: false,
          maxGoalBufferLength: 60,
          goalBufferLength: 30,
          bufferWater: 10,
          handlePartialData: true,
          experimentalBufferClipping: true,
          smoothQualityChange: true,
          fastQualityChange: true,
          enableLowInitialPlaylist: true,
          bandwidth: 5000000,
        },
      };
    }

    const player = (playerRef.current = videojs(videoElement, playerOptions));

    const controlBar = player.getChild("controlBar") as any;
    if (controlBar) {
      const fsIdx = controlBar.children().findIndex((c: any) => c.name() === "FullscreenToggle");
      const insertIdx = fsIdx >= 0 ? fsIdx : controlBar.children().length;
      if (!controlBar.getChild("SettingsButton")) {
        controlBar.addChild("SettingsButton", {}, insertIdx);
      }
    }

    player.on("toggle-settings", () => {
      setIsSettingsOpen((prev) => !prev);
    });

    player.on("play", () => {
      setIsSettingsOpen(false);
    });

    player.one("canplay", () => {
      const duration = player.duration() || 0;
      if (initialTime && initialTime > 0) {
        player.currentTime(initialTime);
      } else {
        const savedTime = localStorage.getItem(`anivorm_pos_${src}`);
        if (savedTime) {
          const t = parseFloat(savedTime);
          if (t > 5 && (duration === 0 || t < duration - 10)) {
            player.currentTime(t);
          }
        }
      }
    });

    player.on("error", () => {
      const err = player.error();
      if (err && (err.code === 3 || err.code === 4)) {
        const curTime = player.currentTime() || 0;
        if (curTime > 2) {
          player.error(null);
          player.currentTime(curTime + 1.5);
          const playPromise = player.play();
          if (playPromise !== undefined && typeof playPromise?.catch === "function") {
            playPromise.catch(() => {});
          }
          return;
        }
      }
      setHasError(true);
      setErrorMessage("Ushbu qism videosi hali Backblaze B2 saqlagichiga yuklanmagan yoki tarmoq xatosi yuz berdi.");
    });

    player.on("timeupdate", () => {
      const cur = player.currentTime() || 0;
      const dur = player.duration() || 0;
      if (cur > 0) {
        localStorage.setItem(`anivorm_pos_${src}`, cur.toString());
        onTimeUpdate?.(cur, dur);
      }
    });

    if (onEnded) {
      player.on("ended", onEnded);
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (["INPUT", "TEXTAREA"].includes((e.target as HTMLElement)?.tagName)) return;

      const currentTime = player.currentTime() || 0;

      if (e.code === "Space") {
        e.preventDefault();
        player.paused() ? player.play() : player.pause();
      } else if (e.code === "KeyF") {
        e.preventDefault();
        player.isFullscreen() ? player.exitFullscreen() : player.requestFullscreen();
      } else if (e.code === "KeyM") {
        e.preventDefault();
        player.muted(!player.muted());
      } else if (e.code === "ArrowLeft" || e.code === "KeyJ") {
        e.preventDefault();
        player.currentTime(Math.max(0, currentTime - 10));
      } else if (e.code === "ArrowRight" || e.code === "KeyL") {
        e.preventDefault();
        player.currentTime(currentTime + 10);
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      if (player && !player.isDisposed()) {
        player.dispose();
        playerRef.current = null;
      }
    };
  }, [activeSrc, poster, onEnded, onTimeUpdate, initialTime, src]);

  const handleRetry = () => {
    setIsRetrying(true);
    setHasError(false);
    const sep = src.includes("?") ? "&" : "?";
    setActiveSrc(`${src}${sep}retry=${Date.now()}`);
  };

  const handleProxyFallback = () => {
    setIsRetrying(true);
    setHasError(false);
    const sep = src.includes("?") ? "&" : "?";
    setActiveSrc(`${src}${sep}proxy=1&t=${Date.now()}`);
  };

  const handleSeek = (delta: number) => {
    if (playerRef.current) {
      const cur = playerRef.current.currentTime() || 0;
      const target = Math.max(0, cur + delta);
      playerRef.current.currentTime(target);

      setTapFeedback({
        side: delta < 0 ? "left" : "right",
        text: `${delta > 0 ? "+" : ""}${delta}s`,
      });
      setTimeout(() => setTapFeedback(null), 700);
    }
  };

  return (
    <>
      {lightsOff && (
        <div
          onClick={() => setLightsOff(false)}
          className="fixed inset-0 bg-black/95 z-40 backdrop-blur-xl transition-all"
        />
      )}

      <div
        onContextMenu={(e) => e.preventDefault()}
        className={`relative select-none rounded-2xl overflow-hidden border border-white/10 shadow-2xl bg-black ${
          lightsOff ? "z-50 ring-4 ring-accent-rose/60" : ""
        }`}
      >
        <div data-vjs-player className="relative overflow-hidden select-none" onContextMenu={(e) => e.preventDefault()}>
          <div ref={videoRef} onContextMenu={(e) => e.preventDefault()} />

          {/* Video Error Overlay with Recovery Actions */}
          {hasError && (
            <div className="absolute inset-0 z-35 flex flex-col items-center justify-center p-6 text-center bg-[#070a14]/95 backdrop-blur-md space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center shadow-[0_0_20px_rgba(244,63,94,0.3)]">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm sm:text-base font-bold text-white">Video Yuklanmadi</h4>
                <p className="text-xs text-slate-400 max-w-sm">
                  {errorMessage || "Ushbu qism videosi hali Backblaze B2 xotirasiga yuklanmagan yoki tarmoqda uzilish bo'ldi."}
                </p>
              </div>

              {/* Recovery Action Buttons */}
              <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                <button
                  onClick={handleRetry}
                  disabled={isRetrying}
                  className="px-3.5 py-2 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 text-xs font-bold transition-all flex items-center gap-1.5 shadow-lg active:scale-95 cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isRetrying ? "animate-spin" : ""}`} />
                  Qaytadan yuklash
                </button>
                <button
                  onClick={handleProxyFallback}
                  disabled={isRetrying}
                  className="px-3.5 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-bold transition-all flex items-center gap-1.5 shadow-lg active:scale-95 cursor-pointer"
                >
                  <Server className="w-3.5 h-3.5" />
                  ⚡ Muqobil server
                </button>
              </div>
            </div>
          )}

          {/* Quick Tap Visual Feedback */}
          {tapFeedback && (
            <div
              className={`absolute top-1/2 -translate-y-1/2 pointer-events-none z-30 px-4 py-2 rounded-2xl bg-black/80 backdrop-blur-md text-white font-black text-sm sm:text-base flex items-center gap-1.5 shadow-2xl border border-white/20 animate-pulse ${
                tapFeedback.side === "left" ? "left-8 sm:left-16" : "right-8 sm:right-16"
              }`}
            >
              {tapFeedback.side === "left" ? <RotateCcw size={18} className="text-accent-rose" /> : <RotateCw size={18} className="text-accent-rose" />}
              <span>{tapFeedback.text}</span>
            </div>
          )}

          {/* Settings Floating Glass Popup (Quality & Speed) */}
          {isSettingsOpen && (
            <div
              className="absolute bottom-16 sm:bottom-20 right-3 sm:right-6 z-40 w-64 rounded-2xl bg-[#0f172a]/95 backdrop-blur-2xl border border-white/15 shadow-2xl p-3 text-white transition-all animate-in fade-in zoom-in-95 duration-150 select-none"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Tab Switcher */}
              <div className="flex items-center gap-1 bg-white/10 p-1 rounded-xl mb-3">
                <button
                  type="button"
                  onClick={() => setSettingsTab("quality")}
                  className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    settingsTab === "quality"
                      ? "bg-white text-black shadow-md"
                      : "text-slate-300 hover:text-white"
                  }`}
                >
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                  Sifat
                </button>
                <button
                  type="button"
                  onClick={() => setSettingsTab("speed")}
                  className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    settingsTab === "speed"
                      ? "bg-white text-black shadow-md"
                      : "text-slate-300 hover:text-white"
                  }`}
                >
                  <Gauge className="w-3.5 h-3.5" />
                  Tezlik
                </button>
                <button
                  type="button"
                  onClick={() => setIsSettingsOpen(false)}
                  className="w-7 h-7 rounded-lg hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-all cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Sifat (Quality) Options */}
              {settingsTab === "quality" && (
                <div className="space-y-1">
                  {[
                    { label: "Avto", desc: "Tavsiya etiladi", val: "Auto" },
                    { label: "1080p", desc: "Full HD", val: "1080p" },
                    { label: "720p", desc: "HD", val: "720p" },
                    { label: "480p", desc: "Standart", val: "480p" },
                    { label: "360p", desc: "Tejamkor", val: "360p" },
                  ].map((q) => (
                    <button
                      key={q.val}
                      type="button"
                      onClick={() => handleQualitySelect(q.val)}
                      className={`w-full px-3 py-2 rounded-xl flex items-center justify-between text-xs font-semibold transition-all cursor-pointer ${
                        currentQuality === q.val
                          ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                          : "hover:bg-white/10 text-slate-200"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span>{q.label}</span>
                        <span className="text-[10px] text-slate-400 font-normal">({q.desc})</span>
                      </div>
                      {currentQuality === q.val && <Check className="w-3.5 h-3.5 text-amber-400" />}
                    </button>
                  ))}
                </div>
              )}

              {/* Tezlik (Speed) Options */}
              {settingsTab === "speed" && (
                <div className="space-y-1">
                  {[
                    { label: "0.5x", val: 0.5 },
                    { label: "0.75x", val: 0.75 },
                    { label: "1x (Standart)", val: 1 },
                    { label: "1.25x", val: 1.25 },
                    { label: "1.5x", val: 1.5 },
                    { label: "2x", val: 2 },
                  ].map((s) => (
                    <button
                      key={s.val}
                      type="button"
                      onClick={() => handleSpeedSelect(s.val)}
                      className={`w-full px-3 py-2 rounded-xl flex items-center justify-between text-xs font-semibold transition-all cursor-pointer ${
                        currentSpeed === s.val
                          ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                          : "hover:bg-white/10 text-slate-200"
                      }`}
                    >
                      <span>{s.label}</span>
                      {currentSpeed === s.val && <Check className="w-3.5 h-3.5 text-amber-400" />}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
};
