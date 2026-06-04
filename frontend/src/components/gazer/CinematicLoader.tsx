"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";

interface CinematicLoaderProps {
  status: string;
  targetPhotoUrl: string;
  scanProgress: number;
  targetId: string;
  targetName: string;
  logs: string[];
}

interface LoaderLogEntry {
  id: string;
  timestamp: string;
  text: string;
  state: "COMPLETED" | "ACTIVE" | "PENDING";
}

interface ScanBeat {
  focusLabel: string;
  focusCode: string;
  lockX: string;
  lockY: string;
  imageScale: number;
  imageX: string;
  imageY: string;
  blur: number;
  duration: number;
}

const SCAN_BEATS: ScanBeat[] = [
  {
    focusLabel: "OPTIC_GLS // PASSIVE SEARCH",
    focusCode: "LOC_X: 31 // LOC_Y: 29 // MAG: 1.08X",
    lockX: "34%",
    lockY: "31%",
    imageScale: 1.06,
    imageX: "0%",
    imageY: "0%",
    blur: 1.2,
    duration: 720,
  },
  {
    focusLabel: "OPTIC_GLS // MICROSCOPE LOCK",
    focusCode: "LOC_X: 31 // LOC_Y: 29 // MAG: 3.40X",
    lockX: "34%",
    lockY: "31%",
    imageScale: 3.42,
    imageX: "13%",
    imageY: "16%",
    blur: 0.18,
    duration: 1080,
  },
  {
    focusLabel: "FIELD RESET // CALIBRATION",
    focusCode: "ZEROING PARALLAX // MAG: 1.00X",
    lockX: "34%",
    lockY: "31%",
    imageScale: 1.02,
    imageX: "0%",
    imageY: "0%",
    blur: 1.6,
    duration: 660,
  },
  {
    focusLabel: "MANDIBLE // EDGE TRACE",
    focusCode: "LOC_X: 52 // LOC_Y: 58 // MAG: 1.12X",
    lockX: "52%",
    lockY: "58%",
    imageScale: 1.08,
    imageX: "0%",
    imageY: "0%",
    blur: 1.1,
    duration: 700,
  },
  {
    focusLabel: "MANDIBLE // MICRO-ETCH",
    focusCode: "LOC_X: 52 // LOC_Y: 58 // MAG: 4.10X",
    lockX: "52%",
    lockY: "58%",
    imageScale: 3.9,
    imageX: "-1%",
    imageY: "-24%",
    blur: 0.1,
    duration: 1040,
  },
  {
    focusLabel: "FIELD RESET // CALIBRATION",
    focusCode: "ZEROING PARALLAX // MAG: 1.00X",
    lockX: "52%",
    lockY: "58%",
    imageScale: 1.04,
    imageX: "0%",
    imageY: "0%",
    blur: 1.35,
    duration: 620,
  },
  {
    focusLabel: "TEMPORAL LATTICE // ENTRY",
    focusCode: "LOC_X: 65 // LOC_Y: 38 // MAG: 1.10X",
    lockX: "65%",
    lockY: "38%",
    imageScale: 1.06,
    imageX: "0%",
    imageY: "0%",
    blur: 1.15,
    duration: 700,
  },
  {
    focusLabel: "TEMPORAL LATTICE // MICRO-ETCH",
    focusCode: "LOC_X: 65 // LOC_Y: 38 // MAG: 3.85X",
    lockX: "65%",
    lockY: "38%",
    imageScale: 3.72,
    imageX: "-18%",
    imageY: "9%",
    blur: 0.12,
    duration: 1020,
  },
  {
    focusLabel: "FIELD RESET // CALIBRATION",
    focusCode: "ZEROING PARALLAX // MAG: 1.00X",
    lockX: "65%",
    lockY: "38%",
    imageScale: 1.03,
    imageX: "0%",
    imageY: "0%",
    blur: 1.5,
    duration: 640,
  },
];

function formatLoaderLogs(logs: string[]) {
  const latest = logs.slice(-6);
  return latest.map((entry, index) => {
    const match = entry.match(/^\[(.*?)\]\s*(.*)$/);
    const state =
      index === latest.length - 1
        ? "PENDING"
        : index === latest.length - 2
          ? "ACTIVE"
          : "COMPLETED";

    return {
      id: `${index}-${entry}`,
      timestamp: match?.[1] ?? "--:--:--",
      text: match?.[2] ?? entry,
      state,
    } satisfies LoaderLogEntry;
  });
}

