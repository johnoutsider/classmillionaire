import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { students, games } from "@/lib/db/schema";
import { eq, isNull, count, desc, and } from "drizzle-orm";
import StudentRoster from "@/components/students/StudentRoster";

export default async function StudentsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const activeStudents = await db
    .select({
      id: students.id,
      name: students.name,
      notes: students.notes,
      createdAt: students.createdAt,
      gameCount: count(games.id),
    })
    .from(students)
    .leftJoin(games, eq(games.studentId, students.id))
    .where(and(eq(students.teacherId, user.id), isNull(students.archivedAt)))
    .groupBy(students.id)
    .orderBy(students.name);

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Students</h1>
        <p className="text-blue-400 text-sm mt-1">
          {activeStudents.length} active student{activeStudents.length !== 1 ? "s" : ""}
        </p>
      </div>
      <StudentRoster initialStudents={activeStudents} />
    </div>
  );
}
