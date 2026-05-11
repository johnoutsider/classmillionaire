import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { games, questions, students, playSessions } from "@/lib/db/schema";
import { eq, and, inArray, isNull } from "drizzle-orm";
import { notFound } from "next/navigation";
import GameStage, { type Pace } from "./GameStage";

const PACES: Pace[] = ["fast", "normal", "slow", "showtime"];

export default async function PlayPage({
  params,
  searchParams,
}: {
  params: Promise<{ gameId: string }>;
  searchParams: Promise<{ pace?: string }>;
}) {
  const { gameId } = await params;
  const { pace: paceParam } = await searchParams;
  const pace: Pace = PACES.includes(paceParam as Pace) ? (paceParam as Pace) : "showtime";
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

  // Load session context if this game belongs to an active session
  let sessionInfo: {
    id: string;
    usedQuestionIds: string[];
    students: { id: string; name: string }[];
    studentsPlayedIds: string[];
  } | null = null;

  if (game.sessionId) {
    const session = await db.query.playSessions.findFirst({
      where: and(eq(playSessions.id, game.sessionId), eq(playSessions.teacherId, user.id)),
    });

    if (session && !session.endedAt) {
      // All games in this session → union of questionPlans → session-wide used IDs
      const sessionGames = await db
        .select({ questionPlan: games.questionPlan, studentId: games.studentId })
        .from(games)
        .where(and(eq(games.sessionId, game.sessionId), eq(games.teacherId, user.id)));

      const usedQuestionIds = sessionGames.flatMap((g) => (g.questionPlan as string[]) ?? []);
      const studentsPlayedIds = sessionGames
        .map((g) => g.studentId)
        .filter(Boolean) as string[];

      // All active students for the teacher (for the "Next student" picker)
      const teacherStudents = await db
        .select({ id: students.id, name: students.name })
        .from(students)
        .where(and(eq(students.teacherId, user.id), isNull(students.archivedAt)))
        .orderBy(students.name);

      sessionInfo = {
        id: game.sessionId,
        usedQuestionIds,
        students: teacherStudents,
        studentsPlayedIds,
      };
    }
  }

  return (
    <GameStage
      gameId={gameId}
      setId={game.setId ?? ""}
      studentName={studentRow?.name ?? null}
      pace={pace}
      ladder={ladder}
      questions={planQuestions.map((q) => ({
        id: q.id,
        prompt: q.prompt,
        answers: q.answers as string[],
        correctIndex: q.correctIndex,
        difficulty: q.difficulty,
        explanation: q.explanation ?? null,
      }))}
      session={sessionInfo}
    />
  );
}
