"use client";

import { useState, useRef } from "react";
import { parseCSV, parseXLSX, CSV_TEMPLATE, type ParsedRow } from "@/lib/csv/parseQuestions";
import { bulkImportQuestions } from "@/lib/actions/sets";
import { toast } from "sonner";
import { X, Upload, Download, CheckCircle, AlertCircle, FileSpreadsheet } from "lucide-react";
import { cn } from "@/lib/utils";

const DIFFICULTY_LABEL: Record<number, string> = { 1: "Easy", 2: "Medium", 3: "Hard" };

export default function ImportDialog({
  setId,
  onClose,
  onImported,
}: {
  setId: string;
  onClose: () => void;
  onImported: () => void;
}) {
  const [rows, setRows] = useState<ParsedRow[] | null>(null);
  const [importing, setImporting] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // ── Template downloads ────────────────────────────────────────────────────

  function downloadExcelTemplate() {
    // The pre-built xlsx template lives in /template/
    const a = document.createElement("a");
    a.href = "/template/classmillion-template.xlsx";
    a.download = "classmillion-template.xlsx";
    a.click();
  }

  function downloadCSVTemplate() {
    const blob = new Blob([CSV_TEMPLATE], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "classmillion-template.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  // ── File handler ──────────────────────────────────────────────────────────

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);

    const ext = file.name.split(".").pop()?.toLowerCase();

    if (ext === "xlsx" || ext === "xls") {
      // Excel path
      const reader = new FileReader();
      reader.onload = (ev) => {
        const buf = ev.target?.result as ArrayBuffer;
        try {
          setRows(parseXLSX(buf));
        } catch (err) {
          toast.error("Could not parse Excel file: " + String(err));
        }
      };
      reader.readAsArrayBuffer(file);
    } else {
      // CSV / TSV / TXT path
      const reader = new FileReader();
      reader.onload = (ev) => {
        const text = ev.target?.result as string;
        setRows(parseCSV(text));
      };
      reader.readAsText(file);
    }

    // Reset input so the same file can be re-selected
    e.target.value = "";
  }

  // ── Import ────────────────────────────────────────────────────────────────

  async function doImport() {
    if (!rows) return;
    const valid = rows.filter((r) => !r.error);
    if (valid.length === 0) { toast.error("No valid rows to import"); return; }

    setImporting(true);
    try {
      await bulkImportQuestions(
        setId,
        valid.map((r) => ({
          setId,
          prompt: r.prompt,
          type: r.type,
          answers: r.answers,
          correctIndex: r.correctIndex,
          difficulty: r.difficulty,
          explanation: r.explanation,
        }))
      );
      toast.success(`Imported ${valid.length} question${valid.length !== 1 ? "s" : ""}`);
      onImported();
    } catch {
      toast.error("Import failed");
    } finally {
      setImporting(false);
    }
  }

  const validCount = rows?.filter((r) => !r.error).length ?? 0;
  const errorCount = rows?.filter((r) => r.error).length ?? 0;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-millionaire-mid border border-blue-700 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl">

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-blue-800">
          <h2 className="font-bold text-white">Import Questions</h2>
          <button onClick={onClose} className="text-blue-400 hover:text-white transition">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-auto p-6 space-y-5">

          {/* ── Instructions + upload ──────────────────────────────────────── */}
          <div className="border border-dashed border-blue-700 rounded-xl p-6 space-y-4">

            {/* Step instructions */}
            <ol className="text-blue-300 text-sm space-y-1">
              <li>
                <span className="text-blue-500 mr-1">1.</span>
                Download our template:{" "}
                <button
                  onClick={downloadExcelTemplate}
                  className="text-yellow-400 hover:underline inline-flex items-center gap-1"
                >
                  <FileSpreadsheet size={13} /> Excel (.xlsx)
                </button>
                {" "}or{" "}
                <button onClick={downloadCSVTemplate} className="text-yellow-400 hover:underline">
                  CSV
                </button>
              </li>
              <li>
                <span className="text-blue-500 mr-1">2.</span>
                Fill it in
              </li>
              <li>
                <span className="text-blue-500 mr-1">3.</span>
                Upload below (.xlsx, .csv, .tsv)
              </li>
            </ol>

            {/* Upload button */}
            <button
              onClick={() => fileRef.current?.click()}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-yellow-400 text-gray-900 text-sm font-bold hover:bg-yellow-300 transition"
            >
              <Upload size={16} />
              {fileName ? `Change file (${fileName})` : "Upload Excel or CSV"}
            </button>
            <input
              ref={fileRef}
              type="file"
              accept=".xlsx,.xls,.csv,.tsv,.txt"
              onChange={handleFile}
              className="hidden"
            />
          </div>

          {/* ── Preview table ──────────────────────────────────────────────── */}
          {rows && (
            <div>
              <div className="flex items-center gap-4 mb-3">
                {validCount > 0 && (
                  <span className="flex items-center gap-1.5 text-green-400 text-sm">
                    <CheckCircle size={14} /> {validCount} valid
                  </span>
                )}
                {errorCount > 0 && (
                  <span className="flex items-center gap-1.5 text-red-400 text-sm">
                    <AlertCircle size={14} /> {errorCount} error{errorCount !== 1 ? "s" : ""}
                  </span>
                )}
              </div>

              <div className="space-y-1.5 max-h-64 overflow-auto pr-1">
                {rows.map((r, i) => (
                  <div
                    key={i}
                    className={cn(
                      "px-4 py-3 rounded-lg border text-sm",
                      r.error
                        ? "border-red-800 bg-red-950/30"
                        : "border-green-800 bg-green-950/20"
                    )}
                  >
                    {r.error ? (
                      <p className="text-red-400 text-xs">{r.prompt}: {r.error}</p>
                    ) : (
                      <div className="flex items-start justify-between gap-3">
                        <p className="text-white text-sm flex-1">{r.prompt}</p>
                        <div className="flex gap-1.5 shrink-0 flex-wrap justify-end">
                          {r.answers.filter(Boolean).map((a, ai) => (
                            <span
                              key={ai}
                              className={cn(
                                "text-xs px-1.5 py-0.5 rounded border",
                                ai === r.correctIndex
                                  ? "text-green-300 border-green-800 bg-green-950/40"
                                  : "text-blue-400 border-blue-800"
                              )}
                            >
                              {a}
                            </span>
                          ))}
                          <span className="text-xs text-blue-400 border border-blue-800 px-1.5 py-0.5 rounded">
                            {DIFFICULTY_LABEL[r.difficulty] ?? "Medium"}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── Footer ──────────────────────────────────────────────────────── */}
        <div className="px-6 py-4 border-t border-blue-800 flex gap-3 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-blue-700 text-blue-300 text-sm hover:bg-blue-900/50 transition"
          >
            Cancel
          </button>
          {rows && validCount > 0 && (
            <button
              onClick={doImport}
              disabled={importing}
              className="px-5 py-2 rounded-lg bg-yellow-400 text-gray-900 text-sm font-bold hover:bg-yellow-300 disabled:opacity-50 transition"
            >
              {importing ? "Importing…" : `Import ${validCount} question${validCount !== 1 ? "s" : ""}`}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
