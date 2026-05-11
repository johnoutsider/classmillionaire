import { createSet } from "@/lib/actions/sets";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export default function NewSetPage() {
  return (
    <div className="p-8">
      <Link href="/sets" className="inline-flex items-center gap-1 text-blue-400 hover:text-blue-200 text-sm mb-6 transition">
        <ChevronLeft size={16} /> Back to Sets
      </Link>
      <h1 className="text-2xl font-bold text-white mb-6">New Question Set</h1>
      <form action={createSet} className="space-y-5">
        <div>
          <label className="block text-sm text-blue-300 mb-1" htmlFor="name">
            Name <span className="text-red-400">*</span>
          </label>
          <input
            id="name"
            name="name"
            required
            maxLength={100}
            className="w-full px-4 py-2.5 rounded-lg bg-blue-950 border border-blue-700 text-white placeholder-blue-500 focus:outline-none focus:border-yellow-400 transition"
            placeholder="e.g. Photosynthesis Quiz"
          />
        </div>

        <div>
          <label className="block text-sm text-blue-300 mb-1" htmlFor="description">
            Description
          </label>
          <textarea
            id="description"
            name="description"
            rows={2}
            maxLength={300}
            className="w-full px-4 py-2.5 rounded-lg bg-blue-950 border border-blue-700 text-white placeholder-blue-500 focus:outline-none focus:border-yellow-400 transition resize-none"
            placeholder="Optional short description"
          />
        </div>

        <div>
          <label className="block text-sm text-blue-300 mb-1" htmlFor="defaultLengthHint">
            Default game length (questions)
          </label>
          <input
            id="defaultLengthHint"
            name="defaultLengthHint"
            type="number"
            min={1}
            max={50}
            defaultValue={10}
            className="w-32 px-4 py-2.5 rounded-lg bg-blue-950 border border-blue-700 text-white focus:outline-none focus:border-yellow-400 transition"
          />
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            className="px-6 py-2.5 rounded-lg bg-yellow-400 text-gray-900 font-bold text-sm hover:bg-yellow-300 transition"
          >
            Create Set
          </button>
          <a
            href="/sets"
            className="px-6 py-2.5 rounded-lg border border-blue-700 text-blue-300 text-sm hover:bg-blue-900/50 transition"
          >
            Cancel
          </a>
        </div>
      </form>
    </div>
  );
}
