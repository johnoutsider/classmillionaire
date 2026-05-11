"use client";

import { cn } from "@/lib/utils";

const LIFELINES = [
  { id: "fifty_fifty",    label: "50:50",    key: "F", emoji: "✂️" },
  { id: "ask_audience",  label: "Audience", key: "Q", emoji: "👥" },
  { id: "phone_friend",  label: "Phone",    key: "P", emoji: "📞" },
  { id: "switch_question", label: "Switch", key: "S", emoji: "🔄" },
] as const;

export default function LifelineBar({
  lifelinesUsed, onActivate, disabled,
}: {
  lifelinesUsed: Set<string>;
  onActivate: (id: string) => void;
  disabled: boolean;
}) {
  return (
    <div className="flex items-center gap-2">
      {LIFELINES.map((l) => {
        const used = lifelinesUsed.has(l.id);
        return (
          <button
            key={l.id}
            onClick={() => onActivate(l.id)}
            disabled={used || disabled}
            title={`${l.label} (${l.key})`}
            className={cn(
              "flex flex-col items-center justify-center w-16 h-14 rounded-xl border-2 text-xs font-medium transition",
              used
                ? "border-blue-900 bg-blue-950/30 text-blue-800 opacity-50 cursor-not-allowed line-through"
                : "border-yellow-600 bg-yellow-950/30 text-yellow-300 hover:bg-yellow-900/40 hover:border-yellow-400 cursor-pointer"
            )}
          >
            <span className="text-lg leading-none">{l.emoji}</span>
            <span className="mt-0.5">{l.label}</span>
          </button>
        );
      })}
    </div>
  );
}
