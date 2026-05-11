"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";

export default function PhoneTimer({ active, onClose }: { active: boolean; onClose: () => void }) {
  const [seconds, setSeconds] = useState(30);

  useEffect(() => {
    if (!active) return;
    setSeconds(30);
    const id = setInterval(() => {
      setSeconds((s) => {
        if (s <= 1) { clearInterval(id); onClose(); return 0; }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  const pct = (seconds / 30) * 100;
  const color = seconds > 10 ? "#4ade80" : seconds > 5 ? "#facc15" : "#f87171";

  return (
    <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
      <div className="bg-[#0d1340] border border-blue-700 rounded-2xl p-8 w-72 text-center shadow-2xl">
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-bold text-white text-lg">📞 Phone a Friend</h3>
          <button onClick={onClose} className="text-blue-400 hover:text-white"><X size={20} /></button>
        </div>

        {/* Circle timer */}
        <div className="relative w-32 h-32 mx-auto mb-4">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
            <circle cx="60" cy="60" r="54" fill="none" stroke="#0d1a60" strokeWidth="10" />
            <circle
              cx="60" cy="60" r="54" fill="none"
              stroke={color} strokeWidth="10"
              strokeDasharray={`${2 * Math.PI * 54}`}
              strokeDashoffset={`${2 * Math.PI * 54 * (1 - pct / 100)}`}
              strokeLinecap="round"
              style={{ transition: "stroke-dashoffset 1s linear, stroke 0.5s" }}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-4xl font-bold" style={{ color }}>{seconds}</span>
          </div>
        </div>

        <p className="text-blue-400 text-sm">Your friend has {seconds} seconds!</p>

        <button onClick={onClose} className="mt-5 w-full py-2.5 rounded-xl bg-yellow-400 text-gray-900 font-bold text-sm hover:bg-yellow-300 transition">
          End Call
        </button>
      </div>
    </div>
  );
}
