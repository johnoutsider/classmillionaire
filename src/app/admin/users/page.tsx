import { db } from "@/lib/db";
import { teachers } from "@/lib/db/schema";
import { desc, sql } from "drizzle-orm";
import Link from "next/link";

// One row per teacher with aggregate counts. We use correlated sub-selects with
// FULLY QUALIFIED column names (e.g. "questions"."teacher_id") — if we wrote
// just "teacher_id" inside the sub-select, Postgres would resolve it against
// the outer "teachers" table (which has no teacher_id) and throw.
export default async function AdminUsersPage() {
  const rows = await db
    .select({
      id: teachers.id,
      email: teachers.email,
      createdAt: teachers.createdAt,
      studentCount: sql<number>`(
        SELECT COUNT(*)::int FROM "students"
        WHERE "students"."teacher_id" = ${teachers.id}
          AND "students"."archived_at" IS NULL
      )`,
      setCount: sql<number>`(
        SELECT COUNT(*)::int FROM "question_sets"
        WHERE "question_sets"."teacher_id" = ${teachers.id}
      )`,
      questionCount: sql<number>`(
        SELECT COUNT(*)::int FROM "questions"
        WHERE "questions"."teacher_id" = ${teachers.id}
      )`,
      gameCount: sql<number>`(
        SELECT COUNT(*)::int FROM "games"
        WHERE "games"."teacher_id" = ${teachers.id}
      )`,
      lastGameAt: sql<Date | null>`(
        SELECT MAX("games"."started_at") FROM "games"
        WHERE "games"."teacher_id" = ${teachers.id}
      )`,
    })
    .from(teachers)
    .orderBy(desc(teachers.createdAt));

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-white">Users</h1>
        <p className="text-blue-400 text-sm mt-1">
          {rows.length} teacher{rows.length !== 1 ? "s" : ""}
        </p>
      </header>

      {rows.length === 0 ? (
        <p className="text-sm text-blue-500">No teachers have signed up yet.</p>
      ) : (
        <div className="bg-millionaire-mid border border-blue-900 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-blue-900 text-blue-400 text-xs uppercase tracking-wider">
                <th className="text-left px-5 py-3">Email</th>
                <th className="text-center px-3 py-3">Joined</th>
                <th className="text-center px-3 py-3">Students</th>
                <th className="text-center px-3 py-3">Sets</th>
                <th className="text-center px-3 py-3">Questions</th>
                <th className="text-center px-3 py-3">Games</th>
                <th className="text-right px-5 py-3">Last Game</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((t) => (
                <tr key={t.id} className="border-b border-blue-900/50 last:border-0 hover:bg-blue-950/30 transition">
                  <td className="px-5 py-3">
                    <Link
                      href={`/admin/users/${t.id}`}
                      className="text-white hover:text-yellow-300 font-medium transition"
                    >
                      {t.email}
                    </Link>
                  </td>
                  <td className="px-3 py-3 text-center text-blue-300 text-xs whitespace-nowrap">
                    {fmtDate(t.createdAt)}
                  </td>
                  <td className="px-3 py-3 text-center text-blue-200">{t.studentCount}</td>
                  <td className="px-3 py-3 text-center text-blue-200">{t.setCount}</td>
                  <td className="px-3 py-3 text-center text-blue-200">{t.questionCount}</td>
                  <td className="px-3 py-3 text-center text-white font-semibold">{t.gameCount}</td>
                  <td className="px-5 py-3 text-right text-blue-300 text-xs whitespace-nowrap">
                    {t.lastGameAt ? fmtDate(t.lastGameAt) : <span className="text-blue-600">—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
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
