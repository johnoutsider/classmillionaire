"use server";

import { db } from "@/lib/db";
import { games, turns, questions, questionSets, playSessions, students } from "@/lib/db/schema";
import { getTeacherId } from "@/lib/auth/getTeacherId";
import { eq, and, notInArray, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { buildLadder } from "@/lib/game/ladder";
import { pickQuestionsForLadder } from "@/lib/game/pickQuestions";

// ─── Session actions ──────────────────────────────────────────────────────────

export async function startSession(data: {
  setId: string;
  ladderLength: number;
  currencyLabel: string;
  pace: string;
}): Promise<{ sessionId: string; error?: string }> {
  const teacherId = await getTeacherId();

  const set = await db.query.questionSets.findFirst({
    where: and(eq(questionSets.id, data.setId), eq(questionSets.teacherId, teacherId)),
  });
  if (!set) return { sessionId: "", error: "Set not found" };

  const [session] = await db
    .insert(playSessions)
    .values({
      teacherId,
      setId: data.setId,
      ladderLength: data.ladderLength,
      currencyLabel: data.currencyLabel,
      pace: data.pace,
    })
    .returning();

  revalidatePath("/dashboard");
  return { sessionId: session.id };
}

export async function endSession(sessionId: string): Promise<void> {
  const teacherId = await getTeacherId();
  await db
    .update(playSessions)
    .set({ endedAt: new Date() })
    .where(and(eq(playSessions.id, sessionId), eq(playSessions.teacherId, teacherId)));

  revalidatePath("/dashboard");
}

/** Returns all question IDs already used across games in this session. */
export async function getSessionUsedQuestionIds(sessionId: string): Promise<string[]> {
  const teacherId = await getTeacherId();

  const sessionGames = await db
    .select({ questionPlan: games.questionPlan })
    .from(games)
    .where(and(eq(games.sessionId, sessionId), eq(games.teacherId, teacherId)));

  return sessionGames.flatMap((g) => (g.questionPlan as string[]) ?? []);
}

/** Returns student IDs that have already played at least one game in this session. */
export async function getSessionStudentsPlayed(sessionId: string): Promise<string[]> {
  const teacherId = await getTeacherId();

  const sessionGames = await db
    .select({ studentId: games.studentId })
    .from(games)
    .where(and(eq(games.sessionId, sessionId), eq(games.teacherId, teacherId)));

  return sessionGames.map((g) => g.studentId).filter(Boolean) as string[];
}

/**
 * Launches the next game in an existing session.
 * Settings (ladderLength, currencyLabel, pace) are locked from the session row.
 */
export async function startNextGameInSession(data: {
  sessionId: string;
  studentId: string | null;
}): Promise<{ gameId: string; pace: string; error?: string }> {
  const teacherId = await getTeacherId();

  const session = await db.query.playSessions.findFirst({
    where: and(eq(playSessions.id, data.sessionId), eq(playSessions.teacherId, teacherId)),
  });
  if (!session) return { gameId: "", pace: "showtime", error: "Session not found" };
  if (session.endedAt) return { gameId: "", pace: "showtime", error: "Session already ended" };
  if (!session.setId) return { gameId: "", pace: "showtime", error: "Session has no question set" };

  const result = await createGame({
    setId: session.setId,
    studentId: data.studentId,
    ladderLength: session.ladderLength,
    currencyLabel: session.currencyLabel,
    sessionId: data.sessionId,
  });

  return { ...result, pace: session.pace };
}

// ─── Game actions ─────────────────────────────────────────────────────────────

export async function createGame(data: {
  setId: string;
  studentId: string | null;
  ladderLength: number;
  currencyLabel: string;
  sessionId?: string | null;
}): Promise<{ gameId: string; error?: string }> {
  const teacherId = await getTeacherId();

  const set = await db.query.questionSets.findFirst({
    where: and(eq(questionSets.id, data.setId), eq(questionSets.teacherId, teacherId)),
  });
  if (!set) return { gameId: "", error: "Set not found" };

  // Gather session-wide used question IDs to exclude (prefer unseen)
  let excludeIds = new Set<string>();
  if (data.sessionId) {
    const usedIds = await getSessionUsedQuestionIds(data.sessionId);
    excludeIds = new Set(usedIds);
  }

  const pool = await db
    .select()
    .from(questions)
    .where(and(eq(questions.setId, data.setId), eq(questions.teacherId, teacherId)));
  const picked = pickQuestionsForLadder(pool, data.ladderLength, { excludeIds });
  if (!picked) return { gameId: "", error: "Not enough questions in this set for the chosen length." };

  const ladder = buildLadder(data.ladderLength, data.currencyLabel);

  const [game] = await db
    .insert(games)
    .values({
      teacherId,
      sessionId: data.sessionId ?? null,
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

/** Returns the active (not-yet-ended) session for the current teacher, if any. */
export async function getActiveSession(): Promise<{
  id: string;
  setId: string | null;
  setName: string | null;
  ladderLength: number;
  currencyLabel: string;
  pace: string;
  studentsPlayed: { id: string; name: string }[];
} | null> {
  const teacherId = await getTeacherId();

  const session = await db.query.playSessions.findFirst({
    where: and(eq(playSessions.teacherId, teacherId), isNull(playSessions.endedAt)),
  });
  if (!session) return null;

  // Resolve set name
  let setName: string | null = null;
  if (session.setId) {
    const set = await db.query.questionSets.findFirst({
      where: eq(questionSets.id, session.setId),
    });
    setName = set?.name ?? null;
  }

  // Gather students who already played
  const sessionGames = await db
    .select({ studentId: games.studentId })
    .from(games)
    .where(and(eq(games.sessionId, session.id), eq(games.teacherId, teacherId)));

  const studentIds = sessionGames.map((g) => g.studentId).filter(Boolean) as string[];
  const studentsPlayed: { id: string; name: string }[] = [];
  if (studentIds.length > 0) {
    const rows = await db
      .select({ id: students.id, name: students.name })
      .from(students)
      .where(eq(students.teacherId, teacherId));
    for (const row of rows) {
      if (studentIds.includes(row.id)) studentsPlayed.push(row);
    }
  }

  return {
    id: session.id,
    setId: session.setId ?? null,
    setName,
    ladderLength: session.ladderLength,
    currencyLabel: session.currencyLabel,
    pace: session.pace,
    studentsPlayed,
  };
}
