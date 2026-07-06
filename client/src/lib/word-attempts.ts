import { apiRequest } from "./queryClient";

export type HintTier = "light" | "medium" | "heavy" | null;
export type AttemptMode = "daily" | "practice";
export type AttemptGame =
  | "bee-genius"
  | "word-explorer"
  | "think-word"
  | "intellect-link";

export interface WordAttemptPayload {
  bookId: string | null;
  word: string;
  game: AttemptGame;
  mode: AttemptMode;
  correct: boolean;
  userId?: string | null;
  hintsUsed?: number;
  heaviestHintTier?: HintTier;
  fromMemory?: boolean;
}

function buildWordAttemptBody({
  bookId,
  word,
  game,
  mode,
  correct,
  userId,
  hintsUsed,
  heaviestHintTier,
  fromMemory,
}: WordAttemptPayload) {
  return {
    book_id: bookId,
    word,
    game,
    mode,
    correct,
    user_id: userId || undefined,
    hints_used: hintsUsed ?? 0,
    heaviest_hint_tier: heaviestHintTier ?? null,
    from_memory: fromMemory ?? false,
  };
}

// This is telemetry feeding the achievement system, not gameplay state — a
// failed save must never interrupt the player's win/loss flow, so failures
// are logged and swallowed rather than thrown.
export async function submitWordAttempt(payload: WordAttemptPayload): Promise<void> {
  if (!payload.bookId || !payload.word) return;

  try {
    await apiRequest("POST", "/api/word-attempt", buildWordAttemptBody(payload));
  } catch (error) {
    console.error("Failed to submit word attempt:", error);
  }
}

export async function submitWordAttempts(payloads: WordAttemptPayload[]): Promise<void> {
  await Promise.all(payloads.map((payload) => submitWordAttempt(payload)));
}

// Word Explorer's 2-level hint (0: none, 1: direction, 2: first-letter
// position) mapped onto the shared light/medium/heavy ladder.
export function hintLevelToTier(hintLevel: number): HintTier {
  if (hintLevel >= 2) return "medium";
  if (hintLevel === 1) return "light";
  return null;
}
