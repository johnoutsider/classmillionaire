"use client";

import { X } from "lucide-react";

export default function AudienceTally({
  tally, answers, onChange, onClose,
}: {
  tally: [number, number, number, number];
  answers: (string | null)[];
  onChange: (t: [number, number, number, number]) => void;
  onClose: () => void;
}) {
  const total = tally.reduce((a, b) => a + b, 0);
  const labels = ["A", "B", "C", "D"];
  const colors = ["bg-blue-600", "bg-orange-500", "bg-green-600", "bg-purple-600"];

  function adjust(i: number, delta: number) {
    const next = [...tally] as [number, number, number, number];
    next[i] = Math.max(0, next[i] + delta);
    onChange(next);
  }

  return (
    <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
      <div className="bg-[#0d1340] border border-blue-700 rounded-2xl p-6 w-96 shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-bold text-white text-lg">👥 Ask the Audience</h3>
          <button onClick={onClose} className="text-blue-400 hover:text-white">
            <X size={20} />
          </button>
        </div>

        <p className="text-blue-400 text-xs mb-4">Count raised hands and tap +/− for each option</p>

        <div className="space-y-3">
          {labels.map((l, i) => {
            if (answers[i] === null) return null;
            const pct = total > 0 ? Math.round((tally[i] / total) * 100) : 0;
            return (
              <div key={i} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-white font-medium">{l}: {answers[i]}</span>
                  <div className="flex items-center gap-2">
                    <button onClick={() => adjust(i, -1)} className="w-7 h-7 rounded bg-blue-900 text-white hover:bg-blue-700 font-bold">−</button>
                    <span className="w-8 text-center text-yellow-300 font-bold">{tally[i]}</span>
                    <button onClick={() => adjust(i, 1)} className="w-7 h-7 rounded bg-blue-900 text-white hover:bg-blue-700 font-bold">+</button>
                  </div>
                </div>
                <div className="h-5 bg-blue-950 rounded overflow-hidden">
                  <div
                    className={`h-full ${colors[i]} transition-all duration-300 flex items-center justify-end pr-2`}
                    style={{ width: `${pct}%` }}
                  >
                    {pct > 10 && <span className="text-white text-xs font-bold">{pct}%</span>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <button onClick={onClose} className="mt-5 w-full py-2.5 rounded-xl bg-yellow-400 text-gray-900 font-bold text-sm hover:bg-yellow-300 transition">
          Done
        </button>
      </div>
    </div>
  );
}
