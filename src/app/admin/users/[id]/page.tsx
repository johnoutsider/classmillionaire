import { db } from "@/lib/db";
import { teachers, students, questionSets, questions, games } from "@/lib/db/schema";
import { eq, count, desc } from "drizzle-orm";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Trophy, XCircle, LogOut, Minus } from "lucide-react";

export default async function AdminUserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const teacher = await db.query.teachers.findFirst({
    where: eq(teachers.id, id),
  });
  if (!teacher) notFound();

  const [studentRows, setRows, gameRows, totals] = await Promise.all([
    db
      .select({
        id: students.id,
        name: students.name,
        notes: students.notes,
        archivedAt: students.archivedAt,
        createdAt: students.createdAt,
      })
      .from(students)
      .where(eq(students.teacherId, id))
      .orderBy(students.name),

    db
      .select({
        id: questionSets.id,
        name: questionSets.name,
        description: questionSets.description,
        updatedAt: questionSets.updatedAt,
        questionCount: count(questions.id),
      })
      .from(questionSets)
      .leftJoin(questions, eq(questions.setId, questionSets.id))
      .where(eq(questionSets.teacherId, id))
      .groupBy(questionSets.id)
      .orderBy(desc(questionSets.updatedAt)),

    db
      .select({
        id: games.id,
        outcome: games.outcome,
        finalPrize: games.finalPrize,
        ladderLength: games.ladderLength,
        startedAt: games.startedAt,
        studentName: students.name,
        setName: questionSets.name,
      })
      .from(games)
      .leftJoin(students, eq(students.id, games.studentId))
      .leftJoin(questionSets, eq(questionSets.id, games.setId))
      .where(eq(games.teacherId, id))
      .orderBy(desc(games.startedAt))
      .limit(50),

    db
      .select({
        gamesTotal: count(games.id),
      })
      .from(games)
      .where(eq(games.teacherId, id)),
  ]);

  const activeStudents = studentRows.filter((s) => !s.archivedAt).length;
  const wins = gameRows.filter((g) => g.outcome === "won_top").length;

  return (
    <div className="space-y-10">
      {/* Breadcrumb */}
      <Link
        href="/admin/users"
        className="inline-flex items-center gap-2 text-sm text-blue-400 hover:text-yellow-300 transition"
      >
        <ArrowLeft size={14} /> All users
      </Link>

      <header>
        <h1 className="text-2xl font-bold text-white">{teacher.email}</h1>
        <p className="text-blue-400 text-sm mt-1">
          Joined {fmtDate(teacher.createdAt)}
          {teacher.name ? ` · ${teacher.name}` : ""}
        </p>
      </header>

      {/* Mini stats */}
      <div className="grid grid-cols-4 gap-3">
        <Stat label="Active Students" value={activeStudents} />
        <Stat label="Question Sets" value={setRows.length} />
        <Stat label="Games Played" value={totals[0].gamesTotal} />
        <Stat label="Wins" value={wins} gold />
      </div>

      {/* Question sets */}
      <section>
        <h2 className="text-xs font-semibold text-blue-400 uppercase tracking-widest mb-3">
          Question Sets
        </h2>
        {setRows.length === 0 ? (
          <p className="text-sm text-blue-500">No question sets.</p>
        ) : (
          <div className="bg-millionaire-mid border border-blue-900 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-blue-900 text-blue-400 text-xs uppercase tracking-wider">
                  <th className="text-left px-5 py-3">Name</th>
                  <th className="text-center px-4 py-3">Questions</th>
                  <th className="text-right px-5 py-3">Updated</th>
                </tr>
              </thead>
              <tbody>
                {setRows.map((s) => (
                  <tr key={s.id} className="border-b border-blue-900/50 last:border-0">
                    <td className="px-5 py-3 text-white">{s.name}</td>
                    <td className="px-4 py-3 text-center text-blue-200">{s.questionCount}</td>
                    <td className="px-5 py-3 text-right text-blue-300 text-xs">
                      {fmtDate(s.updatedAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Students */}
      <section>
        <h2 className="text-xs font-semibold text-blue-400 uppercase tracking-widest mb-3">
          Students <span className="text-blue-600">({studentRows.length})</span>
        </h2>
        {studentRows.length === 0 ? (
          <p className="text-sm text-blue-500">No students.</p>
        ) : (
          <div className="bg-millionaire-mid border border-blue-900 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <tbody>
                {studentRows.map((s) => (
                  <tr key={s.id} className="border-b border-blue-900/50 last:border-0">
                    <td className="px-5 py-3 text-white">
                      {s.name}
                      {s.archivedAt && (
                        <span className="ml-2 text-xs text-blue-600">(archived)</span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-right text-blue-300 text-xs">
                      {fmtDate(s.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Games */}
      <section>
        <h2 className="text-xs font-semibold text-blue-400 uppercase tracking-widest mb-3">
          Recent Games <span className="text-blue-600">(last 50)</span>
        </h2>
        {gameRows.length === 0 ? (
          <p className="text-sm text-blue-500">No games played.</p>
        ) : (
          <div className="bg-millionaire-mid border border-blue-900 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-blue-900 text-blue-400 text-xs uppercase tracking-wider">
                  <th className="text-left px-5 py-3">When</th>
                  <th className="text-left px-4 py-3">Student</th>
                  <th className="text-left px-4 py-3">Set</th>
                  <th className="text-center px-4 py-3">Outcome</th>
                  <th className="text-right px-5 py-3">Prize</th>
                </tr>
              </thead>
              <tbody>
                {gameRows.map((g) => (
                  <tr key={g.id} className="border-b border-blue-900/50 last:border-0">
                    <td className="px-5 py-3 text-blue-300 whitespace-nowrap text-xs">
                      {fmtDate(g.startedAt)}
                    </td>
                    <td className="px-4 py-3 text-white">
                      {g.studentName ?? <span className="italic text-blue-500">Anonymous</span>}
                    </td>
                    <td className="px-4 py-3 text-blue-200">
                      {g.setName ?? <span className="italic text-blue-500">Deleted</span>}
                    </td>
                    <td className={`px-4 py-3 text-center ${outcomeColor(g.outcome)}`}>
                      <OutcomeIcon outcome={g.outcome} />
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

function Stat({ label, value, gold }: { label: string; value: number; gold?: boolean }) {
  return (
    <div className="bg-millionaire-mid border border-blue-900 rounded-xl px-4 py-3">
      <p className={`text-2xl font-bold ${gold ? "text-yellow-400" : "text-white"}`}>{value}</p>
      <p className="text-xs text-blue-400 mt-0.5">{label}</p>
    </div>
  );
}

function fmtDate(d: Date | null) {
  if (!d) return "—";
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
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

function OutcomeIcon({ outcome }: { outcome: string }) {
  if (outcome === "won_top") return <Trophy size={12} className="inline mr-1" />;
  if (outcome === "wrong_answer") return <XCircle size={12} className="inline mr-1" />;
  if (outcome === "walked_away") return <LogOut size={12} className="inline mr-1" />;
  return <Minus size={12} className="inline mr-1" />;
}
