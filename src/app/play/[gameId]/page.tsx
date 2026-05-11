import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { games, questions, students } from "@/lib/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { notFound } from "next/navigation";
import { buildLadder } from "@/lib/game/ladder";
import GameStage from "./GameStage";

export default async function PlayPage({ params }: { params: Promise<{ gameId: string }> }) {
  const { gameId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const game = await db.query.games.findFirst({
    where: and(eq(games.id, gameId), eq(games.teacherId, user.id)),
  });
  if (!game || !game.questionPlan?.length) notFound();

  const [orderedQuestions, studentRow] = await Promise.all([
    db
      .select()
      .from(questions)
      .where(
        and(
          inArray(questions.id, game.questionPlan),
          eq(questions.teacherId, user.id),
        ),
      ),
    game.studentId
      ? db.query.students.findFirst({
          where: and(eq(students.id, game.studentId), eq(students.teacherId, user.id)),
        })
      : Promise.resolve(null),
  ]);

  // Re-order questions to match plan order
  const qMap = new Map(orderedQuestions.map((q) => [q.id, q]));
  const planQuestions = game.questionPlan
    .map((id) => qMap.get(id))
    .filter(Boolean) as typeof orderedQuestions;

  const ladder = game.prizeLadder as { rung: number; prize: string; prizeValue: number; isSafetyNet: boolean }[];

  return (
    <GameStage
      gameId={gameId}
      setId={game.setId ?? ""}
      studentName={studentRow?.name ?? null}
      ladder={ladder}
      questions={planQuestions.map((q) => ({
        id: q.id,
        prompt: q.prompt,
        answers: q.answers as string[],
        correctIndex: q.correctIndex,
        difficulty: q.difficulty,
        explanation: q.explanation ?? null,
      }))}
    />
  );
}
