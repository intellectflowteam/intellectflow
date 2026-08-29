import React from "react";

interface Props {
  size?: "sm" | "md" | "lg";
  showText?: boolean;
  className?: string;
}

export function BrandLogo({ size = "md", showText = true, className = "" }: Props) {
  const sizeMap = {
    sm: { box: "w-8 h-8 rounded-xl", font: "text-lg" },
    md: { box: "w-10 h-10 rounded-2xl", font: "text-2xl" },
    lg: { box: "w-12 h-12 rounded-2xl", font: "text-3xl" },
  };

  const current = sizeMap[size];

  return (
    <div className={`inline-flex items-center gap-2.5 select-none ${className}`}>
      <img
        src="/brand-logo.png"
        alt="IntellectFlow Logo"
        className={`${current.box} object-cover shadow-md shadow-purple-500/20 border border-white/20 hover:scale-105 transition duration-200`}
      />

      {showText && (
        <span className={`font-display ${current.font} font-black tracking-tight text-[var(--ink)]`}>
          Intellect<span className="text-[#6366f1]">Flow</span>
        </span>
      )}
    </div>
  );
}
