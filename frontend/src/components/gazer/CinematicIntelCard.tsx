import { useEffect, useState } from "react";
import { motion } from "framer-motion";

import type { IntelligenceCard } from "./types";
import TypewriterText from "./TypewriterText";

interface CinematicIntelCardProps {
  card: IntelligenceCard;
  index: number;
}

export default function CinematicIntelCard({
  card,
  index,
}: CinematicIntelCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [hasScanned, setHasScanned] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setHasScanned(true);
    }, 1200);

    return () => window.clearTimeout(timer);
  }, []);

  const getSourceStyle = (source: string) => {
    switch (source) {
      case "EXA":
        return "bg-[#C8860A] text-black";
      case "SYSTEM":
        return "border border-[#F5F0E8]/25 bg-[#8B2A2A] text-white";
      case "GOOGLE":
        return "border border-blue-500/30 bg-blue-900/60 text-blue-200";
      case "TWITTER":
        return "border border-[#1D9BF0]/30 bg-[#1D9BF0]/20 text-[#1D9BF0]";
      case "LINKEDIN":
        return "border border-blue-400/20 bg-blue-950/80 text-blue-300";
      case "GITHUB":
        return "border border-slate-400/20 bg-slate-950/80 text-slate-200";
      case "INSTAGRAM":
        return "border border-pink-400/20 bg-pink-950/70 text-pink-200";
      case "FACEBOOK":
        return "border border-[#1877F2]/25 bg-[#1877F2]/15 text-[#8EC2FF]";
      case "WEB":
        return "border border-[#F5F0E8]/20 bg-[#F5F0E8]/10 text-[#F5F0E8]";
      default:
        return "bg-gray-800 text-gray-300";
    }
  };

  return (
    <motion.div
      initial={{
        opacity: 0,
        y: 110,
        scaleY: 0.82,
        scaleX: 0.94,
        skewY: 1,
        filter: "brightness(2.2) contrast(1.4)",
      }}
      animate={{
        opacity: 1,
        y: 0,
        scaleY: 1,
        scaleX: 1,
        skewY: 0,
        filter: "brightness(1) contrast(1)",
      }}
      exit={{
        opacity: 0,
        y: -30,
        scale: 0.95,
        filter: "blur(4px)",
        transition: { duration: 0.25 },
      }}
      transition={{
        type: "spring",
        stiffness: 72,
        damping: 13.5,
        mass: 1.15,
        delay: index * 0.18,
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="relative cursor-pointer select-none overflow-hidden border bg-black/35 p-4 transition-colors duration-300 hover:bg-black/60"
      style={{
        borderColor: isHovered ? "#C8860A" : "rgba(245, 240, 232, 0.11)",
        borderLeft: isHovered
          ? "4px solid #C8860A"
          : "2.5px solid rgba(200, 134, 10, 0.7)",
        boxShadow: isHovered
          ? "inset 0 0 15px rgba(200, 134, 10, 0.15), 0 0 12px rgba(200, 134, 10, 0.1)"
          : "none",
        borderRadius: "1px",
      }}
    >
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(200,134,10,0.08),transparent_28%,transparent_72%,rgba(245,240,232,0.03))]" />
      <div className="pointer-events-none absolute inset-y-0 left-0 w-10 bg-gradient-to-r from-[#C8860A]/10 to-transparent" />

      {!hasScanned && (
        <motion.div
          initial={{ opacity: 0.8 }}
          animate={{ opacity: 0 }}
          transition={{ duration: 0.75, ease: "easeOut", delay: index * 0.18 }}
          className="pointer-events-none absolute inset-0 z-10 bg-[#C8860A]/15"
        />
      )}

      <motion.div
        initial={{ top: "-15%", opacity: 0 }}
        animate={{ top: ["-15%", "115%"], opacity: [0, 1, 1, 0] }}
        transition={{
          duration: 1.5,
          ease: "linear",
          delay: index * 0.12 + 0.1,
        }}
        className="pointer-events-none absolute left-0 right-0 z-20 h-10 border-b border-[#C8860A] bg-gradient-to-b from-[#C8860A]/0 via-[#C8860A]/10 to-transparent shadow-[0_4px_15px_rgba(200,134,10,0.3)]"
      />

      <motion.div
        initial={{ top: "115%", opacity: 0 }}
        animate={{ top: ["115%", "-15%"], opacity: [0, 0.7, 0.7, 0] }}
        transition={{
          duration: 1.1,
          ease: "easeOut",
          delay: index * 0.12 + 0.55,
        }}
        className="pointer-events-none absolute left-0 right-0 z-20 h-[1.5px] bg-gradient-to-r from-transparent via-[#C8860A]/80 to-transparent shadow-[0_0_8px_rgba(200,134,10,0.5)]"
      />

      <span className="pointer-events-none absolute right-0 top-0 h-2 w-2 border-r border-t border-[#C8860A]/30" />
      <span className="pointer-events-none absolute bottom-0 right-0 h-2 w-2 border-b border-r border-[#C8860A]/30" />
      <span className="pointer-events-none absolute left-0 top-0 h-2 w-2 border-l border-t border-[#C8860A]/20" />
      <div className="pointer-events-none absolute left-4 right-4 top-0 h-px bg-gradient-to-r from-transparent via-[#F5F0E8]/5 to-transparent" />

      <div className="relative z-10 mb-2 flex flex-nowrap items-center justify-between gap-2 overflow-hidden whitespace-nowrap">
        <div className="flex shrink-0 items-center gap-1.5">
          <span
            className={`rounded-[1px] px-1.5 py-0.5 font-sans text-[8px] font-bold uppercase tracking-wider ${getSourceStyle(card.source)}`}
          >
            {card.source}
          </span>
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 1, 0.5, 1] }}
            transition={{ delay: index * 0.12 + 0.3, duration: 0.4 }}
            className="border border-[#C8860A]/20 bg-black/50 px-1 font-mono text-[7px] tracking-widest text-[#C8860A]"
          >
            SYS_LNK_{index + 4}
          </motion.span>
        </div>

        <div className="flex shrink-0 flex-nowrap items-center gap-1.5 font-mono text-[8.5px] text-gray-500">
          <span className="flex items-center gap-1">
            CLASS:
            <motion.span
              initial={{ color: "#666" }}
              animate={{ color: "#8B2A2A" }}
              transition={{ delay: index * 0.12 + 0.2 }}
              className="crt-glow-danger font-extrabold uppercase text-[#8B2A2A]"
            >
              {card.classification}
            </motion.span>
          </span>
          <span className="select-none opacity-30">/</span>
          <span className="font-medium text-[#C8860A]/90">
            CF {card.confidence.toFixed(3)}
          </span>
        </div>
      </div>

      <div className="relative z-10 pl-1 font-mono text-[11.5px] leading-relaxed tracking-wide text-[#F5F0E8]/95">
        <TypewriterText text={card.content} speed={4.5} scramble />
      </div>

      <div className="relative z-10 mt-3 flex items-center justify-between border-t border-[rgba(245,240,232,0.07)] pt-2.5 font-mono text-[8px] text-gray-500">
        <div className="flex items-center gap-1.5">
          <span className="h-1 w-1 rounded-full bg-[#C8860A] opacity-60" />
          <span>STAMP_LOC: {card.timestamp}</span>
        </div>

        <motion.span
          animate={{
            opacity: isHovered ? 1 : 0.45,
            x: isHovered ? 3 : 0,
          }}
          className="text-[7.5px] font-semibold uppercase tracking-wider text-[#C8860A]/80"
        >
          {isHovered ? "ANALYZING ENCODED SCAN" : "DECRYPTED_STREAM_CR4_ACTIVE"}
        </motion.span>
      </div>

      <div className="relative z-10 mt-2 flex items-center gap-2">
        <div className="h-px flex-1 bg-[rgba(245,240,232,0.08)]" />
        <span className="font-mono text-[7px] tracking-[0.2em] text-[#C8860A]/65">
          HASH {card.id.slice(-6).toUpperCase()}
        </span>
      </div>
      <div className="relative z-10 mt-1 h-[3px] overflow-hidden bg-[rgba(245,240,232,0.05)]">
        <motion.div
          className="absolute inset-y-0 left-0 bg-[#C8860A]"
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(Math.max(card.confidence, 0), 1) * 100}%` }}
          transition={{ delay: index * 0.12 + 0.25, duration: 0.45, ease: "easeOut" }}
        />
      </div>
    </motion.div>
  );
}
