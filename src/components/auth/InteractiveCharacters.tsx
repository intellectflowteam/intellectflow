import React from "react";
import { motion } from "framer-motion";

interface Props {
  mood: "idle" | "nosy" | "shy" | "exposed";
}

export function InteractiveCharacters({ mood }: Props) {
  return (
    <div className="w-full h-full min-h-[280px] bg-[#EFE8D8] border-b md:border-b-0 md:border-r border-[rgba(20,17,14,0.1)] p-6 flex flex-col items-center justify-center relative overflow-hidden select-none">
      {/* Background Subtle Grid */}
      <div className="absolute inset-0 dot-grid opacity-30 pointer-events-none" />

      {/* Mood Status Badge */}
      <div className="absolute top-4 left-4 font-mono text-[10px] uppercase tracking-widest text-[var(--brass-deep)] bg-white/80 border border-[var(--brass)]/30 px-3 py-1 rounded-full shadow-2xs font-semibold">
        {mood === "idle" && "👀 Watching..."}
        {mood === "nosy" && "🔍 Reading Email..."}
        {mood === "shy" && "🙈 No Peeking!"}
        {mood === "exposed" && "😮 Password Revealed!"}
      </div>

      {/* Mascot Stage */}
      <div className="relative flex items-center justify-center gap-6 mt-4">
        {/* Mascot 1: QR Standee Mascot */}
        <motion.div
          animate={
            mood === "nosy"
              ? { y: [0, -6, 0], rotate: [-2, 2, -2] }
              : mood === "shy"
              ? { scale: 0.95 }
              : { y: [0, -3, 0] }
          }
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          className="relative w-28 h-32 bg-[var(--ink)] text-[var(--paper)] rounded-2xl p-3 shadow-xl flex flex-col items-center justify-between border-2 border-[var(--brass)]"
        >
          {/* QR Header Notch */}
          <div className="w-8 h-1.5 bg-[var(--brass)] rounded-full mb-1" />

          {/* Eyes Container */}
          <div className="flex items-center gap-3 my-2">
            {/* Eye Left */}
            <div className="w-7 h-7 bg-white rounded-full flex items-center justify-center relative overflow-hidden">
              <motion.div
                animate={
                  mood === "nosy"
                    ? { x: 2, y: 3 }
                    : mood === "shy"
                    ? { y: -4 }
                    : mood === "exposed"
                    ? { scale: 1.4 }
                    : { x: [ -2, 2, -2 ] }
                }
                transition={{ duration: 1.5, repeat: Infinity }}
                className="w-3.5 h-3.5 bg-[var(--ink)] rounded-full relative"
              >
                <div className="w-1 h-1 bg-white rounded-full absolute top-0.5 right-0.5" />
              </motion.div>
            </div>

            {/* Eye Right */}
            <div className="w-7 h-7 bg-white rounded-full flex items-center justify-center relative overflow-hidden">
              <motion.div
                animate={
                  mood === "nosy"
                    ? { x: 2, y: 3 }
                    : mood === "shy"
                    ? { y: -4 }
                    : mood === "exposed"
                    ? { scale: 1.4 }
                    : { x: [ -2, 2, -2 ] }
                }
                transition={{ duration: 1.5, repeat: Infinity }}
                className="w-3.5 h-3.5 bg-[var(--ink)] rounded-full relative"
              >
                <div className="w-1 h-1 bg-white rounded-full absolute top-0.5 right-0.5" />
              </motion.div>
            </div>
          </div>

          {/* Mouth */}
          <motion.div
            animate={
              mood === "exposed"
                ? { scaleY: 1.6 }
                : mood === "shy"
                ? { width: "12px" }
                : { width: "18px" }
            }
            className="w-4 h-2 bg-[var(--brass)] rounded-full"
          />

          {/* Feet */}
          <div className="flex gap-4 -mb-4">
            <div className="w-4 h-2 bg-[var(--ink)] rounded-b-md" />
            <div className="w-4 h-2 bg-[var(--ink)] rounded-b-md" />
          </div>
        </motion.div>

        {/* Mascot 2: 5-Star Gold Mascot */}
        <motion.div
          animate={
            mood === "shy"
              ? { y: 4, scale: 0.95 }
              : mood === "exposed"
              ? { y: -8, scale: 1.05 }
              : { y: [0, 4, 0] }
          }
          transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
          className="relative w-28 h-28 bg-[var(--brass)] text-[var(--ink)] rounded-3xl p-3 shadow-xl flex flex-col items-center justify-center border-2 border-[var(--brass-deep)]"
        >
          {/* Hands covering eyes when Shy */}
          {mood === "shy" ? (
            <div className="flex gap-1 items-center z-20">
              <div className="w-7 h-5 bg-[var(--brass-deep)] rounded-full font-bold text-[9px] text-white flex items-center justify-center shadow-xs">
                🙈
              </div>
              <div className="w-7 h-5 bg-[var(--brass-deep)] rounded-full font-bold text-[9px] text-white flex items-center justify-center shadow-xs">
                🙈
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3 my-1">
              {/* Eyes */}
              <div className="w-6 h-6 bg-[var(--ink)] rounded-full flex items-center justify-center">
                <motion.div
                  animate={
                    mood === "exposed"
                      ? { scale: 1.5, y: -1 }
                      : { x: [ -1, 1, -1 ] }
                  }
                  className="w-2.5 h-2.5 bg-white rounded-full"
                />
              </div>
              <div className="w-6 h-6 bg-[var(--ink)] rounded-full flex items-center justify-center">
                <motion.div
                  animate={
                    mood === "exposed"
                      ? { scale: 1.5, y: -1 }
                      : { x: [ -1, 1, -1 ] }
                  }
                  className="w-2.5 h-2.5 bg-white rounded-full"
                />
              </div>
            </div>
          )}

          {/* Star Badge Rating Text */}
          <div className="mt-2 px-2 py-0.5 rounded-full bg-[var(--ink)] text-[var(--brass)] font-mono text-[10px] font-bold">
            5.0 ★
          </div>
        </motion.div>
      </div>

      {/* Stage Bottom Platform */}
      <div className="w-48 h-3 bg-black/10 rounded-full blur-xs mt-6" />

      {/* Description */}
      <p className="mt-4 text-center text-xs font-mono text-[var(--ink-60)] max-w-xs">
        {mood === "idle" && "Fill in your credentials to sign in."}
        {mood === "nosy" && "Reading email address..."}
        {mood === "shy" && "Hiding password for your security!"}
        {mood === "exposed" && "Password is visible on screen."}
      </p>
    </div>
  );
}
