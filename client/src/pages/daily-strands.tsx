import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ChevronLeft, ChevronRight, HelpCircle, Timer } from "lucide-react";
import Board from "@/components/strands/board";
import { getHintUnlockWordCount, useStrandsStore } from "@/lib/strands";
import { useGameStore } from "@/lib/game";
import { fetchJsonOrThrow } from "@/lib/queryClient";
import { GameConfig } from "@shared/config";
import FoundWordsPanel from "@/components/shared/found-words-panel";
import HintStatus from "@/components/shared/hint-status";
import TutorialModal from "@/components/game/tutorial-modal";
import GameLoadError, {
  getErrorMessage,
} from "@/components/shared/game-load-error";
import { DailyLeaderboardDialog } from "@/components/shared/daily-leaderboard";
import {
  fetchDailyResultStatus,
  isCompletedGameResult,
  isCompletedCurrentGameResult,
  isCurrentGameResult,
  saveOrUpdateDailyResult,
} from "@/lib/daily-attempt";
import { useGameView } from "@/lib/game-view";
import { submitWordAttempt, submitWordAttempts } from "@/lib/word-attempts";
import {
  useDeferredDailyRecap,
  type GameRecapMessage,
} from "@/lib/game-recap";
import { useOpenCloseTransition } from "@/lib/use-open-close-transition";
import DailyPlayNextModal from "@/components/shared/daily-play-next-modal";

type WordPosition = [string, [number, number][]];

interface DailyStrandsPuzzle {
  letters: string[][];
  size: number;
  themedWords: string[];
  wordPositions: WordPosition[];
}

const useQuerys = () => {
  return new URLSearchParams(window.location.search);
};

const GAME_KEY = "intellect-link";

const formatTime = (seconds: number) => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
};

