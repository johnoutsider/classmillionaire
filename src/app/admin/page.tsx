import { db } from "@/lib/db";
import { teachers, students, questionSets, questions, games } from "@/lib/db/schema";
import { count, desc, eq, isNull, sql } from "drizzle-orm";
import Link from "next/link";
import { Users, BookOpen, FileQuestion, PlayCircle, Trophy } from "lucide-react";

// Admin layout has already gated this route. These queries intentionally have
// NO teacher_id filter — that's the whole point of admin.
export default async function AdminOverviewPage() {
  const [
    teacherCount,
    studentCount,
    setCount,
    questionCount,
    gameCount,
    finishedGameCount,
    wonGameCount,
    recentTeachers,
    recentGames,
  ] = await Promise.all([
    db.select({ c: count() }).from(teachers),
    db.select({ c: count() }).from(students).where(isNull(students.archivedAt)),
    db.select({ c: count() }).from(questionSets),
    db.select({ c: count() }).from(questions),
    db.select({ c: count() }).from(games),
    db
      .select({ c: count() })
      .from(games)
      .where(sql`${games.outcome} != 'in_progress'`),
    db.select({ c: count() }).from(games).where(eq(games.outcome, "won_top")),
    db
      .select({
        id: teachers.id,
        email: teachers.email,
        createdAt: teachers.createdAt,
      })
      .from(teachers)
      .orderBy(desc(teachers.createdAt))
      .limit(8),
    db
      .select({
        id: games.id,
        outcome: games.outcome,
        finalPrize: games.finalPrize,
        startedAt: games.startedAt,
        teacherEmail: teachers.email,
      })
      .from(games)
      .leftJoin(teachers, eq(teachers.id, games.teacherId))
      .orderBy(desc(games.startedAt))
      .limit(10),
  ]);

  const stats = [
    { label: "Teachers", value: teacherCount[0].c, icon: Users },
    { label: "Active Students", value: studentCount[0].c, icon: Users },
    { label: "Question Sets", value: setCount[0].c, icon: BookOpen },
    { label: "Questions", value: questionCount[0].c, icon: FileQuestion },
    { label: "Games Played", value: gameCount[0].c, icon: PlayCircle },
    { label: "Wins", value: wonGameCount[0].c, icon: Trophy, gold: true },
  ];

  return (
    <div className="space-y-10">
      <header>
        <h1 className="text-2xl font-bold text-white">Overview</h1>
        <p className="text-blue-400 text-sm mt-1">Platform-wide activity</p>
      </header>

      {/* Top stat tiles */}
      <div className="grid grid-cols-3 gap-3">
        {stats.map((s) => (
          <div
            key={s.label}
            className="bg-millionaire-mid border border-blue-900 rounded-xl px-5 py-4 flex items-center gap-4"
          >
            <s.icon size={18} className={s.gold ? "text-yellow-400" : "text-blue-500"} />
            <div>
              <p className={`text-2xl font-bold ${s.gold ? "text-yellow-400" : "text-white"}`}>
                {s.value}
              </p>
              <p className="text-xs text-blue-400">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      <p className="text-xs text-blue-500">
        Finished games: {finishedGameCount[0].c} / {gameCount[0].c}
      </p>

      {/* Recent signups */}
      <section>
        <h2 className="text-xs font-semibold text-blue-400 uppercase tracking-widest mb-3">
          Recent Signups
        </h2>
        {recentTeachers.length === 0 ? (
          <p className="text-sm text-blue-500">No teachers yet.</p>
        ) : (
          <div className="bg-millionaire-mid border border-blue-900 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <tbody>
                {recentTeachers.map((t) => (
                  <tr key={t.id} className="border-b border-blue-900/50 last:border-0">
                    <td className="px-5 py-3">
                      <Link
                        href={`/admin/users/${t.id}`}
                        className="text-white hover:text-yellow-300 transition"
                      >
                        {t.email}
                      </Link>
                    </td>
                    <td className="px-5 py-3 text-right text-blue-400 text-xs">
                      {fmtDate(t.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Recent games */}
      <section>
        <h2 className="text-xs font-semibold text-blue-400 uppercase tracking-widest mb-3">
          Recent Games
        </h2>
        {recentGames.length === 0 ? (
          <p className="text-sm text-blue-500">No games yet.</p>
        ) : (
          <div className="bg-millionaire-mid border border-blue-900 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-blue-900 text-blue-400 text-xs uppercase tracking-wider">
                  <th className="text-left px-5 py-3">When</th>
                  <th className="text-left px-4 py-3">Teacher</th>
                  <th className="text-center px-4 py-3">Outcome</th>
                  <th className="text-right px-5 py-3">Prize</th>
                </tr>
              </thead>
              <tbody>
                {recentGames.map((g) => (
                  <tr key={g.id} className="border-b border-blue-900/50 last:border-0">
                    <td className="px-5 py-3 text-blue-300 whitespace-nowrap">
                      {fmtDate(g.startedAt)}
                    </td>
                    <td className="px-4 py-3 text-white">{g.teacherEmail ?? "—"}</td>
                    <td className={`px-4 py-3 text-center ${outcomeColor(g.outcome)}`}>
                      {outcomeLabel(g.outcome)}
                    </td>
                    <td className="px-5 py-3 text-right text-white">{g.finalPrize ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function fmtDate(d: Date | null) {
  if (!d) return "—";
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(d));
}

function outcomeLabel(o: string) {
  if (o === "won_top") return "Won";
  if (o === "walked_away") return "Walked Away";
  if (o === "wrong_answer") return "Wrong";
  return "In Progress";
}

function outcomeColor(o: string) {
  if (o === "won_top") return "text-yellow-400";
  if (o === "wrong_answer") return "text-red-400";
  if (o === "walked_away") return "text-blue-300";
  return "text-blue-500";
}
