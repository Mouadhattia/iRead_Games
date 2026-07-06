import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { useLocation } from "wouter";
import {
  ArrowLeft,
  BarChart2,
  HelpCircle,
  Timer,
  Loader2,
  Share2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import WordSearchGrid from "@/components/word-search/grid";
import { useGameStore } from "@/lib/game";
import { GameConfig } from "@shared/config";
import StatsModal from "@/components/game/stats-modal";
import TutorialModal from "@/components/game/tutorial-modal";
import { formatShareText } from "@/lib/utils";
import { fetchJsonOrThrow } from "@/lib/queryClient.ts";
import { Confetti } from "@/components/ui/confetti.tsx";
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
import {
  submitWordAttempt,
  submitWordAttempts,
  hintLevelToTier,
} from "@/lib/word-attempts";
import {
  useDeferredDailyRecap,
  type GameRecapMessage,
} from "@/lib/game-recap";
import { useOpenCloseTransition } from "@/lib/use-open-close-transition";
import DailyPlayNextModal from "@/components/shared/daily-play-next-modal";

const useQuerys = () => {
  return new URLSearchParams(window.location.search);
};
const GAME_KEY = "word-explorer";

export default function DailyWordSearch() {
  const query = useQuerys();
  const id = query.get("id");
  const competition = query.get("competition");
  const date = query.get("date");
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
    ? `/word-search?${mainMenuParams.toString()}`
    : "/word-search";
  const [, setLocation] = useLocation();
  const [foundWords, setFoundWords] = useState<string[]>([]);
  const [hintsUsedTotal, setHintsUsedTotal] = useState(0);
  const [timeLeft, setTimeLeft] = useState<number>(
    GameConfig.dailyChallenge.wordSearch.timeLimit
  );
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isGameOver, setIsGameOver] = useState(false);
  const [endReason, setEndReason] = useState<"complete" | "time" | null>(null);
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
  const [showStats, setShowStats] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const [dailyDate, setDailyDate] = useState<string | null>(date);
  const { toast } = useToast();

  const { score, addToScore, result, getResult } = useGameStore();
  const { isKids } = useGameView();
  const pageTitle = isCompetition
    ? isKids
      ? "Word Hunt Tournament"
      : "Competition Word Explorer"
    : isKids
    ? "Word Hunt"
    : "Daily Word Explorer";
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

  useEffect(() => {
    if (!isCompetition || hasCurrentResult) return;

    toast({
      title: "Competition result missing",
      description: "Start the competition from the games menu.",
      variant: "destructive",
    });
    setLocation(mainMenuPath);
  }, [hasCurrentResult, isCompetition, mainMenuPath, setLocation, toast]);

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
    const configuredTimer =
      puzzleData?.timerSeconds || GameConfig.dailyChallenge.wordSearch.timeLimit;
    if (puzzleData?.timerEnabled === false) return elapsedSeconds;
    return Math.max(0, configuredTimer - timeLeft);
  };

  const updateResult = async (
    completed: boolean,
    wordsLearned = foundWords,
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
  const {
    data: puzzleData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["/api/daily-word-search", id, schoolId, competition, date],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (id) params.set("id", id);
      if (schoolId) params.set("school_id", schoolId);
      if (competition) params.set("competition", competition);
      if (date) params.set("date", date);

      return fetchJsonOrThrow<any>(
        `/api/daily-word-search?${params.toString()}`
      );
    },
    enabled: !!id,
  });

  useEffect(() => {
    if (
      isCompetition ||
      !puzzleData ||
      !id ||
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
    mainMenuPath,
    puzzleData,
    setLocation,
    toast,
    userId,
  ]);

  useEffect(() => {
    if (puzzleData?.timerSeconds) {
      setTimeLeft(puzzleData.timerSeconds);
    }
    if (puzzleData) {
      setDailyDate(puzzleData.date || date || null);
      setElapsedSeconds(0);
    }
  }, [date, puzzleData]);

  const finishGame = async (
    completed: boolean,
    reason: "complete" | "time",
    wordsLearned = foundWords,
    finalScore = score,
    timeSpentSeconds = getPlayTimeSpentSeconds(),
    hintsUsed = hintsUsedTotal
  ) => {
    if (isGameOver) return;

    setIsGameOver(true);
    setEndReason(reason);

    const unfoundWords: string[] = (puzzleData?.words || []).filter(
      (word: string) => !wordsLearned.includes(word)
    );
    if (unfoundWords.length) {
      submitWordAttempts(
        unfoundWords.map((word) => ({
          bookId: id,
          userId,
          word,
          game: "word-explorer" as const,
          mode: "daily" as const,
          correct: false,
        }))
      );
    }

    await updateResult(completed, wordsLearned, finalScore, timeSpentSeconds);

    toast({
      title:
        reason === "time"
          ? "Time's Up!"
          : isCompetition
          ? "Competition Complete!"
          : "Daily Challenge Complete!",
      description:
        reason === "time"
          ? `You found ${wordsLearned.length} words.`
          : "Great work. Return to the menu when you're ready.",
      variant: reason === "time" ? "destructive" : "default",
    });

    setPendingRecap({
      game: "word-explorer",
      mode: "daily",
      bookId: id,
      userId,
      wordsGuessed: wordsLearned.length,
      hintsUsed,
      outcome: reason === "complete" ? "win" : "loss",
    });

    if (isCompetition && reason === "time") {
      setLocation(mainMenuPath);
    }
  };

  useEffect(() => {
    if (!puzzleData || !canPlayDaily || isGameOver) return;
    const timerEnabled = puzzleData.timerEnabled !== false;
    if (timerEnabled && timeLeft <= 0) return;

    const timer = setInterval(() => {
      if (!timerEnabled) {
        setElapsedSeconds((current) => current + 1);
        return;
      }

      setTimeLeft((prevTime) => {
        if (prevTime <= 1) {
          clearInterval(timer);
          void finishGame(
            true,
            "time",
            foundWords,
            score,
            puzzleData?.timerSeconds ||
              GameConfig.dailyChallenge.wordSearch.timeLimit
          );
          return 0;
        }

        return prevTime - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [canPlayDaily, puzzleData, isGameOver, timeLeft, foundWords, score]);

  function calculateWordPoints(word: string): number {
    const length = word.length;

    if (length >= 3 && length <= 4) return 5;
    if (length === 5) return 8;
    if (length === 6) return 12;
    if (length === 7) return 16;
    if (length === 8) return 20;
    if (length >= 9) return 25;

    return 0; // Return 0 for words shorter than 3 letters
  }
  const handleWordFound = (word: string, hintLevel: number) => {
    if (isGameOver || !canPlayDaily) return;
    if (foundWords.includes(word)) return; // Avoid duplicates

    let points = calculateWordPoints(word);

    if (hintLevel > 0) {
      const deductionPerHint = Math.round(points * 0.3);
      const totalDeduction = deductionPerHint * hintLevel;
      points -= totalDeduction;

      toast({
        title: "Word Found with Hints",
        description: `${points} points (-${totalDeduction} points from hints)`,
      });
    } else {
      toast({
        title: "Word Found!",
        description: `+${points} points!`,
      });
    }

    const nextScore = score + points;
    const nextHintsUsedTotal = hintsUsedTotal + hintLevel;

    // Update score
    addToScore(points);
    setHintsUsedTotal(nextHintsUsedTotal);

    submitWordAttempt({
      bookId: id,
      userId,
      word,
      game: "word-explorer",
      mode: "daily",
      correct: true,
      hintsUsed: hintLevel,
      heaviestHintTier: hintLevelToTier(hintLevel),
    });

    // Update foundWords (this will trigger useEffect)
    setFoundWords((prevFoundWords) => {
      const updatedFoundWords = [...prevFoundWords, word];

      // Check for puzzle completion only here
      if (puzzleData && updatedFoundWords.length === puzzleData.words.length) {
        handleGameComplete(updatedFoundWords, nextScore, nextHintsUsedTotal);
      }

      return updatedFoundWords;
    });
  };

  
  useEffect(() => {
    if (isCompetition && !isGameOver && foundWords.length > 0) {
      let completed = foundWords.length === puzzleData?.words.length;
      updateResult(completed);
    }
  }, [foundWords]); 

  useEffect(() => {
    if (isGameOver) setShowLeaderboard(true);
  }, [isGameOver]);

  const handleGameComplete = (
    wordsLearned = foundWords,
    currentScore = score,
    hintsUsed = hintsUsedTotal
  ) => {
    // Calculate completion bonus
    const completionBonus =
      GameConfig.dailyChallenge.wordSearch.bonusPoints.completion;

    // Calculate time bonus
    const timerEnabled = puzzleData?.timerEnabled !== false;
    const timeBonus = timerEnabled
      ? Math.floor(timeLeft / 30) * GameConfig.rules.wordSearch.scoring.timeBonus
      : 0;

    // Add streak bonus if configured
    const streakBonus = GameConfig.dailyChallenge.wordSearch.bonusPoints.streak;

    const totalBonus = completionBonus + timeBonus + streakBonus;
    const finalScore = currentScore + totalBonus;
    addToScore(totalBonus);
    void finishGame(
      true,
      "complete",
      wordsLearned,
      finalScore,
      getPlayTimeSpentSeconds(),
      hintsUsed
    );

    toast({
      title: "Daily Challenge Complete! 🎉",
      description: `Time Bonus: +${timeBonus} points!\nCompletion Bonus: +${completionBonus} points!\nStreak Bonus: +${streakBonus} points!`,
    });
  };

  const handleShare = () => {
    // Create a grid to track found letters with their words
    const foundLettersMap = new Map<string, string>();
    foundWords.forEach((word) => {
      // Find word positions in grid
      const directions = [
        // Horizontal (left to right)
        (i: number, j: number, k: number) => ({ row: i, col: j + k }),
        // Vertical (top to bottom)
        (i: number, j: number, k: number) => ({ row: i + k, col: j }),
        // Diagonal (top-left to bottom-right)
        (i: number, j: number, k: number) => ({ row: i + k, col: j + k }),
        // Diagonal (top-right to bottom-left)
        (i: number, j: number, k: number) => ({ row: i + k, col: j - k }),
        // Horizontal (right to left)
        (i: number, j: number, k: number) => ({ row: i, col: j - k }),
        // Vertical (bottom to top)
        (i: number, j: number, k: number) => ({ row: i - k, col: j }),
        // Diagonal (bottom-right to top-left)
        (i: number, j: number, k: number) => ({ row: i - k, col: j - k }),
        // Diagonal (bottom-left to top-right)
        (i: number, j: number, k: number) => ({ row: i - k, col: j + k }),
      ];

      for (let i = 0; i < (puzzleData?.grid.length || 0); i++) {
        for (let j = 0; j < (puzzleData?.grid[i].length || 0); j++) {
          directions.forEach((direction) => {
            let found = true;
            const positions = [];

            for (let k = 0; k < word.length; k++) {
              const pos = direction(i, j, k);
              if (
                !puzzleData?.grid[pos.row] ||
                puzzleData?.grid[pos.row][pos.col] !== word[k]
              ) {
                found = false;
                break;
              }
              positions.push(pos);
            }

            if (found) {
              positions.forEach((pos) => {
                foundLettersMap.set(`${pos.row},${pos.col}`, word);
              });
            }
          });
        }
      }
    });

    // Create emoji grid representation with found words highlighted
    const emojiGrid = puzzleData?.grid
      .map((row: string[], i: number) =>
        row
          .map((letter: string, j: number) => {
            const key = `${i},${j}`;
            return foundLettersMap.has(key) ? "🟦" : "⬜";
          })
          .join("")
      )
      .join("\n");

    const timerEnabled = puzzleData?.timerEnabled !== false;
    const configuredTimerSeconds =
      puzzleData?.timerSeconds || GameConfig.dailyChallenge.wordSearch.timeLimit;
    const timeSpent = timerEnabled
      ? Math.max(0, configuredTimerSeconds - timeLeft)
      : elapsedSeconds;

    const result = formatShareText({
      gameName: "Daily Word Explorer",
      score,
      guesses: foundWords.length,
      maxGuesses: puzzleData?.words.length || 0,
      timeSpent,
      wordLength: puzzleData?.grid.length || 0,
      achievements: [],
      emoji: `${emojiGrid}\n\n🎯 Found: ${foundWords.length}/${
        puzzleData?.words.length || 0
      } words\n⏱️ ${timerEnabled ? "Time Left" : "Time Spent"}: ${formatTime(
        timerEnabled ? timeLeft : elapsedSeconds
      )}\n📝 Found Words: ${foundWords.join(", ")}`,
    });

    navigator.clipboard.writeText(result).then(() => {
      toast({
        title: "Results Copied! 📋",
        description: "Share your results with friends!",
      });
    });
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
  };

  if (isLoading || (!isCompetition && dailyAttemptState === "checking")) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">
          {isLoading ? "Loading daily puzzle..." : "Checking daily attempt..."}
        </p>
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

  if (error || !puzzleData) {
    return (
      <GameLoadError
        message={
          !id
            ? "Open this game from an iRead book to load today's words."
            : getErrorMessage(
                error,
                "No words available today. Please try again later."
              )
        }
        onBack={() => setLocation(mainMenuPath)}
        onRetry={() => window.location.reload()}
      />
    );
  }
  const timerEnabled = puzzleData.timerEnabled !== false;

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
        <motion.h1
          className="text-2xl font-bold text-center leading-tight px-12 sm:text-4xl"
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
        >
          {pageTitle}
        </motion.h1>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-3 mb-6">
        <Button
          variant="ghost"
          size="icon"
          // onClick={() => setShowStats(true)}
          className="relative"
        >
          <BarChart2 className="h-5 w-5" />
        </Button>

        <div className="flex flex-wrap items-center justify-center gap-3">
          <div className="flex items-center space-x-2 bg-primary/10 px-3 py-1 rounded-full">
            <Timer className="w-4 h-4" />
            <span className="text-xs font-medium">
              {timerEnabled ? "Left" : "Spent"}
            </span>
            <span className="font-mono">
              {formatTime(timerEnabled ? timeLeft : elapsedSeconds)}
            </span>
          </div>
          <div className="bg-primary/10 px-3 py-1 rounded-full">
            <span className="text-sm font-medium">Score: {score}</span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-full bg-primary/10 hover:bg-primary/20 transition-colors"
            onClick={handleShare}
            title="Share Results"
          >
            <Share2 className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-full bg-primary/10"
            onClick={() => setShowTutorial(true)}
            title="How to Play"
          >
            <HelpCircle className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {puzzleData && (
        <WordSearchGrid
          grid={puzzleData.grid}
          words={puzzleData.words}
          onWordFound={handleWordFound}
          difficulty="hard"
          disabled={isGameOver}
        />
      )}
      {isGameOver && (
        <div style={{ textAlign: "center", marginTop: "20px" }}>
          <p
            style={{
              fontSize: "18px",
              fontWeight: "bold",
              marginBottom: "10px",
            }}
          >
            {endReason === "time"
              ? "Time's up! Return to the menu to continue."
              : "Well done! You've completed the game! 🎉"}
          </p>
          <Button
            onClick={() => setLocation(mainMenuPath)}
            title="Finish"
            color="#3730a3" // Primary color
            style={{ marginTop: 10 }} // Adds margin at the top
          >
            Finish
          </Button>
          {endReason === "complete" && <Confetti />}
        </div>
      )}
      <StatsModal open={showStats} onClose={() => setShowStats(false)} />
      <TutorialModal
        open={showTutorial}
        onClose={() => setShowTutorial(false)}
        gameMode={isCompetition ? "competition" : "daily"}
        game="word-explorer"
      />
      <DailyLeaderboardDialog
        bookId={id}
        game={GAME_KEY}
        date={dailyDate}
        userId={userId}
        open={showLeaderboard}
        onOpenChange={setShowLeaderboard}
        title="Word Explorer Leaderboard"
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
