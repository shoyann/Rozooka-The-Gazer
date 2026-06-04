"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  AudioLines,
  BookOpen,
  BriefcaseBusiness,
  Cpu,
  ExternalLink,
  GitFork,
  Link as LinkIcon,
  Network,
  ShieldAlert,
  User,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

import type { TargetDossier } from "./types";

interface DeepResearchBoardProps {
  activeTarget: TargetDossier;
  deepResearchCapability: string;
  systemStatusLabel: string;
  onClose: () => void;
}

type ResearchNodeType =
  | "profile"
  | "education"
  | "work"
  | "social"
  | "hooks"
  | "intelligence";

interface ResearchNode {
  id: ResearchNodeType;
  title: string;
  tag: string;
  x: number;
  y: number;
  unlockedAt: number;
  items: string[];
}

type ResearchNodeOffsets = Partial<Record<ResearchNodeType, { x: number; y: number }>>;

const NODE_LAYOUT: Record<ResearchNodeType, { x: number; y: number; unlockedAt: number }> = {
  profile: { x: 38, y: 50, unlockedAt: 1 },
  education: { x: 15, y: 24, unlockedAt: 2 },
  work: { x: 62, y: 24, unlockedAt: 2 },
  social: { x: 10, y: 72, unlockedAt: 3 },
  hooks: { x: 38, y: 82, unlockedAt: 3 },
  intelligence: { x: 62, y: 70, unlockedAt: 4 },
};

function buildNodes(target: TargetDossier): ResearchNode[] {
  return [
    {
      id: "profile",
      title: target.name,
      tag: "#PROFILE",
      x: NODE_LAYOUT.profile.x,
      y: NODE_LAYOUT.profile.y,
      unlockedAt: 1,
      items: [target.serialNumber, target.hexSignature, target.sectorOrigin],
    },
    {
      id: "education",
      title: "SECURED CREDENTIAL MATRIX",
      tag: "#EDUCATION",
      x: NODE_LAYOUT.education.x,
      y: NODE_LAYOUT.education.y,
      unlockedAt: 2,
      items: target.education.slice(0, 3),
    },
    {
      id: "work",
      title: "ARCHIVED RECORDINGS",
      tag: "#WORK",
      x: NODE_LAYOUT.work.x,
      y: NODE_LAYOUT.work.y,
      unlockedAt: 2,
      items: target.workHistory.slice(0, 3),
    },
    {
      id: "social",
      title: "DIGITAL TRANSMISSION SIGNALS",
      tag: "#SOCIAL",
      x: NODE_LAYOUT.social.x,
      y: NODE_LAYOUT.social.y,
      unlockedAt: 3,
      items: target.socialProfiles.slice(0, 3),
    },
    {
      id: "hooks",
      title: "CONVERSATIONAL TARGET VECTORS",
      tag: "#HOOKS",
      x: NODE_LAYOUT.hooks.x,
      y: NODE_LAYOUT.hooks.y,
      unlockedAt: 3,
      items: target.conversationHooks.slice(0, 2),
    },
    {
      id: "intelligence",
      title: "RAW SATELLITE PACKETS",
      tag: "#INTELLIGENCE",
      x: NODE_LAYOUT.intelligence.x,
      y: NODE_LAYOUT.intelligence.y,
      unlockedAt: 4,
      items: target.intelList.length
        ? target.intelList.slice(0, 3).map((entry) => `[${entry.source}] ${entry.content}`)
        : ["Waiting for live intelligence fragments."],
    },
  ];
}

function iconFor(type: ResearchNodeType) {
  switch (type) {
    case "profile":
      return <User className="h-3.5 w-3.5 text-[#C8860A]" />;
    case "education":
      return <BookOpen className="h-3.5 w-3.5 text-[#C8860A]" />;
    case "work":
      return <BriefcaseBusiness className="h-3.5 w-3.5 text-[#C8860A]" />;
    case "social":
      return <LinkIcon className="h-3.5 w-3.5 text-[#C8860A]" />;
    case "hooks":
      return <ShieldAlert className="h-3.5 w-3.5 text-[#C8860A]" />;
    case "intelligence":
      return <Cpu className="h-3.5 w-3.5 text-[#C8860A]" />;
    default:
      return <GitFork className="h-3.5 w-3.5 text-[#C8860A]" />;
  }
}

