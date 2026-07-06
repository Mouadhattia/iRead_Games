import { useState, useEffect, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { useLocation } from "wouter";
import SpellingBeeBoard from "@/components/spelling-bee/board";
import TutorialModal from "@/components/game/tutorial-modal";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  BarChart2,
  HelpCircle,
  Delete,
  RefreshCw,
  Share2,
  ChevronLeft,
  ChevronRight,
  Timer,
  Loader2,
} from "lucide-react";
import StatsModal from "@/components/game/stats-modal";
import { GameConfig } from "@shared/config";
import { fetchJsonOrThrow } from "@/lib/queryClient.ts";
import { useGameStore } from "@/lib/game.ts";
import { useSpellingBeeStore } from "@/lib/spelling-bee";
import { getHintUnlockWordCount } from "@/lib/hints";
import GameLoadError, {
  getErrorMessage,
} from "@/components/shared/game-load-error";
import FoundWordsPanel from "@/components/shared/found-words-panel";
import HintStatus from "@/components/shared/hint-status";
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
const GAME_KEY = "bee-genius";

interface DailySpellingBeeHive {
  letters: string[];
  centerLetter: string;
  themedWords: string[];
}

export default function DailySpellingBee() {
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
    ? `/spelling-bee?${mainMenuParams.toString()}`
    : "/spelling-bee";
  const [currentWord, setCurrentWord] = useState("");
  const [score, setScore] = useState(0);
  const [showStats, setShowStats] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const [outerLetters, setOuterLetters] = useState<string[]>([]);
  const [currentGameIndex, setCurrentGameIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(300);
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
  const [allFoundWords, setAllFoundWords] = useState<string[]>([]);
  const [dailyAttemptState, setDailyAttemptState] = useState<
    "checking" | "ready" | "blocked"
  >(!id || isCompetition ? "ready" : "checking");
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const { isKids } = useGameView();
  const canPlayDaily = isCompetition || dailyAttemptState === "ready";
  const pageTitle = isCompetition
    ? isKids
      ? "Bee Tournament"
      : "Competition Bee Genius"
    : isKids
    ? "Letter Bee"
    : "Daily Bee Genius";
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
  const { result, getResult } = useGameStore();
  const {
    themedWords,
    foundWords,
    nonThemedWords,
    hintsAvailable,
    hintsUsed,
    centerLetter,
    revealedWord,
    resetGame,
    setHive,
    addFoundWord,
    useHint,
  } = useSpellingBeeStore();
  const hasCurrentResult = isCurrentGameResult(result, GAME_KEY, id, date);
  const hasCompletedCurrentResult = isCompletedCurrentGameResult(
    result,
    GAME_KEY,
    id,
    date
  );
  const {
    data: challengeData,
    isLoading,
    error: challengeError,
  } = useQuery<{
    id: number;
    date: string;
    games: DailySpellingBeeHive[];
    expiresAt: string;
    timerSeconds?: number;
    timerEnabled?: boolean;
    maxHints?: number;
  }>({
    queryKey: ["/api/daily-spelling-bee", id, schoolId, competition, date],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (id) params.set("id", id);
      if (schoolId) params.set("school_id", schoolId);
      if (competition) params.set("competition", competition);
      if (date) params.set("date", date);

      return fetchJsonOrThrow<{
        id: number;
        date: string;
        games: DailySpellingBeeHive[];
        expiresAt: string;
        timerSeconds?: number;
        timerEnabled?: boolean;
        maxHints?: number;
      }>(`/api/daily-spelling-bee?${params.toString()}`);
    },
    enabled: !!id,
  });
  const dailyDate = date || challengeData?.date || null;

  const getHiveId = (index: number) => `daily-${index}`;

  const isHiveComplete = (
    index: number,
    foundByHive: Record<string, string[]> = foundWords
  ) => {
    const storyWords = challengeData?.games?.[index]?.themedWords || [];
    const foundForHive = foundByHive[getHiveId(index)] || [];

    return (
      storyWords.length > 0 &&
      storyWords.every((storyWord) => foundForHive.includes(storyWord))
    );
  };

  const moveToHive = (index: number) => {
    const hive = challengeData?.games?.[index];
    if (!hive) return;

    setCurrentGameIndex(index);
    setHive(getHiveId(index), hive.letters, hive.centerLetter, hive.themedWords);
    setOuterLetters(hive.letters);
    setCurrentWord("");
  };

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
    const configuredTimer = challengeData?.timerSeconds || 300;
    if (challengeData?.timerEnabled === false) return elapsedSeconds;
    return Math.max(0, configuredTimer - timeLeft);
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

  useEffect(() => {
    if (isCompetition && !isGameOver && allFoundWords.length > 0) {
      updateResult(false, allFoundWords);
    }
  }, [allFoundWords]);

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
    if (isGameOver) setShowLeaderboard(true);
  }, [isGameOver]);

  useEffect(() => {
    if (challengeData?.timerSeconds) {
      setTimeLeft(challengeData.timerSeconds);
    }
    if (challengeData) {
      setElapsedSeconds(0);
      resetGame();
      setAllFoundWords([]);
      setScore(0);
      setCurrentGameIndex(0);
    }
  }, [challengeData, challengeData?.timerSeconds, resetGame]);

  const finishGame = async (
    completed: boolean,
    reason: "complete" | "time",
    wordsLearned = allFoundWords,
    finalScore = score,
    timeSpentSeconds = getPlayTimeSpentSeconds()
  ) => {
    if (isGameOver) return;

    setIsGameOver(true);
    setEndReason(reason);
    setScore(finalScore);

    const allThemedWords = (challengeData?.games || []).flatMap(
      (hive) => hive.themedWords
    );
    const unfoundWords = allThemedWords.filter(
      (word) => !wordsLearned.includes(word)
    );
    if (unfoundWords.length) {
      submitWordAttempts(
        unfoundWords.map((word) => ({
          bookId: id,
          userId,
          word,
          game: "bee-genius" as const,
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
          : "Daily Bee Genius Complete!",
      description:
        reason === "time"
          ? `You found ${wordsLearned.length} words.`
          : "Great work. Return to the menu when you're ready.",
      variant: reason === "time" ? "destructive" : "default",
    });

    setPendingRecap({
      game: "bee-genius",
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
          void finishGame(
            true,
            "time",
            allFoundWords,
            score,
            challengeData?.timerSeconds || 300
          );
          return 0;
        }

        return prevTime - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [canPlayDaily, challengeData, isGameOver, timeLeft, allFoundWords, score]);

  // Load the current hive into the store whenever the day's data or index changes
  useEffect(() => {
    if (!canPlayDaily || !challengeData?.games?.[currentGameIndex]) return;
    const hive = challengeData.games[currentGameIndex];
    setHive(getHiveId(currentGameIndex), hive.letters, hive.centerLetter, hive.themedWords);
    setOuterLetters(hive.letters);
    setCurrentWord("");
  }, [canPlayDaily, challengeData, currentGameIndex, setHive]);

  const totalGames =
    challengeData?.games?.length || GameConfig.rules.spellingBee.packSize;
  const timerEnabled = challengeData?.timerEnabled !== false;
  const hintUnlockCount = getHintUnlockWordCount(challengeData?.maxHints);

  const handleLetterClick = useCallback((letter: string) => {
    setCurrentWord((prev) => prev + letter);
  }, []);

  const handleBackspace = useCallback(() => {
    setCurrentWord((prev) => prev.slice(0, -1));
  }, []);

  const handleShuffle = useCallback(() => {
    setOuterLetters((letters) => {
      const shuffled = [...letters];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      return shuffled;
    });
  }, []);

  const handleShare = useCallback(() => {
    const result = `Daily Bee Genius\nScore: ${score}\nStory words found: ${allFoundWords.length}\n\nPlay at: ${window.location.origin}/daily-spelling-bee`;

    navigator.clipboard.writeText(result).then(() => {
      toast({
        title: "Copied to clipboard!",
        description: "Share your results with friends!",
      });
    });
  }, [score, allFoundWords.length, toast]);

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

    const revealed = useHint(challengeData?.maxHints);
    toast({
      title: revealed ? "First letter highlighted" : "No hint available",
      description: revealed
        ? "The story word is shown above the hive."
        : "No hidden story word is available to reveal.",
      variant: revealed ? "default" : "destructive",
    });
  };

  const handleSubmit = useCallback(async () => {
    if (isGameOver || !canPlayDaily) return;

    if (currentWord.length < 4) {
      toast({
        title: "Word too short",
        description: "Words must be at least 4 letters long",
        variant: "destructive",
      });
      return;
    }

    if (!currentWord.includes(centerLetter)) {
      toast({
        title: "Invalid word",
        description: "Word must contain the center letter",
        variant: "destructive",
      });
      return;
    }

    const upperWord = currentWord.toUpperCase();
    const result = await addFoundWord(currentWord, challengeData?.maxHints);

    if (result.alreadyFound) {
      toast({
        title: "Word already used",
        description: "Try finding a different word",
        variant: "destructive",
      });
      setCurrentWord("");
      return;
    }

    if (!result.isValid) {
      toast({
        title: "Invalid word",
        description: "Try another word",
        variant: "destructive",
      });
      setCurrentWord("");
      return;
    }

    const points = Math.floor(
      result.isThemed
        ? calculateWordPoints(upperWord) * 1.5
        : calculateWordPoints(upperWord) / 2
    );
    const nextScore = score + points;
    const nextAllFoundWords = [...allFoundWords, upperWord];
    setScore(nextScore);
    setAllFoundWords(nextAllFoundWords);

    if (result.isThemed) {
      const hintApplied = revealedWord === upperWord;
      submitWordAttempt({
        bookId: id,
        userId,
        word: upperWord,
        game: "bee-genius",
        mode: "daily",
        correct: true,
        hintsUsed: hintApplied ? 1 : 0,
        heaviestHintTier: hintApplied ? "heavy" : null,
      });

      const hiveId = getHiveId(currentGameIndex);
      const nextFoundWords = {
        ...foundWords,
        [hiveId]: [...new Set([...(foundWords[hiveId] || []), upperWord])],
      };
      const hiveComplete = isHiveComplete(currentGameIndex, nextFoundWords);
      const allHivesComplete =
        totalGames > 0 &&
        Array.from({ length: totalGames }, (_, index) => index).every(
          (index) => isHiveComplete(index, nextFoundWords)
        );

      if (allHivesComplete) {
        void finishGame(true, "complete", nextAllFoundWords, nextScore);
      } else if (hiveComplete) {
        toast({ title: "Hive complete!", description: `+${points} points` });
        moveToHive(currentGameIndex + 1);
      } else {
        toast({ title: "Story word found!", description: `+${points} points` });
      }
    } else if (result.hintEarned) {
      toast({
        title: "Hint ready",
        description: "Use the lightbulb to reveal story letters.",
      });
    } else {
      toast({ title: "Word found!", description: `+${points} points` });
    }

    setCurrentWord("");
  }, [
    currentWord,
    centerLetter,
    foundWords,
    currentGameIndex,
    allFoundWords,
    totalGames,
    score,
    isGameOver,
    canPlayDaily,
    challengeData,
    addFoundWord,
    toast,
    revealedWord,
    id,
    userId,
  ]);

  const navigateHive = (direction: "prev" | "next") => {
    if (direction === "prev") {
      return;
    }

    if (!isHiveComplete(currentGameIndex)) {
      toast({
        title: "Finish this hive first",
        description: "Find every story word before moving to the next hive.",
        variant: "destructive",
      });
      return;
    }

    const newIndex = currentGameIndex + 1;
    if (newIndex < totalGames) {
      moveToHive(newIndex);
    }
  };

  // Handle keyboard input
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!canPlayDaily) return;

      // Handle Enter key first
      if (e.key === "Enter") {
        e.preventDefault();
        handleSubmit();
        return;
      }

      // Handle Backspace
      if (e.key === "Backspace") {
        e.preventDefault();
        handleBackspace();
        return;
      }

      // Handle letter input last
      if (/^[A-Za-z]$/.test(e.key)) {
        const letter = e.key.toUpperCase();
        if ([...outerLetters, centerLetter].includes(letter)) {
          handleLetterClick(letter);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    outerLetters,
    centerLetter,
    canPlayDaily,
    handleLetterClick,
    handleSubmit,
    handleBackspace,
  ]);

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

  if (challengeError || !challengeData?.games?.length) {
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

  const currentHiveWords = foundWords[getHiveId(currentGameIndex)] || [];
  const currentHiveComplete = isHiveComplete(currentGameIndex);
  const hintProgress = nonThemedWords.length % hintUnlockCount;

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
          <div className="bg-primary/10 px-3 py-1 rounded-full">
            <span className="text-sm font-medium">
              Hive {currentGameIndex + 1}/{totalGames}
            </span>
          </div>
          <HintStatus
            storyFound={currentHiveWords.length}
            storyTotal={themedWords.length}
            nonStoryWordCount={nonThemedWords.length}
            hintProgress={hintProgress}
            hintsAvailable={hintsAvailable}
            hintsUsed={hintsUsed}
            hintUnlockWordCount={challengeData?.maxHints}
            onUseHint={handleUseHint}
          />
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-full bg-primary/10"
            onClick={() => setShowTutorial(true)}
            title="How to Play"
          >
            <HelpCircle className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleShare}
            className="h-8 w-8 rounded-full bg-primary/10"
            title="Share"
          >
            <Share2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="text-2xl font-medium tracking-wider h-12 min-w-[200px] text-center mb-4 sm:text-4xl sm:mb-8">
        {currentWord || (
          <span className="text-muted-foreground text-xl">
            {isKids ? "Tap letters" : "Type or click letters"}
          </span>
        )}
      </div>

      <SpellingBeeBoard
        letters={outerLetters}
        centerLetter={centerLetter}
        onLetterClick={handleLetterClick}
        revealedWord={revealedWord}
        disabled={isGameOver}
      />

      <div className="flex flex-wrap items-center justify-center gap-3 mt-8">
        <Button
          variant="outline"
          size="icon"
          onClick={() => navigateHive("prev")}
          disabled
          className="w-12 h-12"
          title="Previous hives are locked"
        >
          <ChevronLeft className="w-5 h-5" />
        </Button>
        <Button
          variant="outline"
          size="lg"
          onClick={handleBackspace}
          className="w-24"
        >
          <Delete className="w-4 h-4 mr-2" />
          Delete
        </Button>
        <Button
          variant="outline"
          size="icon"
          onClick={handleShuffle}
          className="w-12 h-12"
        >
          <RefreshCw className="w-5 h-5" />
        </Button>
        <Button
          variant="outline"
          size="lg"
          onClick={handleSubmit}
          className="w-24"
        >
          Enter
        </Button>
        <Button
          variant="outline"
          size="icon"
          onClick={() => navigateHive("next")}
          disabled={currentGameIndex === totalGames - 1 || !currentHiveComplete}
          className="w-12 h-12"
          title={
            currentHiveComplete
              ? "Next hive"
              : "Find every story word before moving on"
          }
        >
          <ChevronRight className="w-5 h-5" />
        </Button>
      </div>

      <FoundWordsPanel words={currentHiveWords} className="mt-8" />

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
        </div>
      )}

      <StatsModal open={showStats} onClose={() => setShowStats(false)} />
      <TutorialModal
        open={showTutorial}
        onClose={() => setShowTutorial(false)}
        game="bee-genius"
        gameMode={isCompetition ? "competition" : "daily"}
      />
      <DailyLeaderboardDialog
        bookId={id}
        game={GAME_KEY}
        date={dailyDate}
        userId={userId}
        open={showLeaderboard}
        onOpenChange={setShowLeaderboard}
        title="Bee Genius Leaderboard"
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