export default function CinematicLoader({
  status,
  targetPhotoUrl,
  scanProgress,
  targetId,
  targetName,
  logs,
}: CinematicLoaderProps) {
  const [sessionId, setSessionId] = useState("TG-0000");
  const [decodedText, setDecodedText] = useState(targetId);
  const [beatIndex, setBeatIndex] = useState(0);
  const [pulseTick, setPulseTick] = useState(0);
  const [negativeFlash, setNegativeFlash] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  const logEntries = useMemo(() => formatLoaderLogs(logs), [logs]);
  const progressRatio = Math.min(Math.max(scanProgress || 0.05, 0.05), 1);
  const isResolving = progressRatio >= 0.86;
  const activeBeat = isResolving
    ? {
        focusLabel: "IDENTITY VECTOR // LOCKED",
        focusCode: "MAG: 1.00X // STABLE_RESTING_RAW",
        lockX: "50%",
        lockY: "50%",
        imageScale: 1.08,
        imageX: "0%",
        imageY: "0%",
        blur: 0,
        duration: 1200,
      }
    : SCAN_BEATS[beatIndex];

  useEffect(() => {
    setSessionId(`TG-${Math.floor(1000 + Math.random() * 9000)}`);
  }, []);

  useEffect(() => {
    if (isResolving) {
      setDecodedText(targetId);
      return;
    }

    const chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ#@$%&*?+/={}[]";
    const interval = window.setInterval(() => {
      const nextValue = targetId
        .split("")
        .map((character) =>
          Math.random() < 0.18
            ? character
            : chars[Math.floor(Math.random() * chars.length)],
        )
        .join("");
      setDecodedText(nextValue);
    }, 45);

    return () => window.clearInterval(interval);
  }, [isResolving, targetId]);

  useEffect(() => {
    if (isResolving) {
      setBeatIndex(0);
      setNegativeFlash(false);
      return;
    }

    const timer = window.setTimeout(() => {
      setBeatIndex((current) => (current + 1) % SCAN_BEATS.length);
      if (Math.random() < 0.38) {
        setNegativeFlash(true);
        window.setTimeout(() => setNegativeFlash(false), 300);
      } else {
        setNegativeFlash(false);
      }
    }, activeBeat.duration);

    return () => window.clearTimeout(timer);
  }, [activeBeat.duration, isResolving]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setPulseTick((current) => current + 1);
    }, 800);

    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
    }
  }, [logEntries]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="fixed inset-0 z-[140] overflow-hidden bg-[#060503] px-4 py-5 text-[#F5F0E8] sm:px-6 sm:py-6 lg:px-10 lg:py-8"
    >
      <div className="loader-noise absolute inset-0 opacity-50" />
      <div className="scan-screen-hum absolute inset-0 opacity-40" />
      <div className="ambient-glow-alpha opacity-70" />
      <div className="ambient-glow-beta opacity-60" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_18%,rgba(200,134,10,0.12),transparent_38%)]" />

      <motion.div
        animate={{ top: ["0%", "100%"] }}
        transition={{ duration: 7.4, ease: "linear", repeat: Infinity }}
        className="pointer-events-none absolute left-0 right-0 z-20 h-px bg-[#C8860A] opacity-80 shadow-[0_0_12px_rgba(200,134,10,0.7)]"
      />
      <motion.div
        animate={{ y: ["-100%", "100%"] }}
        transition={{ duration: 7.4, ease: "linear", repeat: Infinity }}
        className="pointer-events-none absolute left-0 right-0 z-10 h-40 bg-gradient-to-b from-transparent via-[#C8860A]/8 to-transparent"
      />

      <div className="relative z-10 mx-auto flex h-full max-w-7xl flex-col">
        <header className="flex flex-col gap-2 border-b border-[rgba(245,240,232,0.08)] pb-3 text-[9px] uppercase tracking-[0.24em] text-[#F5F0E8]/40 sm:flex-row sm:items-center sm:justify-between">
          <span>COGNITIVE COMPILER // ACTIVE SESSION: {sessionId} // CLASSIFICATION: EYES ONLY</span>
          <span className="text-[#C8860A]/55">SYS STABILIZED // TARGET {targetName}</span>
        </header>

        <main className="grid flex-1 grid-cols-1 items-center gap-8 py-6 lg:grid-cols-12 lg:gap-12">
          <section className="lg:col-span-7">
            <div className="relative overflow-hidden border-l border-[#C8860A]/18 pl-5">
              <span className="absolute left-0 top-0 h-px w-3 bg-[#C8860A]/55" />
              <span className="absolute bottom-0 left-0 h-px w-3 bg-[#C8860A]/55" />
              <div className="mb-3 flex items-center gap-2 text-[9px] font-bold uppercase tracking-[0.28em] text-[#F5F0E8]/38">
                <span className="h-2 w-0.5 bg-[#C8860A]/55" />
                SYSTEM DIAGNOSTICS RECORD
              </div>

              <div
                ref={scrollContainerRef}
                className="terminal-mask flex max-h-[320px] flex-col gap-2 overflow-y-auto pr-2"
              >
                {logEntries.map((entry) => {
                  const isPending = entry.state === "PENDING";
                  const isActive = entry.state === "ACTIVE";
                  const toneClass = isPending
                    ? "text-[#C8860A] font-semibold"
                    : isActive
                      ? "text-[#F5F0E8]"
                      : "text-[#F5F0E8]/38";

                  return (
                    <motion.div
                      key={entry.id}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`flex items-center gap-3 border-b border-white/[0.03] py-1.5 text-[11px] tracking-[0.18em] ${toneClass}`}
                    >
                      <span className="shrink-0 text-[10px] tracking-normal text-gray-500">
                        [{entry.timestamp}]
                      </span>
                      <span className="min-w-0 flex-1 truncate uppercase">
                        {entry.text}
                        {isActive && (
                          <span className="ml-2 inline-block h-[10px] w-[4px] animate-pulse bg-[#F5F0E8]" />
                        )}
                        {isPending && pulseTick % 2 === 0 && (
                          <span className="ml-2 inline-block h-[10px] w-[4px] animate-pulse bg-[#C8860A]" />
                        )}
                      </span>
                      <span className="shrink-0 text-[9px] tracking-[0.2em] text-[#C8860A]/70">
                        {entry.state}
                      </span>
                    </motion.div>
                  );
                })}
              </div>

              <div className="mt-5 grid grid-cols-2 gap-3 text-[10px] uppercase tracking-[0.2em] text-[#F5F0E8]/48">
                <div className="border border-[rgba(245,240,232,0.08)] bg-black/35 px-3 py-2">
                  <div className="text-[8px] text-gray-500">TARGET CIPHER</div>
                  <div className="mt-1 text-[11px] text-[#C8860A]">{decodedText}</div>
                </div>
                <div className="border border-[rgba(245,240,232,0.08)] bg-black/35 px-3 py-2">
                  <div className="text-[8px] text-gray-500">SCAN STATE</div>
                  <div className="mt-1 text-[11px] text-[#F5F0E8]">{status}</div>
                </div>
              </div>
            </div>
          </section>

          <section className="lg:col-span-5">
            <div className="relative mx-auto w-full max-w-[430px]">
              <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle,rgba(200,134,10,0.18),transparent_58%)] blur-3xl" />
              <div className="relative overflow-hidden border border-[rgba(245,240,232,0.1)] bg-black/40 p-4">
                <div className="mb-3 flex items-center justify-between text-[9px] uppercase tracking-[0.2em] text-[#F5F0E8]/45">
                  <span>OPTICAL MICROSCOPE</span>
                  <span className="text-[#C8860A]/72">{activeBeat.focusLabel}</span>
                </div>

                <div className="relative aspect-[4/5] overflow-hidden border border-[rgba(245,240,232,0.12)] bg-black">
                  <div className="radar-vignette absolute inset-0 z-[5]" />
                  <div className="pointer-events-none absolute inset-0 z-10 border border-dashed border-[#C8860A]/10" />
                  <div className="pointer-events-none absolute left-4 right-4 top-1/2 z-10 h-px bg-[#C8860A]/16" />
                  <div className="pointer-events-none absolute bottom-4 top-4 left-1/2 z-10 w-px bg-[#C8860A]/16" />
                  <div className="pointer-events-none absolute inset-0 z-[11] bg-[radial-gradient(circle_at_52%_48%,transparent_0,transparent_22%,rgba(200,134,10,0.07)_52%,rgba(0,0,0,0.54)_100%)]" />
                  <div className="pointer-events-none absolute inset-0 z-[12] bg-[linear-gradient(180deg,rgba(0,0,0,0.16),transparent_28%,transparent_72%,rgba(0,0,0,0.34))]" />
                  {negativeFlash ? (
                    <div className="pointer-events-none absolute inset-0 z-[13] bg-[linear-gradient(180deg,rgba(245,240,232,0.14),rgba(245,240,232,0.02))] mix-blend-screen" />
                  ) : null}

                  <motion.img
                    src={targetPhotoUrl}
                    alt={targetName}
                    animate={{
                      scale: activeBeat.imageScale,
                      x: activeBeat.imageX,
                      y: activeBeat.imageY,
                      filter: negativeFlash
                        ? `invert(1) grayscale(1) contrast(2.25) brightness(1.22) saturate(0) blur(${activeBeat.blur}px)`
                        : `grayscale(1) contrast(1.48) brightness(0.9) sepia(0.24) saturate(0.55) blur(${activeBeat.blur}px)`,
                    }}
                    transition={{ type: "spring", stiffness: 46, damping: 16, mass: 1.05 }}
                    className="h-full w-full object-cover"
                    style={{
                      mixBlendMode: negativeFlash ? "screen" : "luminosity",
                      transformOrigin: "center center",
                    }}
                  />

                  <motion.div
                    className="pointer-events-none absolute z-20 h-20 w-20 -translate-x-1/2 -translate-y-1/2"
                    animate={{
                      left: activeBeat.lockX,
                      top: activeBeat.lockY,
                      scale: isResolving ? 1.04 : 1,
                    }}
                    transition={{ type: "spring", stiffness: 110, damping: 20, mass: 0.9 }}
                  >
                    <div className={`absolute inset-0 bg-[radial-gradient(circle,rgba(200,134,10,0.06),transparent_70%)] ${negativeFlash ? "border border-[#F5F0E8]/40" : "border border-[#C8860A]/30"}`} />
                    <div className={`absolute left-0 top-0 h-4 w-4 -translate-x-1 -translate-y-1 border-l border-t ${negativeFlash ? "border-[#F5F0E8]" : "border-[#C8860A]"}`} />
                    <div className={`absolute right-0 top-0 h-4 w-4 translate-x-1 -translate-y-1 border-r border-t ${negativeFlash ? "border-[#F5F0E8]" : "border-[#C8860A]"}`} />
                    <div className={`absolute bottom-0 left-0 h-4 w-4 -translate-x-1 translate-y-1 border-b border-l ${negativeFlash ? "border-[#F5F0E8]" : "border-[#C8860A]"}`} />
                    <div className={`absolute bottom-0 right-0 h-4 w-4 translate-x-1 translate-y-1 border-b border-r ${negativeFlash ? "border-[#F5F0E8]" : "border-[#C8860A]"}`} />
                    <motion.div
                      animate={{ opacity: [0.25, 0.85, 0.25] }}
                      transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
                      className="absolute left-2 right-2 top-1/2 h-px -translate-y-1/2 bg-[#C8860A]/60"
                    />
                    <motion.div
                      animate={{ opacity: [0.18, 0.64, 0.18] }}
                      transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut", delay: 0.12 }}
                      className="absolute bottom-2 top-2 left-1/2 w-px -translate-x-1/2 bg-[#C8860A]/45"
                    />
                  </motion.div>

                  <div className="absolute left-2 top-2 z-20 border border-[rgba(245,240,232,0.12)] bg-black/65 px-2 py-1 text-[8px] uppercase tracking-[0.18em] text-[#C8860A]">
                    {activeBeat.focusCode}
                  </div>
                  <div className="absolute bottom-2 left-2 z-20 border border-[rgba(245,240,232,0.12)] bg-black/65 px-2 py-1 text-[8px] uppercase tracking-[0.18em] text-[#F5F0E8]/70">
                    TARGET: {targetName}
                  </div>
                </div>

                <div className="mt-4 space-y-2">
                  <div className="flex items-center justify-between text-[9px] uppercase tracking-[0.2em] text-gray-500">
                    <span>SUBJECT RESOLUTION</span>
                    <span className="text-[#C8860A]">{Math.round(progressRatio * 100)}%</span>
                  </div>
                  <div className="relative h-1.5 overflow-hidden bg-[rgba(245,240,232,0.08)]">
                    <motion.div
                      className="absolute inset-y-0 left-0 bg-[#C8860A]"
                      animate={{ width: `${progressRatio * 100}%` }}
                      transition={{ ease: "easeOut", duration: 0.3 }}
                    />
                    <motion.div
                      className="absolute inset-y-0 w-16 bg-gradient-to-r from-transparent via-white/45 to-transparent"
                      animate={{ x: ["-20%", "480%"] }}
                      transition={{ duration: 1.8, ease: "linear", repeat: Infinity }}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-[9px] uppercase tracking-[0.18em] text-[#F5F0E8]/48">
                    <div className="border border-[rgba(245,240,232,0.08)] bg-black/35 px-2 py-1.5">
                      <div className="text-gray-500">SERIAL</div>
                      <div className="mt-1 text-[#F5F0E8]">{targetId}</div>
                    </div>
                    <div className="border border-[rgba(245,240,232,0.08)] bg-black/35 px-2 py-1.5">
                      <div className="text-gray-500">STATE VECTOR</div>
                      <div className="mt-1 text-[#C8860A]">
                        {isResolving ? "LOCKED" : "DECRYPTING"}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </main>
      </div>
    </motion.div>
  );
}
