"use client";

import { useEffect, useCallback, useState, useRef } from "react";
import { saveTurn, endGame } from "@/lib/actions/games";
import { useGameAudio } from "@/lib/game/useGameAudio";
import "./stage.css";

export type LadderRung = {
  rung: number;
  prize: string;
  prizeValue: number;
  isSafetyNet: boolean;
};

export type GameQuestion = {
  id: string;
  prompt: string;
  answers: string[];
  correctIndex: number;
  difficulty: number;
  explanation: string | null;
};

type Phase =
  | "idle"
  | "selected"
  | "locked"
  | "correct"
  | "wrong"
  | "audience"
  | "phone"
  | "walk_away"
  | "game_over"
  | "won";

// ─── Sub-components ──────────────────────────────────────────────────────────

function LifelineBtn({ id, label, used, onActivate, disabled }: {
  id: string; label: string; used: boolean;
  onActivate: (id: string) => void; disabled: boolean;
}) {
  return (
    <button
      className={`qs-lifeline${used ? " used" : ""}`}
      onClick={() => !used && !disabled && onActivate(id)}
      disabled={used || disabled}
      title={label}
      aria-label={label}
    >
      <span className="qs-lifeline-ring" aria-hidden="true">
        {id === "fifty_fifty" && <span className="qs-ll-text">50:50</span>}
        {id === "ask_audience" && (
          <svg viewBox="0 0 32 32" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="3.5" />
            <circle cx="22" cy="13" r="3" />
            <path d="M5 24c0-3.3 2.7-6 6-6s6 2.7 6 6" />
            <path d="M18 24c0-2.5 2-4.5 4-4.5s4 2 4 4.5" />
          </svg>
        )}
        {id === "phone_friend" && (
          <svg viewBox="0 0 32 32" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 20.6l-2.6 2.6a18 18 0 01-9.6-9.6l2.6-2.6L9 6 6 6c-1.1 0-2 .9-2 2 .8 11 9.2 19.4 20.2 20.2 1.1 0 2-.9 2-2v-3l-4.8-3.6z" />
          </svg>
        )}
        {id === "switch_question" && (
          <svg viewBox="0 0 32 32" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 11h18l-4-4M27 21H9l4 4" />
          </svg>
        )}
      </span>
      <span className="qs-lifeline-label">{label}</span>
    </button>
  );
}

function AnswerPlate({ letter, text, state, shown, onClick, disabled }: {
  letter: string; text: string;
  state: "idle" | "selected" | "correct" | "wrong" | "eliminated" | "dim";
  shown: boolean; onClick: () => void; disabled: boolean;
}) {
  return (
    <button
      className={`qs-plate qs-plate-${state}`}
      onClick={shown ? onClick : undefined}
      disabled={disabled || !shown}
      style={!shown ? { visibility: "hidden" } : undefined}
    >
      <span className="qs-plate-bg" aria-hidden="true"></span>
      <span className="qs-plate-inner">
        <span className="qs-plate-letter">{letter}</span>
        <span className="qs-plate-text">{shown ? text : ""}</span>
      </span>
    </button>
  );
}

function StageLadder({ ladder, currentRung, phase }: {
  ladder: LadderRung[]; currentRung: number; phase: Phase;
}) {
  const activeRef = useRef<HTMLLIElement>(null);
  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [currentRung]);

  return (
    <aside className="qs-ladder">
      <div className="qs-ladder-header">
        <span className="qs-ladder-eyebrow">Prize Ladder</span>
      </div>
      <ol className="qs-ladder-list">
        {[...ladder].reverse().map((r) => {
          const idx = r.rung - 1;
          const isCurrent = idx === currentRung && !["correct", "wrong", "game_over", "won"].includes(phase);
          const isPassed  = idx < currentRung || phase === "won";
          return (
            <li
              key={r.rung}
              ref={isCurrent ? activeRef : undefined}
              className={`qs-rung${isCurrent ? " current" : ""}${isPassed ? " passed" : ""}${r.isSafetyNet ? " safe" : ""}`}
            >
              <span className="qs-rung-num">{String(r.rung).padStart(2, "0")}</span>
              <span className="qs-rung-mark" aria-hidden="true">◆</span>
              <span className="qs-rung-prize">{r.prize}</span>
            </li>
          );
        })}
      </ol>
    </aside>
  );
}

