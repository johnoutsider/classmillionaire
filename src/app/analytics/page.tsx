import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { games, students, questionSets } from "@/lib/db/schema";
import { eq, desc, and, count, isNull } from "drizzle-orm";
import { Trophy, XCircle, LogOut, Minus } from "lucide-react";

// ─── Data fetching ────────────────────────────────────────────────────────────

async function getAnalyticsData(teacherId: string) {
  // All finished games with student + set names
  const allGames = await db
    .select({
      id: games.id,
      outcome: games.outcome,
      finalPrize: games.finalPrize,
      ladderLength: games.ladderLength,
      startedAt: games.startedAt,
      endedAt: games.endedAt,
      studentId: games.studentId,
      studentName: students.name,
      setId: games.setId,
      setName: questionSets.name,
    })
    .from(games)
    .leftJoin(students, eq(students.id, games.studentId))
    .leftJoin(questionSets, eq(questionSets.id, games.setId))
    .where(and(eq(games.teacherId, teacherId)))
    .orderBy(desc(games.startedAt));

  return allGames;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

type GameRow = Awaited<ReturnType<typeof getAnalyticsData>>[number];

function outcomeLabel(outcome: string) {
  switch (outcome) {
    case "won_top": return "Won";
    case "walked_away": return "Walked Away";
    case "wrong_answer": return "Wrong Answer";
    case "in_progress": return "In Progress";
    default: return outcome;
  }
}

function OutcomeIcon({ outcome }: { outcome: string }) {
  if (outcome === "won_top")
    return <Trophy size={14} className="text-yellow-400 inline mr-1" />;
  if (outcome === "wrong_answer")
    return <XCircle size={14} className="text-red-400 inline mr-1" />;
  if (outcome === "walked_away")
    return <LogOut size={14} className="text-blue-300 inline mr-1" />;
  return <Minus size={14} className="text-blue-600 inline mr-1" />;
}

function outcomeTextColor(outcome: string) {
  if (outcome === "won_top") return "text-yellow-400";
  if (outcome === "wrong_answer") return "text-red-400";
  if (outcome === "walked_away") return "text-blue-300";
  return "text-blue-500";
}

function formatDate(d: Date | null) {
  if (!d) return "—";
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(d));
}

// ─── Per-student summary ──────────────────────────────────────────────────────