export default function DailyStrands() {
  const query = useQuerys();
  const id = query.get("id");
  const date = query.get("date");
  const competition = query.get("competition");
  const userId = query.get("user_id");
  const schoolId =
    query.get("school_id") || query.get("school") || query.get("shcool_id");
  const packId = query.get("pack_id");
  const isCompetition = competition === "true";
  const mainMenuParams = new URLSearchParams();
  if (id) mainMenuParams.set("id", id);
  if (schoolId) mainMenuParams.set("school_id", schoolId);
  const mainMenuPath = mainMenuParams.toString()
    ? `/?${mainMenuParams.toString()}`
    : "/";
  const practicePath = mainMenuParams.toString()
    ? `/strands?${mainMenuParams.toString()}`
    : "/strands";
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [currentPuzzleIndex, setCurrentPuzzleIndex] = useState(0);
  const [puzzles, setPuzzles] = useState<DailyStrandsPuzzle[]>([]);
  const [loading, setLoading] = useState(true);
  const [scores, setScores] = useState<number[]>([]);
  const [timerSeconds, setTimerSeconds] = useState<number>(
    GameConfig.dailyChallenge.strands.timeLimit
  );
  const [hintUnlockWordCount, setHintUnlockWordCount] = useState<number | null>(
    null
  );
  const [timeLeft, setTimeLeft] = useState<number>(
    GameConfig.dailyChallenge.strands.timeLimit
  );
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [timerEnabled, setTimerEnabled] = useState(true);
  const [isGameOver, setIsGameOver] = useState(false);
  const [endReason, setEndReason] = useState<"complete" | "time" | null>(
    null
  );
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [pendingRecap, setPendingRecap] = useState<Omit<
    GameRecapMessage,
    "type"
  > | null>(null);
  useDeferredDailyRecap(showLeaderboard, pendingRecap, () =>
    setPendingRecap(null)
  );
  const [showPlayNext, setShowPlayNext] = useState(false);
  useOpenCloseTransition(showLeaderboard, () => setShowPlayNext(true));
  const [showTutorial, setShowTutorial] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [dailyDate, setDailyDate] = useState<string | null>(date);
  const { isKids } = useGameView();
  const pageTitle = isCompetition
    ? isKids
      ? "Link Tournament"
      : "Competition Intellect Link"
    : isKids
    ? "Letter Links"
    : "Daily Intellect Link";

  const {
    addFoundWord,
    foundWords,
    score,
    resetGame,
    setPuzzle,
    themedWords,
    wordPositions,
    nonThemedWords,
    hintsAvailable,
    hintsUsed,
    revealedWord,
    useHint,
  } = useStrandsStore();
  const { result, getResult } = useGameStore();
  const hasCurrentResult = isCurrentGameResult(result, GAME_KEY, id, dailyDate);
  const hasCompletedCurrentResult = isCompletedCurrentGameResult(
    result,
    GAME_KEY,
    id,
    dailyDate
  );
  const [dailyAttemptState, setDailyAttemptState] = useState<
    "checking" | "ready" | "blocked"
  >(!id || isCompetition ? "ready" : "checking");
  const canPlayDaily = isCompetition || dailyAttemptState === "ready";

  const allFoundWords = Object.values(foundWords).flat();

  useEffect(() => {
    if (
      isCompetition ||
      dailyAttemptState !== "checking" ||
      !hasCompletedCurrentResult
    ) {
      return;
    }

    setDailyAttemptState("blocked");
    toast({
      title: "Daily challenge already played",
      description: "You can play this daily challenge again tomorrow.",
      variant: "destructive",
    });
    setLocation(mainMenuPath);
  }, [
    dailyAttemptState,
    hasCompletedCurrentResult,
    isCompetition,
    mainMenuPath,
    setLocation,
    toast,
  ]);

  const getPlayTimeSpentSeconds = () => {
    if (!timerEnabled) return elapsedSeconds;
    return Math.max(0, timerSeconds - timeLeft);
  };

  const updateResult = async (
    completed: boolean,
    wordsLearned = allFoundWords,
    finalScore = score,
    timeSpentSeconds = getPlayTimeSpentSeconds()
  ) => {
    if (!id) return;

    try {
      if (completed) {
        getResult({ ...result, completed: true });
      }

      const savedResult = await saveOrUpdateDailyResult({
        existingResult: result,
        game: GAME_KEY,
        bookId: id,
        date: dailyDate,
        userId,
        score: finalScore,
        wordsLearned,
        completed,
        timeSpentSeconds,
      });
      if (savedResult?.id) {
        getResult(savedResult);
      }
    } catch (error) {
      console.error("Failed to save game result:", error);
    }
  };

  const getPuzzleId = (index: number) => `daily-${index}`;

  const isPuzzleComplete = (
    index: number,
    foundByPuzzle: Record<string, string[]> = foundWords
  ) => {
    const storyWords = puzzles[index]?.themedWords || [];
    const foundForPuzzle = foundByPuzzle[getPuzzleId(index)] || [];

    return (
      storyWords.length > 0 &&
      storyWords.every((storyWord) =>
        foundForPuzzle.includes(storyWord.toUpperCase())
      )
    );
  };

  const moveToPuzzle = (index: number) => {
    const puzzle = puzzles[index];
    if (!puzzle) return;

    setCurrentPuzzleIndex(index);
    setPuzzle(
      getPuzzleId(index),
      puzzle.letters,
      puzzle.themedWords || [],
      puzzle.wordPositions || [],
      puzzle.size
    );
  };

  const finishGame = async (
    reason: "complete" | "time",
    wordsLearned = allFoundWords,
    finalScore = score,
    timeSpentSeconds = getPlayTimeSpentSeconds()
  ) => {
    if (isGameOver) return;

    setIsGameOver(true);
    setEndReason(reason);

    const allThemedWords = puzzles.flatMap((puzzle) => puzzle.themedWords);
    const unfoundWords = allThemedWords.filter(
      (word) => !wordsLearned.includes(word)
    );
    if (unfoundWords.length) {
      submitWordAttempts(
        unfoundWords.map((word) => ({
          bookId: id,
          userId,
          word,
          game: "intellect-link" as const,
          mode: "daily" as const,
          correct: false,
        }))
      );
    }

    await updateResult(true, wordsLearned, finalScore, timeSpentSeconds);
    toast({
      title:
        reason === "time"
          ? "Time's Up!"
          : isCompetition
          ? "Competition Complete!"
          : "Intellect Link complete!",
      description:
        reason === "time"
          ? `You found ${wordsLearned.length} words.`
          : "You found every story word.",
      variant: reason === "time" ? "destructive" : "default",
    });

    setPendingRecap({
      game: "intellect-link",
      mode: "daily",
      bookId: id,
      userId,
      wordsGuessed: wordsLearned.length,
      hintsUsed,
      outcome: reason === "complete" ? "win" : "loss",
    });

    if (isCompetition) {
      setLocation(mainMenuPath);
    }
  };

  useEffect(() => {
    if (isCompetition && !hasCurrentResult) {
      toast({
        title: "Competition unavailable",
        description: "Start the competition from the games menu.",
        variant: "destructive",
      });
      setLocation(mainMenuPath);
      return;
    }

    const fetchDailyPuzzles = async () => {
      setLoadError(null);
      try {
        const params = new URLSearchParams();
        if (id) params.set("id", id);
        if (schoolId) params.set("school_id", schoolId);
        if (date) params.set("date", date);
        if (competition) params.set("competition", competition);

        const data = await fetchJsonOrThrow<{
          date: string;
          puzzles: DailyStrandsPuzzle[];
          expiresAt: string;
          timerSeconds?: number;
          timerEnabled?: boolean;
          maxHints?: number;
        }>(`/api/strands/daily?${params.toString()}`);
        const loadedPuzzles = data.puzzles as DailyStrandsPuzzle[];
        if (!loadedPuzzles.length) {
          throw new Error("No words available today. Please try again later.");
        }
        resetGame();
        setDailyDate(data.date || date || null);
        setPuzzles(loadedPuzzles);
        setScores(new Array(data.puzzles.length).fill(0));
        const configuredTimer =
          data.timerSeconds || GameConfig.dailyChallenge.strands.timeLimit;
        setTimerSeconds(configuredTimer);
        setTimeLeft(configuredTimer);
        setElapsedSeconds(0);
        setTimerEnabled(data.timerEnabled !== false);
        setHintUnlockWordCount(data.maxHints ?? null);

        if (loadedPuzzles[0]) {
          setPuzzle(
            "daily-0",
            loadedPuzzles[0].letters,
            loadedPuzzles[0].themedWords || [],
            loadedPuzzles[0].wordPositions || [],
            loadedPuzzles[0].size
          );
        }
      } catch (error) {
        console.error("Error fetching daily puzzles:", error);
        setLoadError(
          !id
            ? "Open this game from an iRead book to load today's words."
            : getErrorMessage(
                error,
                "No words available today. Please try again later."
              )
        );
        toast({
          title: "Error",
          description: getErrorMessage(
            error,
            "No words available today. Please try again later."
          ),
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchDailyPuzzles();
  }, [
    toast,
    resetGame,
    setPuzzle,
    id,
    schoolId,
    date,
    competition,
    isCompetition,
    hasCurrentResult,
    setLocation,
    mainMenuPath,
  ]);

  useEffect(() => {
    if (
      isCompetition ||
      loading ||
      !id ||
      puzzles.length === 0 ||
      dailyAttemptState !== "checking"
    ) {
      return;
    }

    const checkResultStatus = async () => {
      try {
        const status = await fetchDailyResultStatus({
          game: GAME_KEY,
          bookId: id,
          date: dailyDate,
          userId,
        });
        const savedResult = status?.result ?? {};

        if (status?.completed || status?.played || isCompletedGameResult(savedResult)) {
          setDailyAttemptState("blocked");
          if (savedResult?.id) {
            getResult(savedResult);
          }
          toast({
            title: "Daily Run already played",
            description:
              "You already played today's Daily Run. A new daily game will be available tomorrow.",
            variant: "destructive",
          });
          setLocation(mainMenuPath);
          return;
        }

        setDailyAttemptState("ready");
        if (savedResult?.id) {
          getResult(savedResult);
        }
      } catch (error) {
        console.error("Failed to check daily result:", error);
        setDailyAttemptState("blocked");
        toast({
          title: "Could not verify Daily Run",
          description:
            "Please refresh in a moment. We need to confirm today's attempt before starting.",
          variant: "destructive",
        });
        setLocation(mainMenuPath);
      }
    };

    void checkResultStatus();
  }, [
    dailyAttemptState,
    dailyDate,
    getResult,
    id,
    isCompetition,
    loading,
    mainMenuPath,
    puzzles.length,
    setLocation,
    toast,
    userId,
  ]);

  useEffect(() => {
    if (loading || !canPlayDaily || isGameOver) return;
    if (timerEnabled && timeLeft <= 0) return;

    const timer = setInterval(() => {
      if (!timerEnabled) {
        setElapsedSeconds((current) => current + 1);
        return;
      }

      setTimeLeft((prevTime) => {
        if (prevTime <= 1) {
          clearInterval(timer);
          void finishGame("time", allFoundWords, score, timerSeconds);
          return 0;
        }

        return prevTime - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [canPlayDaily, loading, isGameOver, timeLeft, timerEnabled]);

  useEffect(() => {
    if (isCompetition && !isGameOver && allFoundWords.length > 0) {
      updateResult(false);
    }
  }, [allFoundWords.length]);

  useEffect(() => {
    if (isGameOver) setShowLeaderboard(true);
  }, [isGameOver]);

  const handleWordComplete = async (word: string) => {
    if (isGameOver || !canPlayDaily) return;
    const upperWord = word.toUpperCase();

    if (upperWord.length < 3) {
      toast({
        title: "Word too short",
        description: "Words must be at least 3 letters long",
        variant: "destructive",
      });
      return;
    }

    const unlockCount = getHintUnlockWordCount(hintUnlockWordCount);
    const result = await addFoundWord(upperWord, hintUnlockWordCount);

    if (result.isValid && result.isThemed) {
      const hintApplied = revealedWord === upperWord;
      submitWordAttempt({
        bookId: id,
        userId,
        word: upperWord,
        game: "intellect-link",
        mode: "daily",
        correct: true,
        hintsUsed: hintApplied ? 1 : 0,
        heaviestHintTier: hintApplied ? "heavy" : null,
      });

      const puzzleId = getPuzzleId(currentPuzzleIndex);
      const nextPuzzleWords = [
        ...new Set([...(foundWords[puzzleId] || []), upperWord]),
      ];
      const nextFoundWords = {
        ...foundWords,
        [puzzleId]: nextPuzzleWords,
      };
      const nextAllFoundWords = Object.values(nextFoundWords).flat();
      const nextScore = score + result.score;
      const boardComplete = isPuzzleComplete(
        currentPuzzleIndex,
        nextFoundWords
      );
      const allPuzzlesComplete =
        puzzles.length > 0 &&
        puzzles.every((_, index) => isPuzzleComplete(index, nextFoundWords));

      setScores((prev) => {
        const newScores = [...prev];
        newScores[currentPuzzleIndex] += result.score;
        return newScores;
      });

      if (allPuzzlesComplete) {
        void finishGame("complete", nextAllFoundWords, nextScore);
      } else if (boardComplete) {
        moveToPuzzle(currentPuzzleIndex + 1);
      } else {
        toast({
          title: "Story word found!",
          description: `+${result.score} points`,
        });
      }
    } else if (result.alreadyFound) {
      toast({
        title: "Word already used",
        description: "Try finding a different word",
        variant: "destructive",
      });
    } else if (result.hintEarned) {
      toast({
        title: "Hint ready",
        description: "Use the lightbulb to reveal story letters.",
      });
    } else if (result.isValid) {
      toast({
        title: "Nice word",
        description: `Hint progress ${result.hintProgress}/${unlockCount}`,
      });
    } else {
      toast({
        title: "Invalid word",
        description: "Try another combination",
        variant: "destructive",
      });
    }
  };

  const navigatePuzzle = (direction: "prev" | "next") => {
    if (direction === "prev") {
      return;
    }

    if (!isPuzzleComplete(currentPuzzleIndex)) {
      toast({
        title: "Finish this board first",
        description: "Find every story word before moving to the next board.",
        variant: "destructive",
      });
      return;
    }

    const newIndex =
      direction === "next" ? currentPuzzleIndex + 1 : currentPuzzleIndex - 1;

    if (newIndex >= 0 && newIndex < puzzles.length) {
      moveToPuzzle(newIndex);
    }
  };

  if (loading || (!isCompetition && dailyAttemptState === "checking")) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-primary">
          {loading ? "Loading..." : "Checking daily attempt..."}
        </div>
      </div>
    );
  }

  if (!isCompetition && dailyAttemptState === "blocked") {
    return (
      <GameLoadError
        message="You already played today's Daily Run. A new daily game will be available tomorrow."
        onBack={() => setLocation(mainMenuPath)}
      />
    );
  }

  if (loadError || puzzles.length === 0) {
    return (
      <GameLoadError
        message={loadError ?? "No words available today. Please try again later."}
        onBack={() => setLocation(mainMenuPath)}
        onRetry={() => window.location.reload()}
      />
    );
  }

  const currentPuzzleWords = foundWords[`daily-${currentPuzzleIndex}`] || [];
  const currentPuzzleComplete = isPuzzleComplete(currentPuzzleIndex);
  const hintUnlockCount = getHintUnlockWordCount(hintUnlockWordCount);
  const hintProgress = nonThemedWords.length % hintUnlockCount;
  const timerPercent =
    timerEnabled && timerSeconds > 0 ? (timeLeft / timerSeconds) * 100 : 100;
  const isTimerLow = timerEnabled && timeLeft <= 30;

  const handleUseHint = () => {
    const earnedHints = Math.max(
      hintsAvailable,
      Math.floor(nonThemedWords.length / hintUnlockCount)
    );
    const readyHints = earnedHints - hintsUsed;

    if (readyHints <= 0) {
      toast({
        title: "No hint available",
        description: `Find ${hintUnlockCount} valid non-story ${
          hintUnlockCount === 1 ? "word" : "words"
        } to unlock one.`,
        variant: "destructive",
      });
      return;
    }

    if (themedWords.length === 0) {
      toast({
        title: "No story words loaded",
        description: "Restart the puzzle to load story words.",
        variant: "destructive",
      });
      return;
    }

    const revealedWord = useHint(hintUnlockWordCount);
    toast({
      title: revealedWord ? "First letter highlighted" : "No hint available",
      description: revealedWord
        ? "The story word is shown above the board."
        : "No hidden story word is available to reveal.",
      variant: revealedWord ? "default" : "destructive",
    });
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center p-4 pt-16 sm:pt-4">
      <div className="relative w-full max-w-4xl flex items-center justify-center gap-2 mb-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setLocation(mainMenuPath)}
          className="absolute left-0 top-1/2 -translate-y-1/2"
        >
          <ArrowLeft className="h-6 w-6" />
        </Button>
        <h1 className="text-2xl font-bold text-center leading-tight px-12 sm:text-4xl">
          {pageTitle}
        </h1>
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-0 top-1/2 h-8 w-8 -translate-y-1/2 rounded-full bg-primary/10"
          onClick={() => setShowTutorial(true)}
          title="How to Play"
        >
          <HelpCircle className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-3 w-full max-w-md mb-6">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigatePuzzle("prev")}
          disabled
          className="h-10 w-10"
          title="Previous boards are locked"
        >
          <ChevronLeft className="h-6 w-6" />
        </Button>

        <div className="flex flex-wrap items-center justify-center gap-3">
          <div className="bg-primary/10 px-3 py-1 rounded-full">
            <span className="text-sm font-medium">
              {currentPuzzleIndex + 1} / {puzzles.length}
            </span>
          </div>
          <div className="bg-primary/10 px-3 py-1 rounded-full">
            <span className="text-sm font-medium">
              Score: {scores[currentPuzzleIndex]}
            </span>
          </div>
          <div
            className={`relative flex min-w-28 items-center justify-center gap-2 overflow-hidden rounded-full border px-3 py-1 ${
              isTimerLow
                ? "border-destructive/40 bg-destructive/10 text-destructive"
                : "border-primary/20 bg-primary/10 text-foreground"
            }`}
          >
            <span
              className="absolute inset-y-0 left-0 bg-primary/10"
              style={{ width: `${timerPercent}%` }}
            />
            <Timer className="relative h-4 w-4" />
            <span className="relative text-xs font-medium">
              {timerEnabled ? "Left" : "Spent"}
            </span>
            <span className="relative font-mono text-sm font-semibold">
              {formatTime(timerEnabled ? timeLeft : elapsedSeconds)}
            </span>
          </div>
          <HintStatus
            storyFound={currentPuzzleWords.length}
            storyTotal={themedWords.length}
            nonStoryWordCount={nonThemedWords.length}
            hintProgress={hintProgress}
            hintsAvailable={hintsAvailable}
            hintsUsed={hintsUsed}
            hintUnlockWordCount={hintUnlockWordCount}
            onUseHint={handleUseHint}
          />
        </div>

        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigatePuzzle("next")}
          disabled={
            currentPuzzleIndex === puzzles.length - 1 || !currentPuzzleComplete
          }
          className="h-10 w-10"
          title={
            currentPuzzleComplete
              ? "Next board"
              : "Find every story word before moving on"
          }
        >
          <ChevronRight className="h-6 w-6" />
        </Button>
      </div>

      {puzzles[currentPuzzleIndex] && (
        <div className="w-full max-w-md">
          <Board
            letters={puzzles[currentPuzzleIndex].letters}
            onWordComplete={handleWordComplete}
            foundWords={currentPuzzleWords}
            themedWords={themedWords}
            wordPositions={wordPositions}
            disabled={isGameOver}
          />
        </div>
      )}

      <FoundWordsPanel words={currentPuzzleWords} className="mt-8" />
      {isGameOver && (
        <div
          className={`mt-5 flex w-full max-w-md flex-col items-center gap-3 rounded-lg border p-4 text-center ${
            endReason === "complete"
              ? "border-primary/30 bg-primary/10"
              : "border-destructive/30 bg-destructive/10"
          }`}
        >
          <p
            className={`text-lg font-bold ${
              endReason === "complete" ? "text-primary" : "text-destructive"
            }`}
          >
            {endReason === "complete"
              ? "Game complete. You found all story words."
              : "Time's up! Return to the menu to continue."}
          </p>
          <Button
            onClick={() => setLocation(mainMenuPath)}
            title="Finish"
            className="min-w-28"
          >
            Finish
          </Button>
        </div>
      )}
      <TutorialModal
        open={showTutorial}
        onClose={() => setShowTutorial(false)}
        game="intellect-link"
        gameMode={isCompetition ? "competition" : "daily"}
      />
      <DailyLeaderboardDialog
        bookId={id}
        game={GAME_KEY}
        date={dailyDate}
        userId={userId}
        open={showLeaderboard}
        onOpenChange={setShowLeaderboard}
        title="Intellect Link Leaderboard"
        celebrate={endReason === "complete"}
        outcome={endReason === "complete" ? "win" : endReason === "time" ? "loss" : null}
        practiceHref={practicePath}
      />
      <DailyPlayNextModal
        open={showPlayNext}
        onOpenChange={setShowPlayNext}
        bookId={id}
        game={GAME_KEY}
        userId={userId}
        schoolId={schoolId}
        packId={packId}
        date={dailyDate}
      />
    </div>
  );
}