export default function DeepResearchBoard({
  activeTarget,
  deepResearchCapability,
  systemStatusLabel,
  onClose,
}: DeepResearchBoardProps) {
  const nodes = useMemo(() => buildNodes(activeTarget), [activeTarget]);
  const [selectedNodeId, setSelectedNodeId] = useState<ResearchNodeType>("profile");
  const [openedNodeId, setOpenedNodeId] = useState<ResearchNodeType | null>(null);
  const [unlockedLevel, setUnlockedLevel] = useState(1);
  const [nodeOffsets, setNodeOffsets] = useState<ResearchNodeOffsets>({});
  const boardRef = useRef<HTMLDivElement | null>(null);
  const dragIntentRef = useRef<Partial<Record<ResearchNodeType, boolean>>>({});

  const selectedNode = nodes.find((node) => node.id === selectedNodeId) ?? nodes[0];
  const openedNode =
    nodes.find((node) => node.id === openedNodeId) ??
    (openedNodeId === "profile" ? nodes[0] : null);

  useEffect(() => {
    setSelectedNodeId("profile");
    setOpenedNodeId(null);
    setUnlockedLevel(1);
    setNodeOffsets({});

    const unlockTimer = window.setInterval(() => {
      setUnlockedLevel((current) => {
        if (current >= 4) {
          window.clearInterval(unlockTimer);
          return current;
        }
        return current + 1;
      });
    }, 950);

    return () => window.clearInterval(unlockTimer);
  }, [activeTarget.id]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (openedNodeId) {
          setOpenedNodeId(null);
          return;
        }
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose, openedNodeId]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 overflow-hidden bg-[#060503] font-mono text-[#F5F0E8]"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_34%_48%,rgba(200,134,10,0.1),transparent_22%),radial-gradient(circle_at_72%_22%,rgba(200,134,10,0.025),transparent_14%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,184,61,0.02),transparent_28%,transparent_72%,rgba(255,184,61,0.01))]" />

      <header className="relative z-20 flex h-[56px] items-center justify-between border-b border-[#C8860A]/18 bg-[#0A0906]/94 px-4">
        <div className="flex items-center gap-3">
          <div className="rounded border border-[#C8860A]/22 bg-[#C8860A]/8 p-1.5">
            <Network className="h-4.5 w-4.5 text-[#C8860A]" />
          </div>
          <div className="flex items-center gap-3">
            <div className="text-[20px] font-black uppercase tracking-[0.15em] text-[#FFB83D]">
              ROZOOKA // COGNITIVE RECON
            </div>
            <div className="hidden text-[11px] uppercase tracking-[0.16em] text-[#C8860A]/68 md:block">
              // EXECUTING STABLE RADAR STREAM
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 text-[10px] uppercase tracking-[0.14em]">
          <div className="flex overflow-hidden rounded border border-[#C8860A]/18">
            <span className="border-r border-[#C8860A]/14 px-4 py-2 text-[#FFB83D]">OUT</span>
            <span className="border-r border-[#C8860A]/14 px-4 py-2 text-[#F5F0E8]/82">90%</span>
            <span className="px-4 py-2 text-[#FFB83D]">IN</span>
          </div>
          <div className="hidden items-center gap-2 rounded border border-[#C8860A]/18 px-4 py-2 text-[#FFB83D] md:flex">
            <AudioLines className="h-3.5 w-3.5" />
            AUDIO
          </div>
          <div className="hidden items-center gap-2 rounded border border-[#C8860A]/18 px-4 py-2 text-[#FFB83D] lg:flex">
            <kbd className="rounded border border-[#C8860A]/22 bg-black/40 px-1.5 py-0.5 text-[9px]">
              ESC
            </kbd>
            DISMISS BRIEFING
          </div>
          <button
            onClick={onClose}
            className="rounded border border-rose-900/60 bg-rose-950/20 p-2 text-rose-400 transition hover:bg-rose-950/45 hover:text-rose-300"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </header>

      <div className="relative z-10 h-[calc(100%-56px)] overflow-hidden px-6 py-6">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-[34%] top-1/2 h-[1100px] w-[1100px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#C8860A]/6" />
          <div className="absolute left-[34%] top-1/2 h-[760px] w-[760px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#C8860A]/8" />
          <div className="absolute left-[34%] top-1/2 h-[420px] w-[420px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#C8860A]/10" />
          <div className="absolute left-0 top-1/2 h-px w-full bg-[#C8860A]/5" />
          <div className="absolute left-[34%] top-0 h-full w-px bg-[#C8860A]/5" />
        </div>

        <div className="relative h-full">
          <div className="absolute bottom-4 left-0 z-20 flex items-center gap-5 border-t border-[#C8860A]/14 bg-[#060503]/78 px-5 py-3 text-[10px] uppercase tracking-[0.16em] text-[#C8860A]/78">
            <span>SECURE ACTIVE RADAR: {systemStatusLabel}</span>
            <span>DEEP CAPABILITY: {deepResearchCapability}</span>
            <span>TARGETED RECORD: {activeTarget.name}</span>
            <span>OPEN VECTOR: {selectedNode.title}</span>
          </div>

          <div ref={boardRef} className="relative h-full max-w-[1380px]">
            <svg className="pointer-events-none absolute inset-0 h-full w-full overflow-visible">
              {nodes
                .filter((node) => node.id !== "profile" && node.unlockedAt <= unlockedLevel)
                .map((node) => {
                  const startX = NODE_LAYOUT.profile.x;
                  const startY = NODE_LAYOUT.profile.y;
                  const midX = (startX + node.x) / 2;
                  const midY = (startY + node.y) / 2 + (node.y > startY ? 4 : -4);
                  const path = `M ${startX}% ${startY}% Q ${midX}% ${midY}% ${node.x}% ${node.y}%`;
                  return (
                    <g key={`path-${node.id}`}>
                      <path
                        d={path}
                        fill="none"
                        stroke="#C8860A"
                        strokeWidth="1.15"
                        strokeDasharray="5 4"
                        opacity="0.42"
                      />
                      <circle r="3.5" fill="#FFB83D">
                        <animateMotion path={path} dur="3.6s" repeatCount="indefinite" />
                      </circle>
                    </g>
                  );
                })}
            </svg>

            {nodes.map((node) => {
              const unlocked = node.unlockedAt <= unlockedLevel;
              const active = selectedNode.id === node.id;
              const isProfile = node.id === "profile";

              return (
                <motion.button
                  key={node.id}
                  type="button"
                  onClick={() => {
                    if (!unlocked) {
                      return;
                    }
                    if (dragIntentRef.current[node.id]) {
                      dragIntentRef.current[node.id] = false;
                      return;
                    }
                    setSelectedNodeId(node.id);
                    setOpenedNodeId(node.id);
                  }}
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{
                    opacity: unlocked ? 1 : 0.12,
                    scale: active ? 1.02 : 1,
                  }}
                  drag={unlocked}
                  dragConstraints={boardRef}
                  dragElastic={0.12}
                  dragMomentum={false}
                  dragTransition={{
                    bounceStiffness: 220,
                    bounceDamping: 24,
                    power: 0.04,
                    timeConstant: 140,
                  }}
                  whileDrag={{ scale: isProfile ? 1.015 : 1.03 }}
                  onDragEnd={(_, info) => {
                    const distance = Math.hypot(info.offset.x, info.offset.y);
                    if (distance < 10) {
                      dragIntentRef.current[node.id] = false;
                      return;
                    }
                    dragIntentRef.current[node.id] = true;
                    setNodeOffsets((current) => ({
                      ...current,
                      [node.id]: {
                        x: (current[node.id]?.x ?? 0) + info.offset.x,
                        y: (current[node.id]?.y ?? 0) + info.offset.y,
                      },
                    }));
                  }}
                  className={`absolute overflow-hidden border bg-[#0A0906]/82 text-left transition ${
                    unlocked
                      ? "cursor-grab active:cursor-grabbing hover:border-[#C8860A]/42"
                      : "cursor-not-allowed"
                  } ${
                    active
                      ? "border-[#C8860A]/38 shadow-[0_0_24px_rgba(200,134,10,0.08)]"
                      : "border-[#C8860A]/16"
                  }`}
                  style={{
                    left: `${node.x}%`,
                    top: `${node.y}%`,
                    width: isProfile ? "250px" : node.id === "hooks" ? "240px" : "220px",
                    minHeight: isProfile ? "292px" : "148px",
                    transform: "translate(-50%, -50%)",
                    x: nodeOffsets[node.id]?.x ?? 0,
                    y: nodeOffsets[node.id]?.y ?? 0,
                  }}
                >
                  {isProfile ? (
                    <div className="p-4">
                      <div className="mb-3 flex items-center justify-between text-[9px] uppercase tracking-[0.16em] text-[#C8860A]/72">
                        <span className="flex items-center gap-1.5">
                          {iconFor(node.id)}
                          CENTRAL COGNITIVE SCAN
                        </span>
                        <span className="text-[#F5F0E8]/34">{node.tag}</span>
                      </div>

                      <div className="relative overflow-hidden border border-[#C8860A]/16 bg-black">
                        <img
                          src={activeTarget.photoUrl}
                          alt={activeTarget.name}
                          className="h-[132px] w-full object-cover grayscale"
                          style={{
                            filter:
                              "contrast(1.4) brightness(0.88) sepia(0.18) saturate(0.55)",
                          }}
                        />
                        <div className="pointer-events-none absolute left-[20%] top-[20%] h-7 w-7 border-l border-t border-[#C8860A]" />
                        <div className="pointer-events-none absolute right-[20%] top-[20%] h-7 w-7 border-r border-t border-[#C8860A]" />
                        <div className="pointer-events-none absolute bottom-[18%] left-[20%] h-7 w-7 border-b border-l border-[#C8860A]" />
                        <div className="pointer-events-none absolute bottom-[18%] right-[20%] h-7 w-7 border-b border-r border-[#C8860A]" />
                        <div className="pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2 border border-[#C8860A]/22 bg-black/84 px-2 py-1 text-[8px] uppercase tracking-[0.16em] text-[#FFB83D]">
                          FACIAL LOCK_STABLE
                        </div>
                      </div>

                      <div className="mt-4 text-center text-[15px] font-black uppercase tracking-[0.14em] text-[#F5F0E8]">
                        {activeTarget.name}
                      </div>
                      <div className="mt-2 text-center text-[10px] uppercase tracking-[0.17em] text-[#FFB83D]">
                        MATRIX TARGET ACTIVE // ROZO_V4
                      </div>
                    </div>
                  ) : (
                    <div className="p-4">
                      <div className="mb-2 flex items-center justify-between text-[9px] uppercase tracking-[0.16em] text-[#C8860A]/72">
                        <span className="flex items-center gap-1.5">
                          {iconFor(node.id)}
                          {node.title}
                        </span>
                        <span className="text-[#F5F0E8]/34">{node.tag}</span>
                      </div>

                      <div className="space-y-2 text-[11px] leading-relaxed text-[#F5F0E8]/72">
                        {node.items.slice(0, 2).map((item) => (
                          <div key={item} className="border-l border-[#F5F0E8]/10 pl-2">
                            {item}
                          </div>
                        ))}
                      </div>

                      <div className="mt-4 flex items-center justify-between text-[9px] uppercase tracking-[0.16em] text-[#F5F0E8]/34">
                        <span>CLASSIFIED DOSSIER</span>
                        <span className="flex items-center gap-1 text-[#FFB83D]/74">
                          VIEW DATA
                          <ExternalLink className="h-2.5 w-2.5" />
                        </span>
                      </div>
                    </div>
                  )}
                </motion.button>
              );
            })}
          </div>
        </div>

        <AnimatePresence>
          {openedNode ? (
            <motion.div
              initial={{ opacity: 0, x: 28 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 28 }}
              className="absolute right-8 top-1/2 z-30 w-[420px] -translate-y-1/2 border border-[#C8860A]/18 bg-[#0A0906]/96 p-5 shadow-[0_0_48px_rgba(0,0,0,0.45)]"
            >
              <div className="mb-4 flex items-start justify-between gap-4">
                <div>
                  <div className="mb-1 text-[10px] uppercase tracking-[0.18em] text-[#C8860A]">
                    {openedNode.tag}
                  </div>
                  <div className="text-[18px] font-black uppercase tracking-[0.13em] text-[#F5F0E8]">
                    {openedNode.title}
                  </div>
                </div>
                <button
                  onClick={() => setOpenedNodeId(null)}
                  className="rounded border border-[#C8860A]/16 px-2 py-1 text-[10px] uppercase tracking-[0.16em] text-[#FFB83D] transition hover:bg-[#C8860A]/10"
                >
                  Dismiss
                </button>
              </div>

              {openedNode.id === "profile" ? (
                <div className="space-y-4">
                  <div className="overflow-hidden border border-[#C8860A]/16 bg-black">
                    <img
                      src={activeTarget.photoUrl}
                      alt={activeTarget.name}
                      className="h-[184px] w-full object-cover grayscale"
                      style={{
                        filter: "contrast(1.45) brightness(0.86) sepia(0.18) saturate(0.58)",
                      }}
                    />
                  </div>
                  <div className="space-y-2 text-[11px] leading-relaxed text-[#F5F0E8]/74">
                    {openedNode.items.map((item) => (
                      <div key={item} className="border-l border-[#F5F0E8]/10 pl-3">
                        {item}
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="space-y-3 text-[11px] leading-relaxed text-[#F5F0E8]/74">
                  {openedNode.items.map((item) => (
                    <div key={item} className="border-l border-[#F5F0E8]/10 pl-3">
                      {item}
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-5 border-t border-[#C8860A]/12 pt-4 text-[10px] uppercase tracking-[0.16em] text-[#C8860A]/68">
                NODE REF // {openedNode.id.toUpperCase()}
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
