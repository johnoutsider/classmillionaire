"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { endSession, startNextGameInSession } from "@/lib/actions/games";
import { Users, PlayCircle } from "lucide-react";

type Props = {
  session: {
    id: string;
    setName: string | null;
    ladderLength: number;
    studentsPlayed: { id: string; name: string }[];
  };
  allStudents: { id: string; name: string }[];
};

export default function ActiveSessionBanner({ session, allStudents }: Props) {
  const router = useRouter();
  const playedIds = new Set(session.studentsPlayed.map((s) => s.id));
  const [nextStudentId, setNextStudentId] = useState(
    allStudents.find((s) => !playedIds.has(s.id))?.id ?? ""
  );
  const [launching, setLaunching] = useState(false);
  const [ending, setEnding] = useState(false);

  async function handleNext() {
    setLaunching(true);
    const result = await startNextGameInSession({
      sessionId: session.id,
      studentId: nextStudentId || null,
    });
    if (result.error || !result.gameId) {
      setLaunching(false);
      return;
    }
    router.push(`/play/${result.gameId}?pace=${result.pace}`);
  }

  async function handleEnd() {
    setEnding(true);
    await endSession(session.id);
    router.refresh();
  }

  return (
    <div className="mb-8 rounded-xl border border-yellow-500/40 bg-yellow-400/10 px-5 py-4">
      <div className="flex flex-wrap items-center gap-4">
        {/* Info */}
        <div className="flex-1 min-w-0">
          <p className="text-yellow-300 text-xs font-semibold uppercase tracking-widest mb-0.5">
            Class session active
          </p>
          <p className="text-white font-medium truncate">
            {session.setName ?? "Question set"}
            <span className="text-blue-400 font-normal ml-2 text-sm">
              · {session.studentsPlayed.length} student{session.studentsPlayed.length !== 1 ? "s" : ""} played
            </span>
          </p>
        </div>

        {/* Next student picker */}
        {allStudents.length > 0 && (
          <div className="flex items-center gap-2">
            <Users size={14} className="text-blue-400 shrink-0" />
            <select
              value={nextStudentId}
              onChange={(e) => setNextStudentId(e.target.value)}
              className="px-3 py-1.5 rounded-lg bg-blue-950 border border-blue-700 text-white text-sm focus:outline-none focus:border-yellow-400 transition"
            >
              <option value="">— No tracking —</option>
              {allStudents.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}{playedIds.has(s.id) ? " ✓" : ""}
                </option>
              ))}
            </select>
            <button
              onClick={handleNext}
              disabled={launching}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-yellow-400 text-gray-900 font-bold text-sm hover:bg-yellow-300 disabled:opacity-50 transition"
            >
              <PlayCircle size={15} />
              {launching ? "Starting…" : "Next student"}
            </button>
          </div>
        )}

        {/* End session */}
        <button
          onClick={handleEnd}
          disabled={ending}
          className="px-3 py-1.5 rounded-lg border border-blue-700 text-blue-400 text-sm hover:text-white hover:border-blue-500 disabled:opacity-50 transition"
        >
          {ending ? "Ending…" : "End session"}
        </button>
      </div>
    </div>
  );
}
