import {
  pgTable,
  text,
  uuid,
  integer,
  boolean,
  timestamp,
  jsonb,
  pgEnum,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ─── Enums ───────────────────────────────────────────────────────────────────

export const questionTypeEnum = pgEnum("question_type", ["mcq4", "tf"]);

export const gameOutcomeEnum = pgEnum("game_outcome", [
  "won_top",
  "walked_away",
  "wrong_answer",
  "in_progress",
]);

export const lifelineEnum = pgEnum("lifeline_type", [
  "fifty_fifty",
  "ask_audience",
  "phone_friend",
  "switch_question",
]);

// ─── Tables ──────────────────────────────────────────────────────────────────

export const teachers = pgTable("teachers", {
  id: uuid("id").primaryKey(), // matches Supabase auth.users.id
  email: text("email").notNull().unique(),
  name: text("name"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const students = pgTable("students", {
  id: uuid("id").primaryKey().defaultRandom(),
  teacherId: uuid("teacher_id")
    .notNull()
    .references(() => teachers.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  notes: text("notes"),
  archivedAt: timestamp("archived_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const questionSets = pgTable("question_sets", {
  id: uuid("id").primaryKey().defaultRandom(),
  teacherId: uuid("teacher_id")
    .notNull()
    .references(() => teachers.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  defaultLengthHint: integer("default_length_hint").default(10),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const questions = pgTable("questions", {
  id: uuid("id").primaryKey().defaultRandom(),
  setId: uuid("set_id")
    .notNull()
    .references(() => questionSets.id, { onDelete: "cascade" }),
  // Denormalised owner for fast tenant-scoped filtering. Must match
  // questionSets.teacherId of the parent set (enforced in application code).
  teacherId: uuid("teacher_id")
    .notNull()
    .references(() => teachers.id, { onDelete: "cascade" }),
  prompt: text("prompt").notNull(),
  type: questionTypeEnum("type").notNull().default("mcq4"),
  // answers[0..3] — correctIndex points to the right one
  answers: jsonb("answers").$type<string[]>().notNull(),
  correctIndex: integer("correct_index").notNull(),
  difficulty: integer("difficulty").notNull().default(2), // 1=Easy 2=Medium 3=Hard
  explanation: text("explanation"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const playSessions = pgTable("play_sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  teacherId: uuid("teacher_id")
    .notNull()
    .references(() => teachers.id, { onDelete: "cascade" }),
  setId: uuid("set_id").references(() => questionSets.id, { onDelete: "set null" }),
  ladderLength: integer("ladder_length").notNull(),
  currencyLabel: text("currency_label").notNull().default("$"),
  pace: text("pace").notNull().default("showtime"),
  startedAt: timestamp("started_at").defaultNow().notNull(),
  endedAt: timestamp("ended_at"),
});

export const games = pgTable("games", {
  id: uuid("id").primaryKey().defaultRandom(),
  teacherId: uuid("teacher_id")
    .notNull()
    .references(() => teachers.id, { onDelete: "cascade" }),
  sessionId: uuid("session_id").references(() => playSessions.id, {
    onDelete: "set null",
  }),
  studentId: uuid("student_id").references(() => students.id, {
    onDelete: "set null",
  }),
  setId: uuid("set_id").references(() => questionSets.id, {
    onDelete: "set null",
  }),
  ladderLength: integer("ladder_length").notNull(),
  currencyLabel: text("currency_label").notNull().default("$"),
  // [{rung, prize, isSafetyNet}]
  prizeLadder: jsonb("prize_ladder")
    .$type<{ rung: number; prize: string; isSafetyNet: boolean }[]>()
    .notNull(),
  outcome: gameOutcomeEnum("outcome").notNull().default("in_progress"),
  finalPrize: text("final_prize"),
  lifelinesUsed: jsonb("lifelines_used")
    .$type<string[]>()
    .notNull()
    .default([]),
  // Ordered list of question IDs for this game (picked at launch)
  questionPlan: jsonb("question_plan").$type<string[]>(),
  startedAt: timestamp("started_at").defaultNow().notNull(),
  endedAt: timestamp("ended_at"),
});

export const turns = pgTable("turns", {
  id: uuid("id").primaryKey().defaultRandom(),
  gameId: uuid("game_id")
    .notNull()
    .references(() => games.id, { onDelete: "cascade" }),
  questionId: uuid("question_id").references(() => questions.id, {
    onDelete: "set null",
  }),
  rungIndex: integer("rung_index").notNull(), // 0-based
  // answers as shown (may be reduced by 50:50)
  shownAnswers: jsonb("shown_answers").$type<(string | null)[]>().notNull(),
  chosenIndex: integer("chosen_index"), // null if walked away
  isCorrect: boolean("is_correct"),
  lifelineUsed: lifelineEnum("lifeline_used"),
  walkedAway: boolean("walked_away").notNull().default(false),
  timeMs: integer("time_ms"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─── Relations ───────────────────────────────────────────────────────────────

export const playSessionRelations = relations(playSessions, ({ one, many }) => ({
  teacher: one(teachers, { fields: [playSessions.teacherId], references: [teachers.id] }),
  set: one(questionSets, { fields: [playSessions.setId], references: [questionSets.id] }),
  games: many(games),
}));

export const teacherRelations = relations(teachers, ({ many }) => ({
  students: many(students),
  questionSets: many(questionSets),
  games: many(games),
  playSessions: many(playSessions),
}));

export const studentRelations = relations(students, ({ one, many }) => ({
  teacher: one(teachers, { fields: [students.teacherId], references: [teachers.id] }),
  games: many(games),
}));

export const questionSetRelations = relations(questionSets, ({ one, many }) => ({
  teacher: one(teachers, { fields: [questionSets.teacherId], references: [teachers.id] }),
  questions: many(questions),
  games: many(games),
}));

export const questionRelations = relations(questions, ({ one, many }) => ({
  set: one(questionSets, { fields: [questions.setId], references: [questionSets.id] }),
  teacher: one(teachers, { fields: [questions.teacherId], references: [teachers.id] }),
  turns: many(turns),
}));

export const gameRelations = relations(games, ({ one, many }) => ({
  teacher: one(teachers, { fields: [games.teacherId], references: [teachers.id] }),
  session: one(playSessions, { fields: [games.sessionId], references: [playSessions.id] }),
  student: one(students, { fields: [games.studentId], references: [students.id] }),
  set: one(questionSets, { fields: [games.setId], references: [questionSets.id] }),
  turns: many(turns),
}));

export const turnRelations = relations(turns, ({ one }) => ({
  game: one(games, { fields: [turns.gameId], references: [games.id] }),
  question: one(questions, { fields: [turns.questionId], references: [questions.id] }),
}));

// ─── Types ───────────────────────────────────────────────────────────────────

export type Teacher = typeof teachers.$inferSelect;
export type Student = typeof students.$inferSelect;
export type QuestionSet = typeof questionSets.$inferSelect;
export type Question = typeof questions.$inferSelect;
export type Game = typeof games.$inferSelect;
export type Turn = typeof turns.$inferSelect;
export type PlaySession = typeof playSessions.$inferSelect;

export type NewStudent = typeof students.$inferInsert;
export type NewQuestionSet = typeof questionSets.$inferInsert;
export type NewQuestion = typeof questions.$inferInsert;
export type NewGame = typeof games.$inferInsert;
export type NewTurn = typeof turns.$inferInsert;
export type NewPlaySession = typeof playSessions.$inferInsert;