function AudienceOverlay({ tally, answers, onChange, onClose }: {
  tally: [number, number, number, number];
  answers: (string | null)[];
  onChange: (t: [number, number, number, number]) => void;
  onClose: () => void;
}) {
  const total = tally.reduce((a, b) => a + b, 0) || 1;
  const labels = ["A", "B", "C", "D"];

  function adjust(i: number, delta: number) {
    const next = [...tally] as [number, number, number, number];
    next[i] = Math.max(0, next[i] + delta);
    onChange(next);
  }

  return (
    <div className="qs-overlay" onClick={onClose}>
      <div className="qs-audience-panel" onClick={(e) => e.stopPropagation()}>
        <div className="qs-overlay-head">
          <span className="qs-overlay-eyebrow">Lifeline · Ask the Audience</span>
          <button className="qs-overlay-close" onClick={onClose}>Close ✕</button>
        </div>
        <div className="qs-audience-bars">
          {labels.map((l, i) => {
            if (answers[i] === null) return null;
            const pct = Math.round((tally[i] / total) * 100);
            return (
              <div className="qs-audience-col" key={i}>
                <span className="qs-audience-letter">{l}</span>
                <div className="qs-audience-track">
                  <div className="qs-audience-fill" style={{ height: `${pct}%` }}>
                    {pct >= 10 && <span className="qs-audience-pct">{pct}%</span>}
                  </div>
                </div>
                <span className="qs-audience-name">{answers[i]}</span>
                <div className="qs-audience-controls">
                  <button className="qs-audience-btn" onClick={() => adjust(i, -1)}>−</button>
                  <span className="qs-audience-count">{tally[i]}</span>
                  <button className="qs-audience-btn" onClick={() => adjust(i, 1)}>+</button>
                </div>
              </div>
            );
          })}
        </div>
        <button className="qs-audience-done" onClick={onClose}>Done</button>
      </div>
    </div>
  );
}

