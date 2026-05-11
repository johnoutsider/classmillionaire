import Papa from "papaparse";
import * as XLSX from "xlsx";
import type { NewQuestion } from "@/lib/db/schema";

export type ParsedRow = {
  prompt: string;
  type: "mcq4" | "tf";
  answers: [string, string, string, string];
  correctIndex: number;
  difficulty: number;
  explanation?: string;
  error?: string;
};

// ─── Difficulty Normaliser ────────────────────────────────────────────────────

function normaliseDifficulty(raw: string | number | undefined): number {
  if (raw === undefined || raw === null || raw === "") return 2;
  const s = String(raw).toLowerCase().trim();
  if (s === "easy" || s === "1") return 1;
  if (s === "medium" || s === "2") return 2;
  if (s === "hard" || s === "3") return 3;
  const n = parseInt(s, 10);
  if (!isNaN(n) && n >= 1 && n <= 3) return n;
  return 2;
}

// ─── Row builder helper ───────────────────────────────────────────────────────

function buildRow(
  i: number,
  prompt: string,
  a: string,
  b: string,
  c: string,
  d: string,
  correctRaw: string,
  difficultyRaw: string | number | undefined,
  explanation: string | undefined,
): ParsedRow {
  if (!prompt) return rowError(i, "Missing question/prompt");

  const correctUp = correctRaw.trim().toUpperCase();
  const correctLetterMap: Record<string, number> = { A: 0, B: 1, C: 2, D: 3 };
  const correctNumMap: Record<string, number> = { "0": 0, "1": 1, "2": 2, "3": 3 };

  // Blooket uses "1,4" notation → take first answer number, convert to 0-based index
  let correctIndex = -1;
  if (correctLetterMap[correctUp] !== undefined) {
    correctIndex = correctLetterMap[correctUp];
  } else if (correctNumMap[correctUp] !== undefined) {
    correctIndex = correctNumMap[correctUp];
  } else {
    // Try Blooket format: "1" or "1,4" (1-based)
    const firstNum = parseInt(correctRaw.split(",")[0].trim(), 10);
    if (!isNaN(firstNum) && firstNum >= 1 && firstNum <= 4) {
      correctIndex = firstNum - 1; // convert to 0-based
    }
  }

  if (correctIndex === -1) {
    return rowError(i, `'Correct Answer' must be A/B/C/D, 1/2/3/4, or A-D — got "${correctRaw}"`);
  }

  const difficulty = normaliseDifficulty(difficultyRaw);

  const isTF =
    (a.toLowerCase() === "true" || a.toLowerCase() === "false") &&
    (b.toLowerCase() === "true" || b.toLowerCase() === "false") &&
    !c &&
    !d;

  if (isTF && correctIndex > 1) return rowError(i, "True/False: correct must be A or B");

  if (!a || !b) return rowError(i, "Answer A and B are required");
  if (!isTF && (!c || !d))
    return rowError(i, "Answers C and D required for MCQ (or use True/False)");

  return {
    prompt,
    type: isTF ? "tf" : "mcq4",
    answers: [a, b, c, d],
    correctIndex,
    difficulty,
    explanation: explanation?.trim() || undefined,
  };
}

function rowError(i: number, msg: string): ParsedRow {
  return {
    prompt: `Row ${i + 2}`,
    type: "mcq4",
    answers: ["", "", "", ""],
    correctIndex: 0,
    difficulty: 2,
    error: msg,
  };
}

// ─── CSV Parser ───────────────────────────────────────────────────────────────

/**
 * Expected CSV columns (case-insensitive, order flexible):
 * prompt/question, a/answer a/answer 1, b/answer b/answer 2,
 * c/answer c/answer 3, d/answer d/answer 4,
 * correct/correct answer, difficulty, explanation
 *
 * Also supports Blooket CSV format (Question Text, Answer 1..4, Correct Answer(s), Time Limit)
 * Also supports Grammar Questions format (Topic, Question, Option A..D, Answer, Explanation)
 */
export function parseCSV(raw: string): ParsedRow[] {
  const { data, errors } = Papa.parse<Record<string, string>>(raw.trim(), {
    header: true,
    skipEmptyLines: true,
    // Lowercase, strip a trailing "(optional)" or any other parenthesised
    // annotation so headers like "Answer C (Optional)" match "answer c".
    transformHeader: (h) =>
      h.trim().toLowerCase().replace(/\s*\([^)]*\)\s*$/, "").trim(),
  });

  if (errors.length && data.length === 0) {
    return [
      {
        prompt: "",
        type: "mcq4",
        answers: ["", "", "", ""],
        correctIndex: 0,
        difficulty: 2,
        error: "CSV parse error: " + errors[0].message,
      },
    ];
  }

  return data.map((row, i) => {
    // Try multiple column name conventions
    const prompt = (
      row["prompt"] ??
      row["question"] ??
      row["question text"] ??
      ""
    ).trim();

    const a = (row["a"] ?? row["answer a"] ?? row["answer 1"] ?? row["option a"] ?? "").trim();
    const b = (row["b"] ?? row["answer b"] ?? row["answer 2"] ?? row["option b"] ?? "").trim();
    const c = (row["c"] ?? row["answer c"] ?? row["answer 3"] ?? row["option c"] ?? "").trim();
    const d = (row["d"] ?? row["answer d"] ?? row["answer 4"] ?? row["option d"] ?? "").trim();

    const correctRaw = (
      row["correct"] ??
      row["correct answer"] ??
      row["correct answer(s)"] ??
      row["answer"] ??
      ""
    ).trim();

    const difficultyRaw = row["difficulty"] ?? row["time limit (sec)"] ?? undefined;
    const explanation = (row["explanation"] ?? row["explanation (optional)"] ?? "").trim() || undefined;

    return buildRow(i, prompt, a, b, c, d, correctRaw, difficultyRaw, explanation);
  });
}

