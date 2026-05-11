"use server";

import { db } from "@/lib/db";
import { games, turns, questions, questionSets } from "@/lib/db/schema";
import { getTeacherId } from "@/lib/auth/getTeacherId";
import { eq, and, notInArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { buildLadder } from "@/lib/game/ladder";
import { pickQuestionsForLadder } from "@/lib/game/pickQuestions";

export async function createGame(data: {
  setId: string;
  studentId: string | null;
  ladderLength: number;
  currencyLabel: string;
}): Promise<{ gameId: string; error?: string }> {
  const teacherId = await getTeacherId();

  const set = await db.query.questionSets.findFirst({
    where: and(eq(questionSets.id, data.setId), eq(questionSets.teacherId, teacherId)),
  });
  if (!set) return { gameId: "", error: "Set not found" };

  const pool = await db
    .select()
    .from(questions)
    .where(and(eq(questions.setId, data.setId), eq(questions.teacherId, teacherId)));
  const picked = pickQuestionsForLadder(pool, data.ladderLength);
  if (!picked) return { gameId: "", error: "Not enough questions in this set for the chosen length." };

  const ladder = buildLadder(data.ladderLength, data.currencyLabel);

  const [game] = await db
    .insert(games)
    .values({
      teacherId,
      studentId: data.studentId ?? null,
      setId: data.setId,
      ladderLength: data.ladderLength,
      currencyLabel: data.currencyLabel,
      prizeLadder: ladder,
      questionPlan: picked.map((q) => q.id),
      outcome: "in_progress",
    })
    .returning();

  revalidatePath("/dashboard");
  return { gameId: game.id };
}

export async function saveTurn(data: {
  gameId: string;
  questionId: string;
  rungIndex: number;
  shownAnswers: (string | null)[];
  chosenIndex: number | null;
  isCorrect: boolean | null;
  lifelineUsed: "fifty_fifty" | "ask_audience" | "phone_friend" | "switch_question" | null;
  walkedAway: boolean;
  timeMs: number;
}) {
  const teacherId = await getTeacherId();
  const game = await db.query.games.findFirst({
    where: and(eq(games.id, data.gameId), eq(games.teacherId, teacherId)),
  });
  if (!game) throw new Error("Game not found");

  await db.insert(turns).values({
    gameId: data.gameId,
    questionId: data.questionId,
    rungIndex: data.rungIndex,
    shownAnswers: data.shownAnswers,
    chosenIndex: data.chosenIndex,
    isCorrect: data.isCorrect,
    lifelineUsed: data.lifelineUsed,
    walkedAway: data.walkedAway,
    timeMs: data.timeMs,
  });
}

export async function useLifeline(gameId: string, lifeline: string) {
  const teacherId = await getTeacherId();
  const game = await db.query.games.findFirst({
    where: and(eq(games.id, gameId), eq(games.teacherId, teacherId)),
  });
  if (!game) throw new Error("Game not found");

  const updated = [...(game.lifelinesUsed as string[]), lifeline];
  await db
    .update(games)
    .set({ lifelinesUsed: updated })
    .where(and(eq(games.id, gameId), eq(games.teacherId, teacherId)));
}

export async function endGame(data: {
  gameId: string;
  outcome: "won_top" | "walked_away" | "wrong_answer";
  finalPrize: string;
}) {
  const teacherId = await getTeacherId();
  await db
    .update(games)
    .set({ outcome: data.outcome, finalPrize: data.finalPrize, endedAt: new Date() })
    .where(and(eq(games.id, data.gameId), eq(games.teacherId, teacherId)));

  revalidatePath("/dashboard");
  revalidatePath("/analytics");
}

export async function getReplacementQuestion(
  setId: string,
  difficulty: number,
  excludeIds: string[]
): Promise<{ id: string; prompt: string; answers: string[]; correctIndex: number } | null> {
  const teacherId = await getTeacherId();

  const set = await db.query.questionSets.findFirst({
    where: and(eq(questionSets.id, setId), eq(questionSets.teacherId, teacherId)),
  });
  if (!set) return null;

  const candidates = await db
    .select()
    .from(questions)
    .where(
      excludeIds.length > 0
        ? and(
            eq(questions.setId, setId),
            eq(questions.teacherId, teacherId),
            notInArray(questions.id, excludeIds),
          )
        : and(eq(questions.setId, setId), eq(questions.teacherId, teacherId))
    );

  // Try exact difficulty first, then expand
  for (let spread = 0; spread <= 2; spread++) {
    for (const d of [difficulty - spread, difficulty + spread]) {
      const match = candidates.find((q) => q.difficulty === d);
      if (match) {
        return {
          id: match.id,
          prompt: match.prompt,
          answers: match.answers as string[],
          correctIndex: match.correctIndex,
        };
      }
    }
  }
  return null;
}