function PhoneOverlay({ onClose }: { onClose: () => void }) {
  const [seconds, setSeconds] = useState(30);
  useEffect(() => {
    const id = setInterval(() => setSeconds((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(id);
  }, []);
  const pct = seconds / 30;
  const C = 2 * Math.PI * 54;
  return (
    <div className="qs-overlay" onClick={onClose}>
      <div className="qs-phone-panel" onClick={(e) => e.stopPropagation()}>
        <div className="qs-overlay-head">
          <span className="qs-overlay-eyebrow">Lifeline · Phone a Friend</span>
          <button className="qs-overlay-close" onClick={onClose}>End call ✕</button>
        </div>
        <div className="qs-phone-ring">
          <svg viewBox="0 0 120 120" width="180" height="180">
            <circle cx="60" cy="60" r="54" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="6" />
            <circle cx="60" cy="60" r="54" fill="none"
              stroke="var(--qs-accent)" strokeWidth="6"
              strokeDasharray={C}
              strokeDashoffset={C * (1 - pct)}
              strokeLinecap="round"
              transform="rotate(-90 60 60)"
              style={{ transition: "stroke-dashoffset 1s linear" }} />
          </svg>
          <div className="qs-phone-num">{seconds}</div>
        </div>
        <p className="qs-phone-tag">Friend on the line — 30 seconds.</p>
      </div>
    </div>
  );
}

function GameOverCard({ won, studentName, finalPrize }: {
  won: boolean; studentName: string | null; finalPrize: string;
}) {
  return (
    <div className="qs-gameover">
      <div className="qs-gameover-card">
        <div className="qs-gameover-eyebrow">{won ? "Top Prize" : "Final Total"}</div>
        <div className="qs-gameover-prize">{finalPrize}</div>
        <div className="qs-gameover-line"></div>
        <div className="qs-gameover-name">{studentName ?? "Contestant"}</div>
        <div className="qs-gameover-status">{won ? "Wins the top prize" : "Walks away with"}</div>
        <a href="/dashboard" className="qs-gameover-reset">Back to Dashboard →</a>
      </div>
    </div>
  );
}

// ─── Main stage ───────────────────────────────────────────────────────────────

const LIFELINES = [
  { id: "fifty_fifty",    label: "50:50" },
  { id: "ask_audience",  label: "Ask the audience" },
  { id: "phone_friend",  label: "Phone a friend" },
  { id: "switch_question", label: "Switch question" },
];

export default function GameStage({
  gameId,
  studentName,
  ladder,
  questions,
}: {
  gameId: string;
  setId: string;
  studentName: string | null;
  ladder: LadderRung[];
  questions: GameQuestion[];
}) {
  const audio = useGameAudio();

  const [phase, setPhase] = useState<Phase>("idle");
  const [rung, setRung] = useState(0);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [shownAnswers, setShownAnswers] = useState<(string | null)[]>(questions[0]?.answers ?? []);
  const [lifelinesUsed, setLifelinesUsed] = useState<Set<string>>(new Set());
  const [audienceTally, setAudienceTally] = useState<[number, number, number, number]>([0, 0, 0, 0]);
  const startTimeRef = useRef<number>(Date.now());

  // Lock body scroll for full-screen stage; stop audio on unmount
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
      audio.stop();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Phase → audio
  useEffect(() => {
    if (phase === "idle" || phase === "selected" || phase === "audience" || phase === "phone") {
      audio.play("thinking");
    } else if (phase === "locked") {
      audio.stop("thinking");
    } else if (phase === "correct") {
      audio.stop("thinking");
      audio.play("correct");
    } else if (phase === "wrong" || phase === "game_over") {
      audio.stop("thinking");
      audio.play("wrong");
    } else if (phase === "won") {
      audio.stop("thinking");
      audio.play("winner");
    } else if (phase === "walk_away") {
      audio.stop("thinking");
      audio.play("winner");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  const questionsRef = useRef(questions);
  useEffect(() => { questionsRef.current = questions; }, [questions]);
  const q = questionsRef.current[rung] ?? questions[rung];

  const currentLadderRung = ladder[rung];
  const isLastRung = rung === ladder.length - 1;

  const safetyNetPrize = ladder
    .filter((r) => r.isSafetyNet && r.rung - 1 < rung)
    .at(-1)?.prize ?? "nothing";

  // ── Helpers ───────────────────────────────────────────────────────────────
  function trySelect(idx: number) {
    if (!["idle", "selected"].includes(phase)) return;
    if (shownAnswers[idx] === null) return;
    setSelectedIdx(idx);
    setPhase("selected");
  }

  function cancelSelection() {
    if (phase === "selected") { setSelectedIdx(null); setPhase("idle"); }
    if (phase === "audience") setPhase("idle");
    if (phase === "phone") setPhase("idle");
    if (phase === "walk_away") setPhase("idle");
  }

  function confirmSelection() {
    if (phase === "selected" && selectedIdx !== null) lockIn();
    if (phase === "walk_away") void doWalkAway();
  }

  function lockIn() {
    if (selectedIdx === null || !q) return;
    setPhase("locked");
    setTimeout(() => {
      const correct = selectedIdx === q.correctIndex;
      setPhase(correct ? "correct" : "wrong");
      void recordTurn(selectedIdx, correct);
    }, 1800);
  }

  function triggerWalkAway() {
    if (!["idle", "selected"].includes(phase)) return;
    setPhase("walk_away");
  }

  async function doWalkAway() {
    const prize = rung > 0 ? ladder[rung - 1].prize : "nothing";
    await recordTurn(null, null, true);
    await endGame({ gameId, outcome: "walked_away", finalPrize: prize });
    setPhase("game_over");
  }

  async function recordTurn(chosenIndex: number | null, isCorrect: boolean | null, walkedAway = false) {
    if (!q) return;
    await saveTurn({
      gameId,
      questionId: q.id,
      rungIndex: rung,
      shownAnswers,
      chosenIndex,
      isCorrect,
      lifelineUsed: null,
      walkedAway,
      timeMs: Date.now() - startTimeRef.current,
    });
  }

  useEffect(() => {
    if (phase !== "correct") return;
    const t = setTimeout(async () => {
      if (isLastRung) {
        await endGame({ gameId, outcome: "won_top", finalPrize: currentLadderRung.prize });
        setPhase("won");
      } else {
        const nextRung = rung + 1;
        setRung(nextRung);
        setShownAnswers(questionsRef.current[nextRung]?.answers ?? []);
        setSelectedIdx(null);
        startTimeRef.current = Date.now();
        setPhase("idle");
      }
    }, 2400);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  useEffect(() => {
    if (phase !== "wrong") return;
    const t = setTimeout(async () => {
      await endGame({ gameId, outcome: "wrong_answer", finalPrize: safetyNetPrize });
      setPhase("game_over");
    }, 3000);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  // ── Lifelines ─────────────────────────────────────────────────────────────
  function activateLifeline(lifeline: string) {
    if (!["idle", "selected"].includes(phase)) return;
    if (lifelinesUsed.has(lifeline)) return;
    const next = new Set(lifelinesUsed);
    next.add(lifeline);
    setLifelinesUsed(next);
    if (lifeline === "fifty_fifty") doFiftyFifty();
    if (lifeline === "ask_audience") { setAudienceTally([0, 0, 0, 0]); setPhase("audience"); }
    if (lifeline === "phone_friend") setPhase("phone");
    if (lifeline === "switch_question") doSwitch();
  }

  function doFiftyFifty() {
    if (!q) return;
    const wrong = q.answers
      .map((_, i) => i)
      .filter((i) => i !== q.correctIndex && shownAnswers[i] !== null);
    const toRemove = wrong.sort(() => Math.random() - 0.5).slice(0, 2);
    const next = [...shownAnswers] as (string | null)[];
    toRemove.forEach((i) => { next[i] = null; });
    setShownAnswers(next);
    if (selectedIdx !== null && toRemove.includes(selectedIdx)) {
      setSelectedIdx(null);
      setPhase("idle");
    }
  }

  function doSwitch() {
    const usedIds = new Set(questionsRef.current.slice(0, rung + 1).map((q) => q.id));
    const replacement =
      questionsRef.current.find((q) => !usedIds.has(q.id) && q.difficulty === questionsRef.current[rung]?.difficulty) ??
      questionsRef.current.find((q) => !usedIds.has(q.id));
    if (!replacement) return;
    const newQuestions = [...questionsRef.current];
    newQuestions[rung] = replacement;
    questionsRef.current = newQuestions;
    setShownAnswers(replacement.answers.slice());
    setSelectedIdx(null);
    setPhase("idle");
  }

  // ── Keyboard ──────────────────────────────────────────────────────────────
  const handleKey = useCallback((e: KeyboardEvent) => {
    const k = e.key.toLowerCase();
    if (["a", "1"].includes(k)) trySelect(0);
    else if (["b", "2"].includes(k)) trySelect(1);
    else if (["c", "3"].includes(k)) trySelect(2);
    else if (["d", "4"].includes(k)) trySelect(3);
    else if (k === "enter" || k === " ") confirmSelection();
    else if (k === "escape") cancelSelection();
    else if (k === "f") activateLifeline("fifty_fifty");
    else if (k === "q") activateLifeline("ask_audience");
    else if (k === "p") activateLifeline("phone_friend");
    else if (k === "s") activateLifeline("switch_question");
    else if (k === "w") triggerWalkAway();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, selectedIdx, rung, lifelinesUsed, shownAnswers]);

  useEffect(() => {
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [handleKey]);

  // ── Render ────────────────────────────────────────────────────────────────
  if (phase === "game_over" || phase === "won") {
    return (
      <GameOverCard
        won={phase === "won"}
        studentName={studentName}
        finalPrize={phase === "won" ? (currentLadderRung?.prize ?? "") : safetyNetPrize}
      />
    );
  }

  const canInteract = ["idle", "selected"].includes(phase);

  return (
    <div className="qs-stage">
      <div className="qs-stage-bg"></div>
      <div className="qs-stage-floor"></div>

      {/* Top bar */}
      <header className="qs-topbar">
        <div className="qs-topbar-left">
          <span className="qs-brand-mark" aria-hidden="true">
            <span className="qs-brand-diamond"></span>
          </span>
          <div className="qs-brand-text">
            <span className="qs-brand-line1">QUIZ STAGE</span>
            <span className="qs-brand-line2">Question {rung + 1} of {ladder.length}</span>
          </div>
        </div>

        <div className="qs-lifelines">
          {LIFELINES.map((l) => (
            <LifelineBtn
              key={l.id}
              id={l.id}
              label={l.label}
              used={lifelinesUsed.has(l.id)}
              onActivate={activateLifeline}
              disabled={!canInteract}
            />
          ))}
        </div>

        <div className="qs-topbar-right">
          {studentName && (
            <div className="qs-contestant">
              <span className="qs-contestant-eyebrow">Contestant</span>
              <span className="qs-contestant-name">{studentName}</span>
            </div>
          )}

          {/* Volume control */}
          <div className="qs-volume">
            <button
              className={`qs-volume-btn${audio.muted ? " muted" : ""}`}
              onClick={audio.toggleMute}
              title={audio.muted ? "Unmute" : "Mute"}
              aria-label={audio.muted ? "Unmute music" : "Mute music"}
            >
              {audio.muted ? (
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
                  <line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/>
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
                  <path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
                  <path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>
                </svg>
              )}
            </button>
            <input
              type="range" min={0} max={1} step={0.02}
              value={audio.volume}
              onChange={(e) => audio.setVolume(parseFloat(e.target.value))}
              className="qs-volume-slider"
              style={{ "--qs-vol-pct": `${audio.volume * 100}%` } as React.CSSProperties}
              aria-label="Music volume"
            />
          </div>

          <button
            className="qs-walk-away"
            onClick={triggerWalkAway}
            disabled={!canInteract}
          >
            Walk away
          </button>
        </div>
      </header>

      {/* Center board */}
      <main className="qs-board">
        <div className="qs-question-plinth">
          <p className="qs-qp-prompt">{q?.prompt}</p>
        </div>

        <div className="qs-plates">
          {[0, 1, 2, 3].map((i) => {
            const tileState =
              shownAnswers[i] === null ? "eliminated"
              : phase === "correct" && i === q?.correctIndex ? "correct"
              : phase === "wrong" && i === selectedIdx ? "wrong"
              : phase === "wrong" && i === q?.correctIndex ? "correct"
              : (phase === "selected" || phase === "locked") && i === selectedIdx ? "selected"
              : phase === "locked" ? "dim"
              : "idle";
            return (
              <AnswerPlate
                key={`${rung}-${i}`}
                letter={["A", "B", "C", "D"][i]}
                text={q?.answers[i] ?? ""}
                shown={shownAnswers[i] !== null}
                state={tileState}
                disabled={!canInteract}
                onClick={() => trySelect(i)}
              />
            );
          })}
        </div>

        <div className="qs-lockbar">
          {phase === "selected" && (
            <button className="qs-lock-btn" onClick={lockIn}>
              Final answer <span className="qs-lock-kbd">↵</span>
            </button>
          )}
          {phase === "locked" && (
            <p className="qs-lock-hint locked">Final Answer locked…</p>
          )}
          {phase === "correct" && (
            <p className="qs-lock-hint correct">Correct — {currentLadderRung?.prize}</p>
          )}
          {phase === "wrong" && (
            <p className="qs-lock-hint wrong">That&apos;s incorrect.</p>
          )}
          {phase === "walk_away" && (
            <p className="qs-lock-hint walkaway">
              Walk away with <strong>{rung > 0 ? ladder[rung - 1].prize : "nothing"}</strong>?{" "}
              Press <kbd>↵</kbd> to confirm · <kbd>Esc</kbd> to cancel
            </p>
          )}
          {phase === "idle" && (
            <p className="qs-lock-hint">
              Pick A–D · <kbd>1–4</kbd> · <kbd>F</kbd> 50:50 · <kbd>Enter</kbd> to lock · <kbd>W</kbd> walk away
            </p>
          )}
        </div>
      </main>

      <StageLadder ladder={ladder} currentRung={rung} phase={phase} />

      {phase === "audience" && (
        <AudienceOverlay
          tally={audienceTally}
          answers={shownAnswers}
          onChange={setAudienceTally}
          onClose={() => setPhase("idle")}
        />
      )}
      {phase === "phone" && (
        <PhoneOverlay onClose={() => setPhase("idle")} />
      )}

      <div className="qs-kbd-legend" aria-hidden="true">
        <span>A-D: select</span>
        <span>Enter: lock</span>
        <span>F: 50:50</span>
        <span>Q: audience</span>
        <span>P: phone</span>
        <span>S: switch</span>
        <span>W: walk away</span>
      </div>
    </div>
  );
}