function buildStudentSummary(rows: GameRow[]) {
  const map = new Map<
    string,
    { name: string; played: number; won: number; walkedAway: number; wrong: number; inProgress: number }
  >();

  for (const g of rows) {
    const key = g.studentId ?? "__anonymous__";
    const name = g.studentName ?? "Anonymous";
    if (!map.has(key)) {
      map.set(key, { name, played: 0, won: 0, walkedAway: 0, wrong: 0, inProgress: 0 });
    }
    const s = map.get(key)!;
    s.played++;
    if (g.outcome === "won_top") s.won++;
    else if (g.outcome === "walked_away") s.walkedAway++;
    else if (g.outcome === "wrong_answer") s.wrong++;
    else s.inProgress++;
  }

  return [...map.values()].sort((a, b) => b.played - a.played);
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function AnalyticsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const allGames = await getAnalyticsData(user.id);

  if (allGames.length === 0) {
    return (
      <div className="p-8 flex flex-col items-center justify-center min-h-[60vh] text-center">
        <Trophy size={48} className="text-blue-700 mb-4" />
        <h1 className="text-2xl font-bold text-white mb-2">Analytics</h1>
        <p className="text-blue-400 max-w-sm">
          No games played yet. Launch a game from a question set to start collecting results.
        </p>
      </div>
    );
  }

  const finished = allGames.filter((g) => g.outcome !== "in_progress");
  const wins = finished.filter((g) => g.outcome === "won_top").length;
  const studentSummary = buildStudentSummary(allGames);

  return (
    <div className="p-8 space-y-10">
      <div>
        <h1 className="text-2xl font-bold text-white mb-1">Analytics</h1>
        <p className="text-blue-400 text-sm">Results across all your games</p>
      </div>

      {/* Top-level stats */}
      <div className="grid grid-cols-3 gap-4">
        <StatCard label="Games Played" value={allGames.length} />
        <StatCard label="Finished" value={finished.length} />
        <StatCard label="Top-prize Wins" value={wins} highlight />
      </div>

      {/* Per-student summary */}
      {studentSummary.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-blue-400 uppercase tracking-widest mb-3">
            Student Results
          </h2>
          <div className="bg-millionaire-mid border border-blue-900 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-blue-900 text-blue-400 text-xs uppercase tracking-wider">
                  <th className="text-left px-5 py-3">Student</th>
                  <th className="text-center px-4 py-3">Games</th>
                  <th className="text-center px-4 py-3">
                    <Trophy size={13} className="inline text-yellow-400 mr-1" />Won
                  </th>
                  <th className="text-center px-4 py-3">
                    <LogOut size={13} className="inline text-blue-300 mr-1" />Walked Away
                  </th>
                  <th className="text-center px-4 py-3">
                    <XCircle size={13} className="inline text-red-400 mr-1" />Wrong Answer
                  </th>
                </tr>
              </thead>
              <tbody>
                {studentSummary.map((s) => (
                  <tr key={s.name} className="border-b border-blue-900/50 last:border-0">
                    <td className="px-5 py-3 text-white font-medium">{s.name}</td>
                    <td className="px-4 py-3 text-center text-blue-200">{s.played}</td>
                    <td className="px-4 py-3 text-center text-yellow-400 font-semibold">{s.won}</td>
                    <td className="px-4 py-3 text-center text-blue-300">{s.walkedAway}</td>
                    <td className="px-4 py-3 text-center text-red-400">{s.wrong}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Game-by-game history */}
      <section>
        <h2 className="text-sm font-semibold text-blue-400 uppercase tracking-widest mb-3">
          Game History
        </h2>
        <div className="bg-millionaire-mid border border-blue-900 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-blue-900 text-blue-400 text-xs uppercase tracking-wider">
                <th className="text-left px-5 py-3">Date</th>
                <th className="text-left px-4 py-3">Student</th>
                <th className="text-left px-4 py-3">Question Set</th>
                <th className="text-center px-4 py-3">Outcome</th>
                <th className="text-right px-5 py-3">Final Prize</th>
              </tr>
            </thead>
            <tbody>
              {allGames.map((g) => (
                <tr key={g.id} className="border-b border-blue-900/50 last:border-0">
                  <td className="px-5 py-3 text-blue-300 whitespace-nowrap">
                    {formatDate(g.startedAt)}
                  </td>
                  <td className="px-4 py-3 text-white">
                    {g.studentName ?? <span className="text-blue-500 italic">Anonymous</span>}
                  </td>
                  <td className="px-4 py-3 text-blue-200">
                    {g.setName ?? <span className="text-blue-500 italic">Deleted set</span>}
                  </td>
                  <td className={`px-4 py-3 text-center font-medium ${outcomeTextColor(g.outcome)}`}>
                    <OutcomeIcon outcome={g.outcome} />
                    {outcomeLabel(g.outcome)}
                  </td>
                  <td className="px-5 py-3 text-right text-white font-medium">
                    {g.finalPrize ?? "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function StatCard({
  label,
  value,
  highlight,
}: {
  label: string;
  value: number;
  highlight?: boolean;
}) {
  return (
    <div className="bg-millionaire-mid border border-blue-900 rounded-xl px-5 py-4">
      <p className={`text-3xl font-bold ${highlight ? "text-yellow-400" : "text-white"}`}>
        {value}
      </p>
      <p className="text-xs text-blue-400 mt-1">{label}</p>
    </div>
  );
}
