"use client";

import { useState } from "react";
import { PlayCircle } from "lucide-react";
import LaunchModal from "./LaunchModal";

type Student = { id: string; name: string };

export default function SetPlayButton({
  setId, setName, questionCount, defaultLength, students,
}: {
  setId: string;
  setName: string;
  questionCount: number;
  defaultLength: number;
  students: Student[];
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        disabled={questionCount === 0}
        className="shrink-0 flex items-center gap-2 px-5 py-2.5 rounded-xl bg-yellow-400 text-gray-900 font-bold text-sm hover:bg-yellow-300 disabled:opacity-40 disabled:cursor-not-allowed transition shadow-lg"
        title={questionCount === 0 ? "Add questions first" : "Launch game"}
      >
        <PlayCircle size={18} /> Play
      </button>
      {open && (
        <LaunchModal
          setId={setId}
          setName={setName}
          questionCount={questionCount}
          defaultLength={defaultLength}
          students={students}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
