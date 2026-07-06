import { useState } from "react";
import { useLocation } from "wouter";
import {
  PartyPopper,
  RotateCcw,
  Shuffle,
  Home,
  Frown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Confetti } from "@/components/ui/confetti";
import { GAME_META, type GameKey } from "@/lib/game-meta";

export type { GameKey };

export interface GameResultStats {
  wordsFound?: number;
  guessesUsed?: number;
  timeSpentSeconds?: number;
  hintsUsed?: number;
}

interface GameResultModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  gameName: GameKey;
  outcome: "win" | "loss" | null;
  stats?: GameResultStats;
  onPlayAgain: () => void;
}

const carryOverParams = () => {
  const current = new URLSearchParams(window.location.search);
  const params = new URLSearchParams();
  for (const key of ["id", "school_id", "user_id"]) {
    const value = current.get(key);
    if (value) params.set(key, value);
  }
  return params;
};

const formatTime = (seconds: number) => {
  const safeSeconds = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(safeSeconds / 60);
  const remaining = safeSeconds % 60;
  return `${minutes}:${remaining.toString().padStart(2, "0")}`;
};

const STAT_LABELS: Record<keyof GameResultStats, string> = {
  wordsFound: "Words Found",
  guessesUsed: "Guesses Used",
  timeSpentSeconds: "Time",
  hintsUsed: "Hints Used",
};

/**
 * Shared post-game surface for practice mode across all games.
 * Replaces the old per-game inline win/loss banners so celebration,
 * stats, and "what's next" navigation look and behave the same everywhere.
 */
export default function GameResultModal({
  open,
  onOpenChange,
  gameName,
  outcome,
  stats,
  onPlayAgain,
}: GameResultModalProps) {
  const [pickingGame, setPickingGame] = useState(false);
  const [, setLocation] = useLocation();

  if (!outcome) return null;

  const isWin = outcome === "win";
  const otherGames = (Object.keys(GAME_META) as GameKey[]).filter(
    (key) => key !== gameName
  );

  const goToMenu = () => {
    const params = carryOverParams();
    const queryString = params.toString();
    setLocation(queryString ? `/?${queryString}` : "/");
  };

  const goToGame = (key: GameKey) => {
    const params = carryOverParams();
    const queryString = params.toString();
    const route = GAME_META[key].practiceRoute;
    setLocation(queryString ? `${route}?${queryString}` : route);
  };

  const handlePlayAgain = () => {
    setPickingGame(false);
    onPlayAgain();
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) setPickingGame(false);
        onOpenChange(next);
      }}
    >
      <DialogContent className="overflow-hidden p-0 sm:max-w-md">
        {isWin && open ? <Confetti /> : null}
        <div
          className={
            isWin
              ? "bg-primary px-5 py-5 text-primary-foreground"
              : "bg-muted px-5 py-5"
          }
        >
          <DialogHeader className="text-left">
            <div className="flex items-center gap-3">
              <div
                className={`flex h-11 w-11 items-center justify-center rounded-full shadow-sm ${
                  isWin
                    ? "animate-bounce bg-primary-foreground text-primary"
                    : "bg-background text-muted-foreground"
                }`}
              >
                {isWin ? (
                  <PartyPopper className="h-6 w-6" />
                ) : (
                  <Frown className="h-6 w-6" />
                )}
              </div>
              <div>
                <DialogTitle className={isWin ? "text-xl" : "text-xl"}>
                  {isWin ? "Nicely done!" : "So close!"}
                </DialogTitle>
                <DialogDescription
                  className={isWin ? "text-primary-foreground/80" : ""}
                >
                  {isWin
                    ? "You completed the puzzle."
                    : "Didn't finish this time — every round builds your skills."}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
        </div>

        <div className="flex flex-col gap-4 p-5">
          {stats && Object.keys(stats).length > 0 ? (
            <div className="grid grid-cols-2 gap-2 rounded-lg bg-muted/50 p-3 text-center sm:grid-cols-4">
              {(Object.keys(STAT_LABELS) as (keyof GameResultStats)[])
                .filter((key) => stats[key] !== undefined)
                .map((key) => (
                  <div key={key}>
                    <p className="text-lg font-bold text-primary">
                      {key === "timeSpentSeconds"
                        ? formatTime(stats[key] as number)
                        : stats[key]}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {STAT_LABELS[key]}
                    </p>
                  </div>
                ))}
            </div>
          ) : null}

          {!pickingGame ? (
            <div className="flex flex-col gap-2">
              <Button onClick={handlePlayAgain}>
                <RotateCcw className="h-4 w-4" />
                Play Again
              </Button>
              <Button variant="outline" onClick={() => setPickingGame(true)}>
                <Shuffle className="h-4 w-4" />
                Try Another Game
              </Button>
              <Button variant="ghost" onClick={goToMenu}>
                <Home className="h-4 w-4" />
                Back to Menu
              </Button>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <div className="grid grid-cols-3 gap-2">
                {otherGames.map((key) => {
                  const meta = GAME_META[key];
                  const Icon = meta.icon;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => goToGame(key)}
                      className="flex flex-col items-center gap-1 rounded-lg border p-3 text-xs font-medium transition-colors hover:bg-accent"
                    >
                      <Icon className="h-5 w-5" />
                      {meta.label}
                    </button>
                  );
                })}
              </div>
              <Button variant="ghost" onClick={() => setPickingGame(false)}>
                Back
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
