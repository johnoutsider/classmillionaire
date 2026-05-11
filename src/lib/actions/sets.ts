"use server";

import { db } from "@/lib/db";
import { questionSets, questions, NewQuestionSet, NewQuestion } from "@/lib/db/schema";
import { getTeacherId } from "@/lib/auth/getTeacherId";
import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

// ─── Question Set CRUD ────────────────────────────────────────────────────────

const setSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(300).optional(),
  defaultLengthHint: z.coerce.number().int().min(1).max(50).optional(),
});

export async function createSet(formData: FormData) {
  const teacherId = await getTeacherId();
  const parsed = setSchema.parse({
    name: formData.get("name"),
    description: formData.get("description") || undefined,
    defaultLengthHint: formData.get("defaultLengthHint") || undefined,
  });

  const [set] = await db
    .insert(questionSets)
    .values({ ...parsed, teacherId })
    .returning();

  revalidatePath("/dashboard");
  revalidatePath("/sets");
  redirect(`/sets/${set.id}`);
}

export async function updateSet(setId: string, formData: FormData) {
  const teacherId = await getTeacherId();
  const parsed = setSchema.parse({
    name: formData.get("name"),
    description: formData.get("description") || undefined,
    defaultLengthHint: formData.get("defaultLengthHint") || undefined,
  });

  await db
    .update(questionSets)
    .set({ ...parsed, updatedAt: new Date() })
    .where(and(eq(questionSets.id, setId), eq(questionSets.teacherId, teacherId)));

  revalidatePath(`/sets/${setId}`);
  revalidatePath("/sets");
}

export async function deleteSet(setId: string) {
  const teacherId = await getTeacherId();
  await db
    .delete(questionSets)
    .where(and(eq(questionSets.id, setId), eq(questionSets.teacherId, teacherId)));

  revalidatePath("/sets");
  revalidatePath("/dashboard");
  redirect("/sets");
}

// ─── Question CRUD ────────────────────────────────────────────────────────────

const questionSchema = z.object({
  prompt: z.string().min(1).max(500),
  type: z.enum(["mcq4", "tf"]),
  answers: z.array(z.string().max(200)).length(4),
  correctIndex: z.coerce.number().int().min(0).max(3),
  difficulty: z.coerce.number().int().min(1).max(3),
  explanation: z.string().max(500).optional(),
});

export async function addQuestion(setId: string, data: {
  prompt: string;
  type: "mcq4" | "tf";
  answers: string[];
  correctIndex: number;
  difficulty: number;
  explanation?: string;
}) {
  const teacherId = await getTeacherId();

  // Verify the set belongs to this teacher
  const set = await db.query.questionSets.findFirst({
    where: and(eq(questionSets.id, setId), eq(questionSets.teacherId, teacherId)),
  });
  if (!set) throw new Error("Set not found");

  const parsed = questionSchema.parse(data);

  await db.insert(questions).values({ ...parsed, setId, teacherId });

  revalidatePath(`/sets/${setId}`);
}

export async function updateQuestion(questionId: string, setId: string, data: {
  prompt: string;
  type: "mcq4" | "tf";
  answers: string[];
  correctIndex: number;
  difficulty: number;
  explanation?: string;
}) {
  const teacherId = await getTeacherId();

  const set = await db.query.questionSets.findFirst({
    where: and(eq(questionSets.id, setId), eq(questionSets.teacherId, teacherId)),
  });
  if (!set) throw new Error("Set not found");

  const parsed = questionSchema.parse(data);
  // Tenant-scoped WHERE: question must belong to this set AND this teacher.
  await db
    .update(questions)
    .set(parsed)
    .where(
      and(
        eq(questions.id, questionId),
        eq(questions.setId, setId),
        eq(questions.teacherId, teacherId),
      ),
    );

  revalidatePath(`/sets/${setId}`);
}

export async function deleteQuestion(questionId: string, setId: string) {
  const teacherId = await getTeacherId();
  const set = await db.query.questionSets.findFirst({
    where: and(eq(questionSets.id, setId), eq(questionSets.teacherId, teacherId)),
  });
  if (!set) throw new Error("Set not found");

  await db
    .delete(questions)
    .where(
      and(
        eq(questions.id, questionId),
        eq(questions.setId, setId),
        eq(questions.teacherId, teacherId),
      ),
    );
  revalidatePath(`/sets/${setId}`);
}

export async function bulkImportQuestions(
  setId: string,
  rows: Omit<NewQuestion, "setId" | "teacherId">[],
) {
  const teacherId = await getTeacherId();
  const set = await db.query.questionSets.findFirst({
    where: and(eq(questionSets.id, setId), eq(questionSets.teacherId, teacherId)),
  });
  if (!set) throw new Error("Set not found");

  if (rows.length === 0) return;
  await db.insert(questions).values(rows.map((r) => ({ ...r, setId, teacherId })));
  revalidatePath(`/sets/${setId}`);
}