// ─── Excel (.xlsx) Parser ─────────────────────────────────────────────────────

/** Keywords that identify a real header row */
const HEADER_KEYWORDS = ["question", "answer", "correct", "prompt", "option"];

function looksLikeHeaderRow(cells: string[]): boolean {
  const lower = cells.map((c) => String(c).toLowerCase().split(/\r?\n/)[0].trim());
  return HEADER_KEYWORDS.some((kw) => lower.some((c) => c.includes(kw)));
}

/**
 * Parses an ArrayBuffer from an .xlsx file.
 * Auto-detects the real header row (scans up to first 5 rows), so it handles:
 *   - Native format: Question, Answer A..D, Correct Answer, Difficulty, Explanation
 *   - Blooket format: title banner in row 0, headers in row 1, data from row 2
 *   - Grammar-Questions format: Topic, Question, Option A..D, Answer, Explanation
 */
export function parseXLSX(buffer: ArrayBuffer): ParsedRow[] {
  const wb = XLSX.read(buffer, { type: "array" });
  const ws = wb.Sheets[wb.SheetNames[0]];

  // Read as array-of-arrays so we can detect the header row ourselves
  const aoa = XLSX.utils.sheet_to_json<string[]>(ws, { header: 1, defval: "", raw: false });

  if (aoa.length === 0) return [rowError(-1, "Spreadsheet appears to be empty")];

  // Find the header row — the first row containing known column keywords
  let headerRowIdx = 0;
  for (let i = 0; i < Math.min(5, aoa.length); i++) {
    if (looksLikeHeaderRow(aoa[i])) { headerRowIdx = i; break; }
  }

  const headers: string[] = aoa[headerRowIdx].map((h) =>
    String(h)
      .toLowerCase()
      .split(/\r?\n/)[0]
      .trim()
      // Strip a trailing "(optional)" / "(something)" annotation
      .replace(/\s*\([^)]*\)\s*$/, "")
      .trim()
  );

  const dataRows = aoa.slice(headerRowIdx + 1);
  if (dataRows.length === 0) return [rowError(-1, "No data rows found after header")];

  const parsed: ParsedRow[] = [];

  dataRows.forEach((cells, i) => {
    // Skip fully-empty rows
    if (cells.every((c) => String(c).trim() === "")) return;

    // Build a keyed object from headers + cells
    const r: Record<string, string> = {};
    headers.forEach((h, colIdx) => {
      if (h) r[h] = String(cells[colIdx] ?? "").trim();
    });

    const prompt = (r["question"] ?? r["question text"] ?? r["prompt"] ?? "").trim();
    const a = (r["answer a"] ?? r["answer 1"] ?? r["a"] ?? r["option a"] ?? "").trim();
    const b = (r["answer b"] ?? r["answer 2"] ?? r["b"] ?? r["option b"] ?? "").trim();
    const c = (r["answer c"] ?? r["answer 3"] ?? r["c"] ?? r["option c"] ?? "").trim();
    const d = (r["answer d"] ?? r["answer 4"] ?? r["d"] ?? r["option d"] ?? "").trim();

    const correctRaw = (
      r["correct answer"] ??
      r["correct answer(s)"] ??
      r["answer"] ??
      r["correct"] ??
      ""
    ).trim();

    const difficultyRaw = r["difficulty"] ?? undefined;
    const explanation = (r["explanation (optional)"] ?? r["explanation"] ?? "").trim() || undefined;

    parsed.push(buildRow(i, prompt, a, b, c, d, correctRaw, difficultyRaw, explanation));
  });

  return parsed.length > 0 ? parsed : [rowError(-1, "No valid data rows found")];
}

// ─── In-memory CSV template (for copy/download) ───────────────────────────────

export const CSV_TEMPLATE = `Question,Answer A,Answer B,Answer C (Optional),Answer D (Optional),Correct Answer,Difficulty,Explanation (Optional)
What is the capital of France?,Paris,Berlin,Madrid,Rome,A,easy,Paris has been the capital since the Middle Ages
True or False: The sun is a star,TRUE,FALSE,,,A,medium,
What is 2+2?,3,4,5,6,B,hard,`;
