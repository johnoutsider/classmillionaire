"use client";

import { useState } from "react";
import type { Question } from "@/lib/db/schema";
import { addQuestion, updateQuestion, deleteQuestion } from "@/lib/actions/sets";
import { toast } from "sonner";
import { Plus, Trash2, Pencil, Check, X, Upload } from "lucide-react";
import ImportDialog from "./ImportDialog";
import { cn } from "@/lib/utils";

const DIFFICULTY_LABELS: Record<number, string> = {
  1: "Easy",
  2: "Medium",
  3: "Hard",
};

const DIFFICULTY_COLORS: Record<number, string> = {
  1: "text-green-400 border-green-800 bg-green-950/30",
  2: "text-yellow-400 border-yellow-800 bg-yellow-950/30",
  3: "text-red-400 border-red-800 bg-red-950/30",
};

type QuestionForm = {
  prompt: string;
  type: "mcq4" | "tf";
  answers: [string, string, string, string];
  correctIndex: number;
  difficulty: number;
  explanation: string;
};

function emptyForm(): QuestionForm {
  return {
    prompt: "",
    type: "mcq4",
    answers: ["", "", "", ""],
    correctIndex: 0,
    difficulty: 2,
    explanation: "",
  };
}

function tfAnswers(): [string, string, string, string] {
  return ["True", "False", "", ""];
}

function questionToForm(q: Question): QuestionForm {
  return {
    prompt: q.prompt,
    type: q.type,
    answers: (q.answers as string[]).concat(["", "", "", ""]).slice(0, 4) as [string, string, string, string],
    correctIndex: q.correctIndex,
    difficulty: q.difficulty,
    explanation: q.explanation ?? "",
  };
}

// ─── Shared inline form ───────────────────────────────────────────────────────

function QuestionForm({
  form,
  setForm,
  onSave,
  onCancel,
  saving,
  isNew,
}: {
  form: QuestionForm;
  setForm: (f: QuestionForm | ((prev: QuestionForm) => QuestionForm)) => void;
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
  isNew: boolean;
}) {
  function setType(t: "mcq4" | "tf") {
    setForm((f) => ({
      ...f,
      type: t,
      answers: t === "tf" ? tfAnswers() : emptyForm().answers,
      correctIndex: 0,
    }));
  }

  return (
    <div className="space-y-4">
      {/* Type toggle */}
      <div className="flex gap-2">
        {(["mcq4", "tf"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setType(t)}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-medium border transition",
              form.type === t
                ? "bg-blue-800 border-blue-500 text-white"
                : "border-blue-800 text-blue-400 hover:bg-blue-900/50"
            )}
          >
            {t === "mcq4" ? "Multiple Choice" : "True / False"}
          </button>
        ))}
      </div>

      {/* Prompt */}
      <div>
        <label className="block text-xs text-blue-400 mb-1">Question text</label>
        <textarea
          rows={2}
          value={form.prompt}
          onChange={(e) => setForm((f) => ({ ...f, prompt: e.target.value }))}
          className="w-full px-3 py-2 rounded-lg bg-blue-950 border border-blue-700 text-white text-sm focus:outline-none focus:border-yellow-400 resize-none transition"
          placeholder="Type your question here…"
        />
      </div>

      {/* Answers */}
      <div className="grid grid-cols-2 gap-3">
        {(form.type === "tf" ? [0, 1] : [0, 1, 2, 3]).map((i) => (
          <div key={i} className="flex items-center gap-2">
            <button
              onClick={() => setForm((f) => ({ ...f, correctIndex: i }))}
              className={cn(
                "w-5 h-5 rounded-full border-2 shrink-0 transition",
                form.correctIndex === i
                  ? "border-green-400 bg-green-400"
                  : "border-blue-600 hover:border-green-500"
              )}
              title="Mark as correct"
            />
            <input
              value={form.answers[i]}
              disabled={form.type === "tf"}
              onChange={(e) => {
                const a = [...form.answers] as [string, string, string, string];
                a[i] = e.target.value;
                setForm((f) => ({ ...f, answers: a }));
              }}
              placeholder={`Answer ${String.fromCharCode(65 + i)}`}
              className="flex-1 px-3 py-1.5 rounded-lg bg-blue-950 border border-blue-700 text-white text-sm focus:outline-none focus:border-yellow-400 disabled:opacity-60 transition"
            />
          </div>
        ))}
      </div>

      {/* Difficulty */}
      <div>
        <label className="block text-xs text-blue-400 mb-2">Difficulty</label>
        <div className="flex gap-2">
          {[1, 2, 3].map((d) => (
            <button
              key={d}
              onClick={() => setForm((f) => ({ ...f, difficulty: d }))}
              className={cn(
                "flex-1 py-1.5 rounded-lg border text-xs font-medium transition",
                form.difficulty === d
                  ? DIFFICULTY_COLORS[d]
                  : "border-blue-800 text-blue-600 hover:bg-blue-900/50"
              )}
            >
              {DIFFICULTY_LABELS[d]}
            </button>
          ))}
        </div>
      </div>

      {/* Explanation */}
      <div>
        <label className="block text-xs text-blue-400 mb-1">
          Explanation <span className="text-blue-600">(optional — shown after wrong answer)</span>
        </label>
        <input
          value={form.explanation}
          onChange={(e) => setForm((f) => ({ ...f, explanation: e.target.value }))}
          className="w-full px-3 py-1.5 rounded-lg bg-blue-950 border border-blue-700 text-white text-sm focus:outline-none focus:border-yellow-400 transition"
          placeholder="e.g. The correct answer is B because…"
        />
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-1">
        <button
          onClick={onSave}
          disabled={saving}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-yellow-400 text-gray-900 text-sm font-bold hover:bg-yellow-300 disabled:opacity-50 transition"
        >
          <Check size={14} /> {isNew ? "Add" : "Update"}
        </button>
        <button
          onClick={onCancel}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-blue-700 text-blue-300 text-sm hover:bg-blue-900/50 transition"
        >
          <X size={14} /> Cancel
        </button>
      </div>
    </div>
  );
}

