import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { questionSets, questions, students, games } from "@/lib/db/schema";
import { eq, desc, count, isNull, and } from "drizzle-orm";
import Link from "next/link";
import { BookOpen, Users, PlayCircle, Plus } from "lucide-react";
import RecentSetsClient from "@/components/dashboard/RecentSetsClient";
import ActiveSessionBanner from "@/components/dashboard/ActiveSessionBanner";
import { getActiveSession } from "@/lib/actions/games";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const [sets, studentList, studentCount, recentGames, activeSession] = await Promise.all([
    db
      .select({
        id: questionSets.id,
        name: questionSets.name,
        description: questionSets.description,
        updatedAt: questionSets.updatedAt,
        defaultLengthHint: questionSets.defaultLengthHint,
        questionCount: count(questions.id),
      })
      .from(questionSets)
      .leftJoin(questions, eq(questions.setId, questionSets.id))
      .where(eq(questionSets.teacherId, user.id))
      .groupBy(questionSets.id)
      .orderBy(desc(questionSets.updatedAt))
      .limit(5),
    db.select({ id: students.id, name: students.name }).from(students).where(and(eq(students.teacherId, user.id), isNull(students.archivedAt))).orderBy(students.name),
    db.select({ count: count() }).from(students).where(eq(students.teacherId, user.id)),
    db.select().from(games).where(eq(games.teacherId, user.id)).orderBy(desc(games.startedAt)).limit(5),
    getActiveSession(),
  ]);

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-white mb-1">Dashboard</h1>
      <p className="text-blue-400 text-sm mb-8">Welcome back — ready to play?</p>

      {activeSession && (
        <ActiveSessionBanner
          session={activeSession}
          allStudents={studentList}
        />
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-10">
        <StatCard icon={<BookOpen size={20} />} label="Question Sets" value={sets.length.toString()} />
        <StatCard icon={<Users size={20} />} label="Students" value={(studentCount[0]?.count ?? 0).toString()} />
        <StatCard icon={<PlayCircle size={20} />} label="Games Played" value={recentGames.length.toString()} />
      </div>

      {/* Quick actions */}
      <div className="flex gap-3 mb-10">
        <Link
          href="/sets/new"
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-yellow-400 text-gray-900 text-sm font-bold hover:bg-yellow-300 transition"
        >
          <Plus size={16} /> New Question Set
        </Link>
        <Link
          href="/students"
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-blue-700 text-blue-200 text-sm font-medium hover:bg-blue-900/50 transition"
        >
          <Users size={16} /> Manage Students
        </Link>
      </div>

      {/* Recent sets */}
      <h2 className="text-sm font-semibold text-blue-400 uppercase tracking-widest mb-3">
        Recent Question Sets
      </h2>
      {sets.length === 0 ? (
        <EmptyState
          message="No question sets yet."
          action={{ href: "/sets/new", label: "Create your first set" }}
        />
      ) : (
        <RecentSetsClient sets={sets} students={studentList} />
      )}
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="bg-millionaire-mid border border-blue-900 rounded-xl px-5 py-4 flex items-center gap-4">
      <div className="text-yellow-400">{icon}</div>
      <div>
        <p className="text-2xl font-bold text-white">{value}</p>
        <p className="text-xs text-blue-400">{label}</p>
      </div>
    </div>
  );
}

function EmptyState({ message, action }: { message: string; action: { href: string; label: string } }) {
  return (
    <div className="bg-millionaire-mid border border-blue-900 border-dashed rounded-xl px-6 py-10 text-center">
      <p className="text-blue-400 mb-3">{message}</p>
      <Link href={action.href} className="text-yellow-400 text-sm hover:underline font-medium">
        {action.label} →
      </Link>
    </div>
  );
}
