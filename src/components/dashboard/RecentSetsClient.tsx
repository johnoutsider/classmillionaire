"use client";

import { useState } from "react";
import Link from "next/link";
import { PlayCircle } from "lucide-react";
import LaunchModal from "@/components/builder/LaunchModal";

type SetRow = {
  id: string;
  name: string;
  description: string | null;
  updatedAt: Date;
  defaultLengthHint: number | null;
  questionCount: number;
};

type Student = { id: string; name: string };

export default function RecentSetsClient({
  sets,
  students,
}: {
  sets: SetRow[];
  students: Student[];
}) {
  const [launchSet, setLaunchSet] = useState<SetRow | null>(null);

  return (
    <>
      <div className="space-y-2">
        {sets.map((s) => (
          <div
            key={s.id}
            className="flex items-center gap-3 px-5 py-4 rounded-xl bg-millionaire-mid border border-blue-900 hover:border-blue-700 transition group"
          >
            <Link href={`/sets/${s.id}`} className="flex-1 min-w-0">
              <p className="font-medium text-white group-hover:text-yellow-300 transition truncate">
                {s.name}
              </p>
              {s.description && (
                <p className="text-xs text-blue-400 mt-0.5 truncate">{s.description}</p>
              )}
            </Link>

            <button
              onClick={() => setLaunchSet(s)}
              disabled={s.questionCount === 0}
              title={s.questionCount === 0 ? "Add questions first" : `Play ${s.name}`}
              className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-yellow-400 text-gray-900 text-xs font-bold hover:bg-yellow-300 disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              <PlayCircle size={22} /> Play
            </button>

            <span className="text-xs text-blue-500 shrink-0">
              {new Date(s.updatedAt).toLocaleDateString()}
            </span>
          </div>
        ))}
      </div>

      {launchSet && (
        <LaunchModal
          setId={launchSet.id}
          setName={launchSet.name}
          questionCount={launchSet.questionCount}
          defaultLength={launchSet.defaultLengthHint ?? 10}
          students={students}
          onClose={() => setLaunchSet(null)}
        />
      )}
    </>
  );
}
