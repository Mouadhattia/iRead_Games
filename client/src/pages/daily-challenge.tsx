/**
 * Daily Challenge Game Component
 *
 * Provides a daily set of word puzzles with increasing difficulty.
 * Features:
 * - Multiple words per challenge
 * - Progressive difficulty
 * - Score multipliers
 * - Daily streak tracking
 * - Achievement integration
 *
 * @component
 * @example
 * return (
 *   <DailyChallenge />
 * )
 */

import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect, useRef } from "react";
import GameBoard from "@/components/game/board";
import Keyboard from "@/components/game/keyboard";
import { checkGuess, useGameStore } from "@/lib/game";
import { apiRequest, fetchJsonOrThrow } from "@/lib/queryClient";
import Hint from "@/components/game/hint";
import {
  Share2,
  Loader2,
  ArrowLeft,
  BarChart2,
  HelpCircle,
  Timer,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import GameSummary from "@/components/game/game-summary";
import { useLocation } from "wouter";
import StatsModal from "@/components/game/stats-modal";
import { formatShareText } from "@/lib/utils";
import TutorialModal from "@/components/game/tutorial-modal";
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
import { submitWordAttempt, submitWordAttempts } from "@/lib/word-attempts";
import {
  useDeferredDailyRecap,
  type GameRecapMessage,
} from "@/lib/game-recap";
import { useOpenCloseTransition } from "@/lib/use-open-close-transition";
import DailyPlayNextModal from "@/components/shared/daily-play-next-modal";

const useQuerys = () => {
  return new URLSearchParams(window.location.search);
};

const COMPETITION_TIME_LIMIT = 300;
const GAME_KEY = "think-word";

export default function DailyChallenge() {
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
    ? `/game?${mainMenuParams.toString()}`
    : "/game";
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [guesses, setGuesses] = useState<string[]>([]);
  const [currentGuess, setCurrentGuess] = useState("");
  const [isGameOver, setIsGameOver] = useState(false);
  const [dailyOutcome, setDailyOutcome] = useState<"win" | "loss" | null>(
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
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [showStats, setShowStats] = useState(false); // Added state for stats modal
  const [startTime, setStartTime] = useState<number | null>(null); // Add startTime state
  const [showTutorial, setShowTutorial] = useState(false); // Added state for tutorial modal
  const [timeLeft, setTimeLeft] = useState(COMPETITION_TIME_LIMIT);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [wordsLearned, setWordsLearned] = useState<string[]>([]);
  const { isKids } = useGameView();
  const pageTitle = isCompetition
    ? isKids
      ? "Word Tournament"
      : "Competition Challenge"
    : isKids
    ? "Secret Word"
    : "Daily Challenge";

  const {
    incrementWins,
    incrementLosses,
    setShowHint,
    showHint,
    showHintButton,
    setShowHintButton,
    stats,
    score,
    result,
    addToScore,
    startGame,
    getResult,
    setDailyChallengeCompleted,
    hintsUsedThisGame,
  } = useGameStore();
  // hintsUsedThisGame is a running total for the whole pack, not reset per
  // word — snapshot it at the start of each word so hints can be attributed
  // to the specific word they were spent on.
  const hintsAtWordStartRef = useRef(0);
  const hasCurrentResult = isCurrentGameResult(result, GAME_KEY, id, date);
  const hasCompletedCurrentResult = isCompletedCurrentGameResult(
    result,
    GAME_KEY,
    id,
    date
  );
  const [dailyAttemptState, setDailyAttemptState] = useState<
    "checking" | "ready" | "blocked"
  >(!id || isCompetition ? "ready" : "checking");
  const canPlayDaily = isCompetition || dailyAttemptState === "ready";

  const {
    data: challengeData,
    isLoading,
    error: challengeError,
  } = useQuery<{
    id: number;
    date: string;
    words: string[];
    packSize: number;
    expiresAt: string;
    timerSeconds?: number;
    timerEnabled?: boolean;
  }>({
    queryKey: ["/api/daily-challenge", id, schoolId, competition, date],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (id) params.set("id", id);
      if (schoolId) params.set("school_id", schoolId);
      if (competition) params.set("competition", competition);
      if (date) params.set("date", date);

      return fetchJsonOrThrow<{
        id: number;
        date: string;
        words: string[];
        packSize: number;
        expiresAt: string;
        timerSeconds?: number;
        timerEnabled?: boolean;
      }>(`/api/daily-challenge?${params.toString()}`);
    },
    enabled: !!id,
  });
  const dailyDate = date || challengeData?.date || null;

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
    const configuredTimer = challengeData?.timerSeconds || COMPETITION_TIME_LIMIT;
    if (challengeData?.timerEnabled === false) return elapsedSeconds;
    return Math.max(0, configuredTimer - timeLeft);
  };

  const updateResult = async (
    completed: boolean,
    learnedWords = wordsLearned,
    finalScore = score,
    timeSpentSeconds = getPlayTimeSpentSeconds()
  ) => {
    if (!id || !challengeData?.words) return;

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
        wordsLearned: learnedWords,
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
  useEffect(() => {
    if (isCompetition && (guesses.length > 0 || wordsLearned.length > 0)) {
      updateResult(false, wordsLearned);
    }
  }, [guesses, wordsLearned]);

  useEffect(() => {
    if (
      isCompetition ||
      !challengeData ||
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
    challengeData,
    dailyAttemptState,
    dailyDate,
    getResult,
    id,
    isCompetition,
    mainMenuPath,
    setLocation,
    toast,
    userId,
  ]);

  useEffect(() => {
    if (challengeData && canPlayDaily) {
      startGame();
      setStartTime(Date.now()); // Start timer when challenge data loads
      setTimeLeft(challengeData.timerSeconds || COMPETITION_TIME_LIMIT);
      setElapsedSeconds(0);
    }
  }, [canPlayDaily, challengeData, startGame]);

  useEffect(() => {
    hintsAtWordStartRef.current = hintsUsedThisGame;
    setGuesses([]);
    setCurrentGuess("");
    setShowHint(false);
    setShowHintButton(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentWordIndex, setShowHint, setShowHintButton]);

  useEffect(() => {
    if (
      challengeData?.words[currentWordIndex]?.length &&
      guesses.length === 5 &&
      !isGameOver
    ) {
      setShowHintButton(true);
    }
  }, [
    guesses.length,
    isGameOver,
    challengeData,
    currentWordIndex,
    setShowHintButton,
  ]);

  useEffect(() => {
    if (isGameOver) setShowLeaderboard(true);
  }, [isGameOver]);
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

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
  };

  const finishTimedOutGame = async () => {
    if (isGameOver) return;

    setIsGameOver(true);
    setDailyOutcome("loss");
    incrementLosses();

    const unfinishedWords = (challengeData?.words || []).filter(
      (word) => !wordsLearned.includes(word)
    );
    if (unfinishedWords.length) {
      submitWordAttempts(
        unfinishedWords.map((word) => ({
          bookId: id,
          userId,
          word,
          game: "think-word" as const,
          mode: "daily" as const,
          correct: false,
        }))
      );
    }

    await updateResult(
      true,
      wordsLearned,
      score,
      challengeData?.timerSeconds || COMPETITION_TIME_LIMIT
    );
    toast({
      title: "Time's Up!",
      description: isCompetition
        ? "Your competition result was saved."
        : "Return to the menu when you're ready.",
      variant: "destructive",
    });
    setPendingRecap({
      game: "think-word",
      mode: "daily",
      bookId: id,
      userId,
      wordsGuessed: wordsLearned.length,
      hintsUsed: hintsUsedThisGame,
      outcome: "loss",
    });
    if (isCompetition) {
      setLocation(mainMenuPath);
    }
  };

  useEffect(() => {
    if (!challengeData || !canPlayDaily || isGameOver) return;
    const timerEnabled = challengeData.timerEnabled !== false;
    if (timerEnabled && timeLeft <= 0) return;

    const timer = setInterval(() => {
      if (!timerEnabled) {
        setElapsedSeconds((current) => current + 1);
        return;
      }

      setTimeLeft((prevTime) => {
        if (prevTime <= 1) {
          clearInterval(timer);
          void finishTimedOutGame();
          return 0;
        }

        return prevTime - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [
    challengeData,
    canPlayDaily,
    isCompetition,
    isGameOver,
    timeLeft,
    wordsLearned,
    score,
  ]);

  const handleKeyPress = async (key: string) => {
    if (isGameOver || !canPlayDaily) return;

    if (showHint) {
      setShowHint(false);
    }

    if (key === "ENTER") {
      const currentWord = challengeData?.words[currentWordIndex];
      if (!currentWord) return;

      if (currentGuess.length !== currentWord.length) {
        toast({
          title: "Word too short",
          description: `Please enter a ${currentWord.length}-letter word`,
          variant: "destructive",
        });
        return;
      }

      if (guesses.includes(currentGuess)) {
        toast({
          title: "Already tried",
          description: "Use a new word for this guess.",
          variant: "destructive",
        });
        return;
      }

      const res = await apiRequest("POST", "/api/validate", {
        guess: currentGuess,
        wordLength: currentWord.length,
      });
      const { isValid, isPredefinedWord, score: guessScore } = await res.json();

      if (!isValid) {
        toast({
          title: "Invalid word",
          description: "Please enter a valid word",
          variant: "destructive",
        });
        return;
      }

      let nextScore = score;
      if (isPredefinedWord) {
        const bonusPoints = calculateWordPoints(currentGuess) * 2.5;
        nextScore += bonusPoints;
        addToScore(bonusPoints);

        toast({
          title: "Bonus Points!",
          description: `+${guessScore} points for using a predefined word!`,
        });
      }

      const nextGuesses = [...guesses, currentGuess];
      setGuesses(nextGuesses);

      setCurrentGuess("");

      if (currentGuess === currentWord) {
        const wordPoints = calculateWordPoints(currentGuess) * 2.5;
        nextScore += wordPoints;
        const nextWordsLearned = [...wordsLearned, currentWord];
        setWordsLearned(nextWordsLearned);

        const hintsForWord = Math.max(0, hintsUsedThisGame - hintsAtWordStartRef.current);
        submitWordAttempt({
          bookId: id,
          userId,
          word: currentWord,
          game: "think-word",
          mode: "daily",
          correct: true,
          hintsUsed: hintsForWord,
          heaviestHintTier: hintsForWord > 0 ? "light" : null,
        });

        if (currentWordIndex < challengeData.words.length - 1) {
          addToScore(wordPoints);
          toast({
            title: "Correct!",
            description: "Moving to next word...",
          });
          setTimeout(() => {
            setCurrentWordIndex((prev) => prev + 1);
          }, 1000);
        } else {
          setIsGameOver(true);
          setDailyOutcome("win");
          incrementWins();
          addToScore(wordPoints);
          updateResult(true, nextWordsLearned, nextScore);
          if (challengeData) {
            setDailyChallengeCompleted(challengeData.id);
          }
          toast({
            title: "Challenge Complete! 🎉",
            description: `Congratulations! You've completed today's challenge!`,
          });
          setPendingRecap({
            game: "think-word",
            mode: "daily",
            bookId: id,
            userId,
            wordsGuessed: nextWordsLearned.length,
            hintsUsed: hintsUsedThisGame,
            outcome: "win",
          });
        }
      } else if (nextGuesses.length >= maxGuesses) {
        submitWordAttempt({
          bookId: id,
          userId,
          word: currentWord,
          game: "think-word",
          mode: "daily",
          correct: false,
        });

        if (currentWordIndex < challengeData.words.length - 1) {
          toast({
            title: "Word Failed",
            description: `The word was ${currentWord}. Moving to next word...`,
            variant: "destructive",
          });
          setTimeout(() => {
            setCurrentWordIndex((prev) => prev + 1);
          }, 1000);
        } else {
          setIsGameOver(true);
          setDailyOutcome("loss");
          incrementLosses();
          updateResult(true, wordsLearned, nextScore);
          toast({
            title: "Challenge Failed",
            description: `The final word was ${currentWord}. Better luck next time!`,
            variant: "destructive",
          });
          setPendingRecap({
            game: "think-word",
            mode: "daily",
            bookId: id,
            userId,
            wordsGuessed: wordsLearned.length,
            hintsUsed: hintsUsedThisGame,
            outcome: "loss",
          });
        }
      }
    } else if (key === "BACKSPACE") {
      setCurrentGuess((prev) => prev.slice(0, -1));
    } else if (
      currentGuess.length <
      (challengeData?.words[currentWordIndex]?.length ?? 5)
    ) {
      setCurrentGuess((prev) => prev + key);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (/^[A-Za-z]$/.test(e.key)) {
        handleKeyPress(e.key.toUpperCase());
      } else if (e.key === "Enter") {
        handleKeyPress("ENTER");
      } else if (e.key === "Backspace") {
        handleKeyPress("BACKSPACE");
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [canPlayDaily, currentGuess, guesses, isGameOver]);

  const calculateTimeSpent = () => {
    if (challengeData?.timerEnabled === false) return elapsedSeconds;
    if (!startTime) return 0;
    const endTime = Date.now();
    return Math.floor((endTime - startTime) / 1000);
  };

  const achievements: Array<{ title: string; earnedAt: Date | null }> = []; // Placeholder for achievements - needs implementation

  const handleShare = () => {
    if (!isGameOver) return;

    const timeSpent = calculateTimeSpent();
    const currentWord = challengeData?.words[currentWordIndex] || "";

    const emoji = guesses
      .map((guess) =>
        checkGuess(guess, currentWord)
          .map((state) => {
            if (state === "correct") return "🟩";
            if (state === "present") return "🟨";
            return "⬛";
          })
          .join("")
      )
      .join("\n");

    const result = formatShareText({
      gameName: "Daily Challenge",
      score,
      guesses: guesses.length,
      maxGuesses: 6,
      timeSpent,
      wordLength: currentWord.length,
      achievements,
      emoji,
    });

    navigator.clipboard.writeText(result).then(() => {
      toast({
        title: "Copied to clipboard!",
        description: "Share your results with friends!",
      });
    });
  };

  if (isLoading || (!isCompetition && dailyAttemptState === "checking")) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <Loader2 className="w-8 h-8 animate-spin" />
        <p className="mt-4">
          {isLoading ? "Loading challenge..." : "Checking daily attempt..."}
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

  if (challengeError || !challengeData?.words?.length) {
    return (
      <GameLoadError
        message={
          !id
            ? "Open this game from an iRead book to load today's words."
            : getErrorMessage(
                challengeError,
                "No words available today. Please try again later."
              )
        }
        onBack={() => setLocation(mainMenuPath)}
        onRetry={() => window.location.reload()}
      />
    );
  }

  const currentWord = challengeData.words[currentWordIndex] || "";
  const wordLength = currentWord.length;
  const maxGuesses = 6;
  const timerEnabled = challengeData.timerEnabled !== false;

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
      </div>
      <p className="text-muted-foreground mb-6">
        Word {currentWordIndex + 1} of {challengeData.words.length}
      </p>

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
            className="h-8 w-8 rounded-full bg-primary/10"
            onClick={() => setShowTutorial(true)}
            title="How to Play"
          >
            <HelpCircle className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <GameBoard
        guesses={guesses}
        currentGuess={currentGuess}
        targetWord={currentWord}
        wordLength={wordLength}
        maxGuesses={maxGuesses}
      />

      {showHint && !isGameOver && <Hint word={currentWord} />}

      {isGameOver && (
        <>
          <GameSummary />
          <Button onClick={handleShare} className="mt-4 mb-6" variant="outline">
            <Share2 className="w-4 h-4 mr-2" />
            Share Results
          </Button>
        </>
      )}

      <Keyboard
        guesses={guesses}
        targetWord={currentWord}
        onKeyPress={handleKeyPress}
      />
      {isGameOver && (
        <div style={{ textAlign: "center", marginTop: "20px" }}>
          <p
            style={{
              fontSize: "18px",
              fontWeight: "bold",
              marginBottom: "10px",
            }}
          >
            {dailyOutcome === "win"
              ? "Well done! You've completed today's challenge! 🎉"
              : "So close! Come back tomorrow for a new challenge."}
          </p>
          <Button
            onClick={() => setLocation(mainMenuPath)}
            title="Finish"
            color="#3730a3" // Primary color
            style={{ marginTop: 10 }} // Adds margin at the top
          >
            Finish
          </Button>
          {dailyOutcome === "win" && <Confetti />}
        </div>
      )}

      <StatsModal open={showStats} onClose={() => setShowStats(false)} />
      <TutorialModal
        open={showTutorial}
        onClose={() => setShowTutorial(false)}
        gameMode={isCompetition ? "competition" : "daily"}
        game="think-word"
      />
      <DailyLeaderboardDialog
        bookId={id}
        game={GAME_KEY}
        date={dailyDate}
        userId={userId}
        open={showLeaderboard}
        onOpenChange={setShowLeaderboard}
        title="Think Word Leaderboard"
        celebrate={dailyOutcome === "win"}
        outcome={dailyOutcome}
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
