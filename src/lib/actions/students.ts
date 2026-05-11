"use server";

import { db } from "@/lib/db";
import { students } from "@/lib/db/schema";
import { getTeacherId } from "@/lib/auth/getTeacherId";
import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const studentSchema = z.object({
  name: z.string().min(1).max(100),
  notes: z.string().max(300).optional(),
});

export async function addStudent(formData: FormData) {
  const teacherId = await getTeacherId();
  const parsed = studentSchema.parse({
    name: formData.get("name"),
    notes: formData.get("notes") || undefined,
  });
  await db.insert(students).values({ ...parsed, teacherId });
  revalidatePath("/students");
}

export async function updateStudent(studentId: string, formData: FormData) {
  const teacherId = await getTeacherId();
  const parsed = studentSchema.parse({
    name: formData.get("name"),
    notes: formData.get("notes") || undefined,
  });
  await db
    .update(students)
    .set(parsed)
    .where(and(eq(students.id, studentId), eq(students.teacherId, teacherId)));
  revalidatePath("/students");
}

export async function archiveStudent(studentId: string) {
  const teacherId = await getTeacherId();
  await db
    .update(students)
    .set({ archivedAt: new Date() })
    .where(and(eq(students.id, studentId), eq(students.teacherId, teacherId)));
  revalidatePath("/students");
}

export async function unarchiveStudent(studentId: string) {
  const teacherId = await getTeacherId();
  await db
    .update(students)
    .set({ archivedAt: null })
    .where(and(eq(students.id, studentId), eq(students.teacherId, teacherId)));
  revalidatePath("/students");
}

export async function deleteStudent(studentId: string) {
  const teacherId = await getTeacherId();
  await db
    .delete(students)
    .where(and(eq(students.id, studentId), eq(students.teacherId, teacherId)));
  revalidatePath("/students");
}
