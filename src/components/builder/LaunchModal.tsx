"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createGame, startSession } from "@/lib/actions/games";
import { toast } from "sonner";
import { X, PlayCircle, User, Trophy, Timer } from "lucide-react";
import { cn } from "@/lib/utils";

type Student = { id: string; name: string };

export default function LaunchModal({
  setId,
  setName,
  questionCount,
  defaultLength,
  students,
  onClose,
}: {
  setId: string;
  setName: string;
  questionCount: number;
  defaultLength: number;
  students: Student[];
  onClose: () => void;
}) {
  const router = useRouter();
  const [studentId, setStudentId] = useState<string>(students[0]?.id ?? "");
  const [length, setLength] = useState(Math.min(defaultLength, questionCount));
  const [currency, setCurrency] = useState("$");
  const [pace, setPace] = useState<"fast" | "normal" | "slow" | "showtime">("showtime");
  const [launching, setLaunching] = useState(false);

  const maxLength = questionCount;
  const customCurrencies = ["$", "€", "£", "so'm", "pts", "stars", "coins"];
  const paceOptions: { id: typeof pace; label: string; hint: string }[] = [
    { id: "fast",     label: "Fast",     hint: "0.6s · classroom pace" },
    { id: "normal",   label: "Normal",   hint: "1.1s · brisk" },
    { id: "slow",     label: "Slow",     hint: "1.5s · suspenseful" },
    { id: "showtime", label: "Showtime", hint: "2.0s · TV-show feel" },
  ];

  async function launch() {
    if (length < 1) { toast.error("Pick at least 1 question"); return; }
    setLaunching(true);

    const sessionResult = await startSession({
      setId,
      ladderLength: length,
      currencyLabel: currency,
      pace,
    });
    if (sessionResult.error) {
      toast.error(sessionResult.error);
      setLaunching(false);
      return;
    }

    const result = await createGame({
      setId,
      studentId: studentId || null,
      ladderLength: length,
      currencyLabel: currency,
      sessionId: sessionResult.sessionId,
    });
    if (result.error) {
      toast.error(result.error);
      setLaunching(false);
      return;
    }
    router.push(`/play/${result.gameId}?pace=${pace}`);
  }

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-[#0d1340] border border-blue-700 rounded-2xl w-full max-w-md shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-blue-800">
          <div>
            <h2 className="font-bold text-white text-lg">Launch Game</h2>
            <p className="text-blue-400 text-xs mt-0.5">{setName}</p>
          </div>
          <button onClick={onClose} className="text-blue-400 hover:text-white transition">
            <X size={20} />
          </button>
        </div>

        <div className="px-6 py-5 space-y-5">
          {/* Student */}
          <div>
            <label className="flex items-center gap-2 text-sm text-blue-300 mb-2">
              <User size={14} /> Student in the hot seat
            </label>
            {students.length === 0 ? (
              <p className="text-xs text-yellow-400">
                No students added yet — game will run without tracking. Add students in the Students tab.
              </p>
            ) : (
              <select
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg bg-blue-950 border border-blue-700 text-white text-sm focus:outline-none focus:border-yellow-400 transition"
              >
                <option value="">— No tracking —</option>
                {students.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            )}
          </div>

          {/* Ladder length */}
          <div>
            <label className="flex items-center justify-between text-sm text-blue-300 mb-2">
              <span className="flex items-center gap-2"><Trophy size={14} /> Number of questions</span>
              <span className="text-yellow-400 font-bold text-lg">{length}</span>
            </label>
            <input
              type="range"
              min={1}
              max={maxLength}
              value={length}
              onChange={(e) => setLength(Number(e.target.value))}
              className="w-full accent-yellow-400"
            />
            <div className="flex justify-between text-xs text-blue-600 mt-1">
              <span>1</span>
              <span>{maxLength} available</span>
            </div>
          </div>

          {/* Currency / prize label */}
          <div>
            <label className="block text-sm text-blue-300 mb-2">Prize label</label>
            <div className="flex flex-wrap gap-2">
              {customCurrencies.map((c) => (
                <button
                  key={c}
                  onClick={() => setCurrency(c)}
                  className={cn(
                    "px-3 py-1.5 rounded-lg border text-sm font-medium transition",
                    currency === c
                      ? "bg-yellow-400 border-yellow-400 text-gray-900"
                      : "border-blue-700 text-blue-300 hover:bg-blue-900/50"
                  )}
                >
                  {c}
                </button>
              ))}
            </div>
            <input
              value={customCurrencies.includes(currency) ? "" : currency}
              onChange={(e) => e.target.value && setCurrency(e.target.value)}
              placeholder="or type custom…"
              className="mt-2 w-full px-3 py-2 rounded-lg bg-blue-950 border border-blue-700 text-white text-sm focus:outline-none focus:border-yellow-400 transition"
            />
          </div>

          {/* Answer reveal pacing */}
          <div>
            <label className="flex items-center gap-2 text-sm text-blue-300 mb-2">
              <Timer size={14} /> Answer reveal pacing
            </label>
            <div className="grid grid-cols-2 gap-2">
              {paceOptions.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setPace(p.id)}
                  className={cn(
                    "flex flex-col items-start px-3 py-2 rounded-lg border text-left transition",
                    pace === p.id
                      ? "bg-yellow-400 border-yellow-400 text-gray-900"
                      : "border-blue-700 text-blue-300 hover:bg-blue-900/50"
                  )}
                >
                  <span className="text-sm font-semibold">{p.label}</span>
                  <span className={cn(
                    "text-[11px]",
                    pace === p.id ? "text-gray-800" : "text-blue-500"
                  )}>{p.hint}</span>
                </button>
              ))}
            </div>
            <p className="mt-1.5 text-[11px] text-blue-500">
              Time between each option (A → B → C → D) appearing on the board.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-blue-800 flex gap-3 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-lg border border-blue-700 text-blue-300 text-sm hover:bg-blue-900/50 transition"
          >
            Cancel
          </button>
          <button
            onClick={launch}
            disabled={launching || length < 1}
            className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-yellow-400 text-gray-900 font-bold text-sm hover:bg-yellow-300 disabled:opacity-50 transition"
          >
            <PlayCircle size={18} />
            {launching ? "Starting…" : "Play!"}
          </button>
        </div>
      </div>
    </div>
  );
}
