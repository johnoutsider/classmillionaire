import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { questionSets, questions, students } from "@/lib/db/schema";
import { eq, and, asc, isNull, count } from "drizzle-orm";
import { notFound } from "next/navigation";
import QuestionBuilder from "@/components/builder/QuestionBuilder";
import SetHeader from "@/components/builder/SetHeader";
import SetPlayButton from "@/components/builder/SetPlayButton";

export default async function SetPage({ params }: { params: Promise<{ setId: string }> }) {
  const { setId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const [set, qs, studentList] = await Promise.all([
    db.query.questionSets.findFirst({
      where: and(eq(questionSets.id, setId), eq(questionSets.teacherId, user.id)),
    }),
    db.select().from(questions).where(eq(questions.setId, setId)).orderBy(asc(questions.difficulty), asc(questions.createdAt)),
    db.select({ id: students.id, name: students.name })
      .from(students)
      .where(and(eq(students.teacherId, user.id), isNull(students.archivedAt)))
      .orderBy(students.name),
  ]);

  if (!set) notFound();

  return (
    <div className="p-8">
      <div className="flex items-start justify-between gap-4 mb-2">
        <SetHeader set={set} />
        <SetPlayButton
          setId={setId}
          setName={set.name}
          questionCount={qs.length}
          defaultLength={set.defaultLengthHint ?? 10}
          students={studentList}
        />
      </div>
      <QuestionBuilder setId={setId} initialQuestions={qs} />
    </div>
  );
}