// ─── Main builder ─────────────────────────────────────────────────────────────

export default function QuestionBuilder({
  setId,
  initialQuestions,
}: {
  setId: string;
  initialQuestions: Question[];
}) {
  const [questions, setQuestions] = useState<Question[]>(initialQuestions);
  const [showAddForm, setShowAddForm] = useState(false);
  const [addForm, setAddForm] = useState<QuestionForm>(emptyForm());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<QuestionForm>(emptyForm());
  const [saving, setSaving] = useState(false);
  const [showImport, setShowImport] = useState(false);

  function openAdd() {
    setEditingId(null);
    setAddForm(emptyForm());
    setShowAddForm(true);
  }

  function openEdit(q: Question) {
    setShowAddForm(false);
    setEditingId(q.id);
    setEditForm(questionToForm(q));
  }

  function cancelAdd() {
    setShowAddForm(false);
    setAddForm(emptyForm());
  }

  function cancelEdit() {
    setEditingId(null);
    setEditForm(emptyForm());
  }

  async function saveAdd() {
    if (!addForm.prompt.trim()) { toast.error("Question text is required"); return; }
    if (addForm.type === "mcq4" && addForm.answers.some((a) => !a.trim())) {
      toast.error("All 4 answers are required for multiple choice"); return;
    }
    setSaving(true);
    try {
      const data = {
        prompt: addForm.prompt,
        type: addForm.type,
        answers: addForm.type === "tf" ? [addForm.answers[0], addForm.answers[1], "", ""] : addForm.answers,
        correctIndex: addForm.correctIndex,
        difficulty: addForm.difficulty,
        explanation: addForm.explanation || undefined,
      };
      await addQuestion(setId, data);
      toast.success("Question added");
      window.location.reload();
    } catch {
      toast.error("Failed to add question");
    } finally {
      setSaving(false);
    }
  }

  async function saveEdit() {
    if (!editForm.prompt.trim()) { toast.error("Question text is required"); return; }
    if (editForm.type === "mcq4" && editForm.answers.some((a) => !a.trim())) {
      toast.error("All 4 answers are required for multiple choice"); return;
    }
    setSaving(true);
    try {
      const data = {
        prompt: editForm.prompt,
        type: editForm.type,
        answers: editForm.type === "tf" ? [editForm.answers[0], editForm.answers[1], "", ""] : editForm.answers,
        correctIndex: editForm.correctIndex,
        difficulty: editForm.difficulty,
        explanation: editForm.explanation || undefined,
      };
      await updateQuestion(editingId!, setId, data);
      setQuestions((qs) =>
        qs.map((q) =>
          q.id === editingId
            ? { ...q, ...data, answers: data.answers, explanation: data.explanation ?? null }
            : q
        )
      );
      toast.success("Question updated");
      cancelEdit();
    } catch {
      toast.error("Failed to update question");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this question?")) return;
    try {
      await deleteQuestion(id, setId);
      setQuestions((qs) => qs.filter((q) => q.id !== id));
      if (editingId === id) cancelEdit();
      toast.success("Deleted");
    } catch {
      toast.error("Failed to delete");
    }
  }

  return (
    <div>
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-blue-400 uppercase tracking-widest">
          Questions ({questions.length})
        </h2>
        <div className="flex gap-2">
          <button
            onClick={() => setShowImport(true)}
            className="flex items-center gap-2 px-3 py-2 rounded-lg border border-blue-700 text-blue-300 text-sm hover:bg-blue-900/50 transition"
          >
            <Upload size={14} /> Import CSV
          </button>
          <button
            onClick={openAdd}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-yellow-400 text-gray-900 text-sm font-bold hover:bg-yellow-300 transition"
          >
            <Plus size={14} /> Add Question
          </button>
        </div>
      </div>

      {/* Add form — top panel */}
      {showAddForm && (
        <div className="bg-millionaire-mid border border-blue-700 rounded-xl p-5 mb-4">
          <p className="text-xs font-semibold text-blue-400 uppercase tracking-widest mb-4">New Question</p>
          <QuestionForm
            form={addForm}
            setForm={setAddForm}
            onSave={saveAdd}
            onCancel={cancelAdd}
            saving={saving}
            isNew
          />
        </div>
      )}

      {/* Questions list */}
      {questions.length === 0 && !showAddForm ? (
        <div className="bg-millionaire-mid border border-blue-900 border-dashed rounded-xl px-6 py-12 text-center">
          <p className="text-blue-400 mb-2">No questions yet.</p>
          <p className="text-blue-600 text-sm">Add questions manually or import from CSV.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {questions.map((q, i) =>
            editingId === q.id ? (
              /* ── Inline edit form ── */
              <div
                key={q.id}
                className="bg-millionaire-mid border border-blue-700 rounded-xl p-5"
              >
                <div className="flex items-center justify-between mb-4">
                  <p className="text-xs font-semibold text-blue-400 uppercase tracking-widest">
                    Editing Question {i + 1}
                  </p>
                  <button onClick={cancelEdit} className="text-blue-500 hover:text-white transition">
                    <X size={16} />
                  </button>
                </div>
                <QuestionForm
                  form={editForm}
                  setForm={setEditForm}
                  onSave={saveEdit}
                  onCancel={cancelEdit}
                  saving={saving}
                  isNew={false}
                />
              </div>
            ) : (
              /* ── Summary row ── */
              <div
                key={q.id}
                className="flex items-start gap-4 px-5 py-4 rounded-xl bg-millionaire-mid border border-blue-900 group"
              >
                <span className="text-blue-600 text-xs font-mono mt-0.5 w-5 shrink-0">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium leading-snug">{q.prompt}</p>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {(q.answers as string[]).filter(Boolean).map((a, ai) => (
                      <span
                        key={ai}
                        className={cn(
                          "text-xs px-2 py-0.5 rounded border",
                          ai === q.correctIndex
                            ? "text-green-300 border-green-800 bg-green-950/40"
                            : "text-blue-400 border-blue-800"
                        )}
                      >
                        {String.fromCharCode(65 + ai)}: {a}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={cn("text-xs px-2 py-0.5 rounded border", DIFFICULTY_COLORS[q.difficulty] ?? DIFFICULTY_COLORS[2])}>
                    {DIFFICULTY_LABELS[q.difficulty] ?? "Medium"}
                  </span>
                  <button
                    onClick={() => openEdit(q)}
                    className="p-1.5 text-blue-500 hover:text-white opacity-0 group-hover:opacity-100 transition rounded"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    onClick={() => handleDelete(q.id)}
                    className="p-1.5 text-red-500 hover:text-red-300 opacity-0 group-hover:opacity-100 transition rounded"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            )
          )}
        </div>
      )}

      {showImport && (
        <ImportDialog
          setId={setId}
          onClose={() => setShowImport(false)}
          onImported={() => { setShowImport(false); window.location.reload(); }}
        />
      )}
    </div>
  );
}
