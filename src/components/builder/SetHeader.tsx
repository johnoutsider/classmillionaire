"use client";

import { useState } from "react";
import { updateSet, deleteSet } from "@/lib/actions/sets";
import type { QuestionSet } from "@/lib/db/schema";
import { Pencil, Trash2, Check, X, ChevronLeft } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

export default function SetHeader({ set }: { set: QuestionSet }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(set.name);
  const [description, setDescription] = useState(set.description ?? "");
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    const fd = new FormData();
    fd.set("name", name);
    fd.set("description", description);
    fd.set("defaultLengthHint", String(set.defaultLengthHint ?? 10));
    try {
      await updateSet(set.id, fd);
      setEditing(false);
      toast.success("Set updated");
    } catch {
      toast.error("Failed to update set");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirm(`Delete "${set.name}" and all its questions?`)) return;
    try {
      await deleteSet(set.id);
    } catch {
      toast.error("Failed to delete set");
    }
  }

  return (
    <div className="mb-8">
      <div className="flex items-start justify-between gap-4">
        {editing ? (
          <div className="flex-1 space-y-2">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full text-2xl font-bold bg-blue-950 border border-blue-700 text-white px-3 py-1.5 rounded-lg focus:outline-none focus:border-yellow-400"
            />
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Description (optional)"
              className="w-full text-sm bg-blue-950 border border-blue-700 text-blue-300 px-3 py-1.5 rounded-lg focus:outline-none focus:border-yellow-400"
            />
          </div>
        ) : (
          <div>
            <Link href="/sets" className="inline-flex items-center gap-1 text-blue-400 hover:text-blue-200 text-sm mb-1 transition">
              <ChevronLeft size={16} /> Back to Sets
            </Link>
            <h1 className="text-2xl font-bold text-white">{set.name}</h1>
            {set.description && (
              <p className="text-blue-400 text-sm mt-1">{set.description}</p>
            )}
          </div>
        )}

        <div className="flex items-center gap-2 shrink-0">
          {editing ? (
            <>
              <button
                onClick={save}
                disabled={saving}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-yellow-400 text-gray-900 text-sm font-bold hover:bg-yellow-300 disabled:opacity-50 transition"
              >
                <Check size={14} /> Save
              </button>
              <button
                onClick={() => { setEditing(false); setName(set.name); setDescription(set.description ?? ""); }}
                className="p-1.5 rounded-lg text-blue-400 hover:bg-blue-900/50 transition"
              >
                <X size={16} />
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setEditing(true)}
                className="p-1.5 rounded-lg text-blue-400 hover:bg-blue-900/50 transition"
                title="Edit set details"
              >
                <Pencil size={16} />
              </button>
              <button
                onClick={handleDelete}
                className="p-1.5 rounded-lg text-red-500 hover:bg-red-950/50 transition"
                title="Delete set"
              >
                <Trash2 size={16} />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
