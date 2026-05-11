"use client";

import { cn } from "@/lib/utils";

type TileState = "idle" | "selected" | "correct" | "wrong" | "eliminated";

export default function AnswerTile({
  label, text, shown, state, onClick, disabled,
}: {
  label: string;
  text: string;
  shown: boolean;
  state: TileState;
  onClick: () => void;
  disabled: boolean;
}) {
  if (!shown) {
    return (
      <div className="h-16 rounded-xl border border-blue-950 bg-blue-950/20 opacity-30" />
    );
  }

  const colors: Record<TileState, string> = {
    idle:       "border-blue-600 bg-gradient-to-b from-[#0d1a60] to-[#080e3a] text-white hover:border-blue-400 hover:from-[#152080]",
    selected:   "border-yellow-400 bg-gradient-to-b from-[#7c5c00] to-[#4a3800] text-yellow-200 shadow-[0_0_20px_rgba(250,204,21,0.4)]",
    correct:    "border-green-400 bg-gradient-to-b from-[#14532d] to-[#052e16] text-green-200 shadow-[0_0_24px_rgba(74,222,128,0.5)]",
    wrong:      "border-red-500 bg-gradient-to-b from-[#7f1d1d] to-[#450a0a] text-red-200 shadow-[0_0_24px_rgba(239,68,68,0.5)]",
    eliminated: "border-blue-950 bg-blue-950/20 text-blue-800 line-through",
  };

  const anim: Record<TileState, string> = {
    idle:       "",
    selected:   "scale-[1.02]",
    correct:    "animate-pulse",
    wrong:      "",
    eliminated: "opacity-30",
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled || state === "eliminated"}
      className={cn(
        "h-16 rounded-xl border-2 flex items-center gap-3 px-4 text-left font-medium transition-all duration-200 cursor-pointer disabled:cursor-default",
        colors[state],
        anim[state]
      )}
    >
      <span className="shrink-0 w-7 h-7 rounded-full border-2 border-current flex items-center justify-center text-xs font-bold opacity-70">
        {label}
      </span>
      <span className="text-sm leading-snug">{text}</span>
    </button>
  );
}
