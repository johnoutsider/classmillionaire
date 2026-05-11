"use client";

import { useState } from "react";
import { addStudent, updateStudent, archiveStudent, deleteStudent } from "@/lib/actions/students";
import { toast } from "sonner";
import { Plus, Pencil, Archive, Trash2, Check, X, Users } from "lucide-react";
import { cn } from "@/lib/utils";

type StudentRow = {
  id: string;
  name: string;
  notes: string | null;
  createdAt: Date;
  gameCount: number;
};

export default function StudentRoster({ initialStudents }: { initialStudents: StudentRow[] }) {
  const [students, setStudents] = useState(initialStudents);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  function openAdd() {
    setEditingId(null);
    setName("");
    setNotes("");
    setShowForm(true);
  }

  function openEdit(s: StudentRow) {
    setEditingId(s.id);
    setName(s.name);
    setNotes(s.notes ?? "");
    setShowForm(true);
  }

  function cancel() {
    setShowForm(false);
    setEditingId(null);
    setName("");
    setNotes("");
  }

  async function save() {
    if (!name.trim()) { toast.error("Name is required"); return; }
    setSaving(true);
    const fd = new FormData();
    fd.set("name", name.trim());
    fd.set("notes", notes.trim());

    try {
      if (editingId) {
        await updateStudent(editingId, fd);
        setStudents((ss) =>
          ss.map((s) => s.id === editingId ? { ...s, name: name.trim(), notes: notes.trim() || null } : s)
        );
        toast.success("Updated");
      } else {
        await addStudent(fd);
        toast.success("Student added");
        window.location.reload();
        return;
      }
      cancel();
    } catch {
      toast.error("Failed to save");
    } finally {
      setSaving(false);
    }
  }

  async function handleArchive(id: string, studentName: string) {
    if (!confirm(`Archive ${studentName}? They'll be hidden but their game history is kept.`)) return;
    try {
      await archiveStudent(id);
      setStudents((ss) => ss.filter((s) => s.id !== id));
      toast.success("Archived");
    } catch {
      toast.error("Failed to archive");
    }
  }

  async function handleDelete(id: string, studentName: string, gameCount: number) {
    const msg = gameCount > 0
      ? `Delete ${studentName}? Their ${gameCount} game record${gameCount !== 1 ? "s" : ""} will also be deleted.`
      : `Delete ${studentName}?`;
    if (!confirm(msg)) return;
    try {
      await deleteStudent(id);
      setStudents((ss) => ss.filter((s) => s.id !== id));
      toast.success("Deleted");
    } catch {
      toast.error("Failed to delete");
    }
  }

  return (
    <div>
      <div className="flex justify-end mb-4">
        <button
          onClick={openAdd}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-yellow-400 text-gray-900 text-sm font-bold hover:bg-yellow-300 transition"
        >
          <Plus size={16} /> Add Student
        </button>
      </div>

      {/* Add / Edit form */}
      {showForm && (
        <div className="bg-millionaire-mid border border-blue-700 rounded-xl p-5 mb-4 space-y-3">
          <h3 className="font-semibold text-white text-sm">{editingId ? "Edit Student" : "New Student"}</h3>
          <div>
            <label className="block text-xs text-blue-400 mb-1">Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && save()}
              autoFocus
              className="w-full px-3 py-2 rounded-lg bg-blue-950 border border-blue-700 text-white text-sm focus:outline-none focus:border-yellow-400 transition"
              placeholder="Student name"
            />
          </div>
          <div>
            <label className="block text-xs text-blue-400 mb-1">Notes (optional)</label>
            <input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-blue-950 border border-blue-700 text-white text-sm focus:outline-none focus:border-yellow-400 transition"
              placeholder="e.g. ESL learner, needs more time"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={save}
              disabled={saving}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-yellow-400 text-gray-900 text-sm font-bold hover:bg-yellow-300 disabled:opacity-50 transition"
            >
              <Check size={14} /> {editingId ? "Update" : "Add"}
            </button>
            <button
              onClick={cancel}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-blue-700 text-blue-300 text-sm hover:bg-blue-900/50 transition"
            >
              <X size={14} /> Cancel
            </button>
          </div>
        </div>
      )}

      {/* List */}
      {students.length === 0 && !showForm ? (
        <div className="bg-millionaire-mid border border-blue-900 border-dashed rounded-xl px-6 py-14 text-center">
          <Users size={36} className="mx-auto text-blue-700 mb-3" />
          <p className="text-blue-400">No students yet.</p>
          <p className="text-blue-600 text-sm mt-1">Add student names to track their progress over time.</p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {students.map((s) => (
            <div
              key={s.id}
              className="flex items-center gap-4 px-5 py-3.5 rounded-xl bg-millionaire-mid border border-blue-900 group"
            >
              <div className="flex-1 min-w-0">
                <p className="text-white font-medium">{s.name}</p>
                {s.notes && <p className="text-xs text-blue-500 mt-0.5">{s.notes}</p>}
              </div>
              <span className="text-xs text-blue-500 shrink-0">
                {s.gameCount} game{s.gameCount !== 1 ? "s" : ""}
              </span>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                <button
                  onClick={() => openEdit(s)}
                  className="p-1.5 text-blue-500 hover:text-white rounded transition"
                >
                  <Pencil size={14} />
                </button>
                <button
                  onClick={() => handleArchive(s.id, s.name)}
                  className="p-1.5 text-blue-500 hover:text-yellow-400 rounded transition"
                  title="Archive"
                >
                  <Archive size={14} />
                </button>
                <button
                  onClick={() => handleDelete(s.id, s.name, s.gameCount)}
                  className="p-1.5 text-red-500 hover:text-red-300 rounded transition"
                  title="Delete"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
