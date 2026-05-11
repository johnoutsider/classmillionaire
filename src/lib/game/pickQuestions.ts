import type { Question } from "@/lib/db/schema";

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Maps a 0-based rung index to a difficulty 1–3 (Easy/Medium/Hard)
function difficultyForRung(rungIndex: number, totalRungs: number): number {
  return Math.min(3, Math.floor((rungIndex / totalRungs) * 3) + 1);
}

/**
 * Picks `ladderLength` questions from the pool, ordered by rung difficulty.
 * Falls back to adjacent difficulties if a difficulty tier is under-supplied.
 * Returns null if the pool is too small.
 */
export function pickQuestionsForLadder(
  pool: Question[],
  ladderLength: number
): Question[] | null {
  if (pool.length < ladderLength) return null;

  // Group by difficulty
  const byDiff: Record<number, Question[]> = { 1: [], 2: [], 3: [] };
  for (const q of pool) byDiff[q.difficulty]?.push(q);
  for (const d of [1, 2, 3]) byDiff[d] = shuffle(byDiff[d]);

  const picked: Question[] = [];
  const usedIds = new Set<string>();

  for (let i = 0; i < ladderLength; i++) {
    const targetDiff = difficultyForRung(i, ladderLength);

    // Try target difficulty, then expand outward: target±1, target±2
    let question: Question | undefined;
    for (let spread = 0; spread <= 2 && !question; spread++) {
      for (const d of [targetDiff - spread, targetDiff + spread]) {
        if (d < 1 || d > 3) continue;
        question = byDiff[d].find((q) => !usedIds.has(q.id));
        if (question) break;
      }
    }

    if (!question) return null; // pool exhausted
    usedIds.add(question.id);
    picked.push(question);
  }

  return picked;
}

export function difficultyForRungExport(rungIndex: number, totalRungs: number) {
  return difficultyForRung(rungIndex, totalRungs);
}
