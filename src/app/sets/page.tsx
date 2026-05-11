import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { questionSets, questions, students } from "@/lib/db/schema";
import { eq, desc, count, isNull, and } from "drizzle-orm";
import Link from "next/link";
import { Plus, BookOpen } from "lucide-react";
import SetsListClient from "@/components/sets/SetsListClient";

export default async function SetsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const [sets, studentList] = await Promise.all([
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
      .orderBy(desc(questionSets.updatedAt)),
    db
      .select({ id: students.id, name: students.name })
      .from(students)
      .where(and(eq(students.teacherId, user.id), isNull(students.archivedAt)))
      .orderBy(students.name),
  ]);

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Question Sets</h1>
          <p className="text-blue-400 text-sm mt-1">{sets.length} set{sets.length !== 1 ? "s" : ""}</p>
        </div>
        <Link
          href="/sets/new"
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-yellow-400 text-gray-900 text-sm font-bold hover:bg-yellow-300 transition"
        >
          <Plus size={16} /> New Set
        </Link>
      </div>

      {sets.length === 0 ? (
        <div className="bg-millionaire-mid border border-blue-900 border-dashed rounded-xl px-6 py-16 text-center">
          <BookOpen size={40} className="mx-auto text-blue-700 mb-4" />
          <p className="text-blue-400 mb-3">No question sets yet.</p>
          <Link href="/sets/new" className="text-yellow-400 text-sm hover:underline font-medium">
            Create your first set →
          </Link>
        </div>
      ) : (
        <SetsListClient sets={sets} students={studentList} />
      )}
    </div>
  );
}
