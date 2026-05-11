export type LadderRung = {
  rung: number;       // 1-based display number
  prize: string;      // formatted label e.g. "$32,000"
  prizeValue: number; // raw number for sorting/comparison
  isSafetyNet: boolean;
};

// Classic 15-question prize values
const CLASSIC_PRIZES = [
  100, 200, 300, 500, 1_000,
  2_000, 4_000, 8_000, 16_000, 32_000,
  64_000, 125_000, 250_000, 500_000, 1_000_000,
];

function samplePrizes(count: number): number[] {
  if (count <= 0) return [];
  if (count === 1) return [1_000_000];
  const result: number[] = [];
  for (let i = 0; i < count; i++) {
    const idx = Math.round((i / (count - 1)) * (CLASSIC_PRIZES.length - 1));
    result.push(CLASSIC_PRIZES[idx]);
  }
  return result;
}

function formatPrize(value: number, currencyLabel: string): string {
  const formatted = value.toLocaleString("en-US");
  if (currencyLabel === "$" || currencyLabel === "€" || currencyLabel === "£") {
    return `${currencyLabel}${formatted}`;
  }
  if (currencyLabel === "pts" || currencyLabel === "points") {
    return `${formatted} pts`;
  }
  return `${formatted} ${currencyLabel}`;
}

export function buildLadder(length: number, currencyLabel: string): LadderRung[] {
  const prizes = samplePrizes(length);
  const net1 = Math.floor(length / 3) - 1;       // index of first safety net
  const net2 = Math.floor((2 * length) / 3) - 1; // index of second safety net

  return prizes.map((prizeValue, i) => ({
    rung: i + 1,
    prize: formatPrize(prizeValue, currencyLabel),
    prizeValue,
    isSafetyNet: i === net1 || i === net2,
  }));
}

export function getSafetyNetPrize(
  ladder: LadderRung[],
  currentRungIndex: number // 0-based, question just answered wrong
): string {
  // Find the highest safety net rung below currentRungIndex
  const nets = ladder.filter((r) => r.isSafetyNet && r.rung - 1 < currentRungIndex);
  if (nets.length === 0) return formatPrize(0, ladder[0]?.prize.includes("$") ? "$" : "");
  return nets[nets.length - 1].prize;
}
