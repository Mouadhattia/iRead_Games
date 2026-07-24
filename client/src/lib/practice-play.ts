import { apiRequest } from "./queryClient";
import type { AttemptGame } from "./word-attempts";

export interface PracticePlayPayload {
  bookId: string | null;
  userId?: string | null;
  game: AttemptGame;
  score?: number;
  wordsLearned?: string[];
  timeSpentSeconds?: number;
}

function buildPracticePlayBody({
  bookId,
  userId,
  game,
  score,
  wordsLearned,
  timeSpentSeconds,
}: PracticePlayPayload) {
  return {
    book_id: bookId,
    user_id: userId || undefined,
    game,
    score: score ?? 0,
    words_learned: wordsLearned,
    time_spent_seconds: timeSpentSeconds,
  };
}

// Logs one finished practice-mode round (win or loss) so the parent
// dashboard's "games played" chart sees practice play, not just Daily Run --
// same fire-and-forget contract as submitWordAttempt: a failed save must
// never interrupt the player's own win/loss flow.
export async function submitPracticePlay(payload: PracticePlayPayload): Promise<void> {
  if (!payload.bookId) return;

  try {
    await apiRequest("POST", "/api/practice-play", buildPracticePlayBody(payload));
  } catch (error) {
    console.error("Failed to submit practice play:", error);
  }
}
