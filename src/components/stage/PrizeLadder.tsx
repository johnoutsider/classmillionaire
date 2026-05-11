"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import type { LadderRung } from "@/app/play/[gameId]/GameStage";

export default function PrizeLadder({
  ladder, currentRung, phase,
}: {
  ladder: LadderRung[];
  currentRung: number;
  phase: string;
}) {
  const activeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [currentRung]);

  return (
    <aside className="w-52 shrink-0 bg-[#06082a] border-l border-blue-900 flex flex-col overflow-hidden">
      <div className="px-4 py-3 border-b border-blue-900">
        <p className="text-xs text-blue-500 uppercase tracking-widest font-semibold">Prize Ladder</p>
      </div>
      <div className="flex-1 overflow-y-auto py-2 flex flex-col-reverse">
        {ladder.map((r, i) => {
          const isCurrent = i === currentRung && !["correct", "wrong", "game_over", "won"].includes(phase);
          const isPassed  = i < currentRung || phase === "won";
          const isSafe    = r.isSafetyNet;

          return (
            <div
              key={r.rung}
              ref={isCurrent ? activeRef : undefined}
              className={cn(
                "flex items-center justify-between px-4 py-1.5 transition-all",
                isCurrent  && "bg-yellow-400/10 border-l-2 border-yellow-400",
                isPassed   && !isCurrent && "opacity-40",
                isSafe     && !isCurrent && "text-amber-400",
                !isCurrent && !isPassed  && "text-blue-400"
              )}
            >
              <div className="flex items-center gap-2">
                {isSafe && <span className="text-amber-400 text-xs">⬡</span>}
                <span className={cn("text-xs", isCurrent ? "text-yellow-300 font-bold" : "")}>{r.rung}</span>
              </div>
              <span className={cn(
                "text-sm font-semibold tabular-nums",
                isCurrent ? "text-yellow-300" : isPassed ? "text-green-500" : isSafe ? "text-amber-400" : "text-blue-300"
              )}>
                {r.prize}
              </span>
            </div>
          );
        })}
      </div>
    </aside>
  );
}
