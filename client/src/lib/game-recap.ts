import { useEffect, useRef } from "react";
import type { AttemptGame, AttemptMode } from "./word-attempts";

export interface GameRecapMessage {
  type: "iread-game-recap";
  game: AttemptGame;
  mode: AttemptMode;
  bookId: string | null;
  userId?: string | null;
  wordsGuessed: number;
  hintsUsed: number;
  outcome: "win" | "loss";
}

// True when this game is running inside a parent frame (i.e. embedded via
// IREAD_FRONT's Games.js), false for the standalone iReadGames app. Used to
// suppress this app's own native "game over" modal/leaderboard dialog when
// the parent frame is about to show its own recap overlay for the same
// event — otherwise a reader sees two overlapping "you're done" screens.
export function isEmbeddedInParentFrame(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.parent !== window.self;
  } catch {
    // Cross-origin access can throw in rare setups — if we can't tell, treat
    // it as embedded, since postMessage below still degrades safely either way.
    return true;
  }
}

// The parent page (IREAD_FRONT) owns the richer recap — achievements newly
// unlocked, streak, near-miss — by diffing its own before/after snapshot of
// /reader/achievements and /reader/word-progress/summary. This just signals
// "a game finished" with the counts this session already tracks locally.
export function postGameRecap(payload: Omit<GameRecapMessage, "type">): void {
  if (!isEmbeddedInParentFrame()) return;

  const message: GameRecapMessage = { type: "iread-game-recap", ...payload };
  window.parent.postMessage(message, "*");
}

// Daily-run's own leaderboard dialog shows genuinely unique content (the
// day's ranking) that the parent's recap doesn't have — so instead of
// suppressing it like the practice-mode result modal, this defers posting
// the recap until the reader has actually seen and dismissed it, so the two
// appear one after another instead of stacked on top of each other.
//
// Waits for a real open->close transition (not just "closed"), since
// `leaderboardOpen` starts false before the game even ends.
export function useDeferredDailyRecap(
  leaderboardOpen: boolean,
  pendingRecap: Omit<GameRecapMessage, "type"> | null,
  clearPendingRecap: () => void
): void {
  const wasOpenRef = useRef(false);

  useEffect(() => {
    if (leaderboardOpen) {
      wasOpenRef.current = true;
      return;
    }
    if (wasOpenRef.current && pendingRecap) {
      postGameRecap(pendingRecap);
      clearPendingRecap();
      wasOpenRef.current = false;
    }
  }, [leaderboardOpen, pendingRecap, clearPendingRecap]);
}
