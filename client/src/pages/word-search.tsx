import { useState, useEffect } from "react";
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
import { fetchJsonOrThrow } from "@/lib/queryClient";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { formatShareText } from "@/lib/utils";
import GameResultModal from "@/components/shared/game-result-modal";
import GameLoadError, {
  getErrorMessage,
} from "@/components/shared/game-load-error";
import { useGameView } from "@/lib/game-view";
import {
  submitWordAttempt,
  submitWordAttempts,
  hintLevelToTier,
} from "@/lib/word-attempts";
import { submitPracticePlay } from "@/lib/practice-play";
import { postGameRecap, isEmbeddedInParentFrame } from "@/lib/game-recap";

const useQuerys = () => {
  return new URLSearchParams(window.location.search);
};

type WordSearchDifficulty = "easy" | "medium" | "hard" | "expert";

const getTimeLimit = (difficulty: WordSearchDifficulty): number =>
  GameConfig.rules.wordSearch?.difficulty[difficulty]?.timeLimit ?? 300;

export default function WordSearch() {
  const query = useQuerys();
  const id = query.get("id");
  const userId = query.get("user_id");
  const mainMenuPath = id ? `/?id=${id}` : "/";
  const [, setLocation] = useLocation();
  const [difficulty, setDifficulty] = useState<WordSearchDifficulty>("medium");
  const [foundWords, setFoundWords] = useState<string[]>([]);
  const [hintsUsedTotal, setHintsUsedTotal] = useState(0);
  const [timeLeft, setTimeLeft] = useState<number>(() =>
    getTimeLimit("medium")
  );
  const [showStats, setShowStats] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const [showResultModal, setShowResultModal] = useState(false);
  const [isGameOver, setIsGameOver] = useState(false);
  const [endReason, setEndReason] = useState<"complete" | "time" | null>(null);
  const [playToken, setPlayToken] = useState(
    () => `${Date.now()}-${Math.random().toString(36).slice(2)}`
  );
  const { toast } = useToast();
  const { isKids } = useGameView();

  const { gameStarted, score, addToScore, clearScore, startGame, resetGame } =
    useGameStore();

  useEffect(() => {
    return () => {
      resetGame();
    };
  }, [resetGame]);

  useEffect(() => {
    // See game.tsx — the parent's recap overlay covers this moment when embedded.
    if (isGameOver && !isEmbeddedInParentFrame()) setShowResultModal(true);
  }, [isGameOver]);

  const outcome: "win" | "loss" | null = isGameOver
    ? endReason === "complete"
      ? "win"
      : "loss"
    : null;

  const startWordSearch = (selectedDifficulty: WordSearchDifficulty) => {
    setDifficulty(selectedDifficulty);
    setFoundWords([]);
    setHintsUsedTotal(0);
    setTimeLeft(getTimeLimit(selectedDifficulty));
    setIsGameOver(false);
    setEndReason(null);
    setShowResultModal(false);
    clearScore();
    setPlayToken(`${Date.now()}-${Math.random().toString(36).slice(2)}`);
    startGame();
  };

  // Fetch puzzle data
  const {
    data: puzzleData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["/api/word-search", difficulty, id, playToken],
    queryFn: async () => {
      const params = new URLSearchParams({ difficulty });
      if (id) params.set("id", id);
      params.set("play", playToken);

      return fetchJsonOrThrow<any>(`/api/word-search?${params.toString()}`);
    },
    enabled: gameStarted && !!id,
  });

  useEffect(() => {
    if (!gameStarted || !puzzleData || isGameOver || timeLeft <= 0) return;

    const timer = setInterval(() => {
      setTimeLeft((prevTime) => {
        if (prevTime <= 1) {
          clearInterval(timer);
          handleGameOver(false);
          return 0;
        }

        return prevTime - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [gameStarted, puzzleData, isGameOver, timeLeft]);

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
    if (isGameOver || foundWords.includes(word)) return;

    // Calculate base points
    // const basePoints = puzzleData?.scoring?.baseScore || 10;
    // const lengthBonus = word.length;

    let points = calculateWordPoints(word);

    // Calculate point deductions for hints
    if (hintLevel > 0) {
      const deductionPerHint = Math.round(points * 0.3); // 30% of base points per hint
      const totalDeduction = deductionPerHint * hintLevel;
      points -= totalDeduction;
      points = Math.max(0, points);

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

    const updatedFoundWords = [...foundWords, word];
    const nextScore = score + points;
    const nextHintsUsedTotal = hintsUsedTotal + hintLevel;

    addToScore(points);
    setFoundWords(updatedFoundWords);
    setHintsUsedTotal(nextHintsUsedTotal);

    submitWordAttempt({
      bookId: id,
      userId,
      word,
      game: "word-explorer",
      mode: "practice",
      correct: true,
      hintsUsed: hintLevel,
      heaviestHintTier: hintLevelToTier(hintLevel),
    });

    if (puzzleData && updatedFoundWords.length === puzzleData.words.length) {
      handleGameComplete(updatedFoundWords, nextScore, nextHintsUsedTotal);
    }
  };

  const handleGameComplete = (
    wordsLearned = foundWords,
    currentScore = score,
    hintsUsed = hintsUsedTotal
  ) => {
    if (isGameOver) return;

    const timeBonus =
      Math.floor(timeLeft / 30) *
      (GameConfig.rules.wordSearch?.scoring.timeBonus ?? 5);
    const difficultyMultiplier =
      GameConfig.rules.wordSearch?.scoring.difficultyMultiplier[difficulty] ??
      1;
    const finalScore = Math.round(
      (currentScore + timeBonus) * difficultyMultiplier
    );

    addToScore(finalScore - currentScore);
    setIsGameOver(true);
    setEndReason("complete");

    toast({
      title: "Puzzle Complete! 🎉",
      description: `Found ${wordsLearned.length} words. Final score: ${finalScore}.`,
    });

    submitPracticePlay({
      bookId: id,
      userId,
      game: "word-explorer",
      score: finalScore,
      timeSpentSeconds: getTimeLimit(difficulty) - timeLeft,
      wordsLearned,
    });

    postGameRecap({
      game: "word-explorer",
      mode: "practice",
      bookId: id,
      userId,
      wordsGuessed: wordsLearned.length,
      hintsUsed,
      outcome: "win",
    });
  };

  const handleGameOver = (syncTimer = true) => {
    if (isGameOver) return;

    setIsGameOver(true);
    setEndReason("time");
    if (syncTimer) {
      setTimeLeft(0);
    }

    const unfoundWords: string[] = (puzzleData?.words || []).filter(
      (word: string) => !foundWords.includes(word)
    );
    if (unfoundWords.length) {
      submitWordAttempts(
        unfoundWords.map((word) => ({
          bookId: id,
          userId,
          word,
          game: "word-explorer" as const,
          mode: "practice" as const,
          correct: false,
        }))
      );
    }

    toast({
      title: "Time's Up!",
      description: `You found ${foundWords.length} words!`,
      variant: "destructive",
    });

    submitPracticePlay({
      bookId: id,
      userId,
      game: "word-explorer",
      score,
      timeSpentSeconds: getTimeLimit(difficulty) - timeLeft,
      wordsLearned: foundWords,
    });

    postGameRecap({
      game: "word-explorer",
      mode: "practice",
      bookId: id,
      userId,
      wordsGuessed: foundWords.length,
      hintsUsed: hintsUsedTotal,
      outcome: "loss",
    });
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
  };

  const handleShare = () => {
    if (!puzzleData) return;

    const timeSpent = getTimeLimit(difficulty) - timeLeft;
    const completionPercentage = Math.round(
      (foundWords.length / (puzzleData?.words.length || 1)) * 100
    );

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

      for (let i = 0; i < puzzleData.grid.length; i++) {
        for (let j = 0; j < puzzleData.grid[i].length; j++) {
          directions.forEach((direction) => {
            let found = true;
            const positions = [];

            for (let k = 0; k < word.length; k++) {
              const pos = direction(i, j, k);
              if (
                !puzzleData.grid[pos.row] ||
                !puzzleData.grid[pos.row][pos.col] ||
                puzzleData.grid[pos.row][pos.col] !== word[k]
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

    const result = formatShareText({
      gameName: `Word Explorer (${difficulty})`,
      guesses: foundWords.length,
      maxGuesses: puzzleData?.words.length || 0,
      timeSpent,
      wordLength: puzzleData?.grid.length || 0,
      achievements: [],
      emoji: `${emojiGrid}\n\n🎯 Found: ${foundWords.length}/${
        puzzleData?.words.length || 0
      } words (${completionPercentage}%)\n⏱️ Time: ${formatTime(
        timeSpent
      )}\n📝 Found Words: ${foundWords.join(", ")}`,
    });

    navigator.clipboard
      .writeText(result)
      .then(() => {
        toast({
          title: "Results Copied! 📋",
          description: "Share your puzzle solving skills with friends!",
          variant: "default",
        });
      })
      .catch(() => {
        toast({
          title: "Failed to copy",
          description: "Please try again",
          variant: "destructive",
        });
      });
  };

  if (!gameStarted) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <motion.h1
          className="text-4xl font-bold mb-8"
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
        >
          {isKids ? "Word Hunt" : "Word Explorer"}
        </motion.h1>
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="w-full max-w-md"
        >
          <Card className="p-6">
            <CardHeader>
              <CardTitle>Select Grid Size</CardTitle>
              <CardDescription>
                Choose your preferred grid size and word count
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Button
                  variant={difficulty === "easy" ? "default" : "outline"}
                  className="w-full"
                  onClick={() => startWordSearch("easy")}
                >
                  Easy (5×5 Grid)
                </Button>
                <Button
                  variant={difficulty === "medium" ? "default" : "outline"}
                  className="w-full"
                  onClick={() => startWordSearch("medium")}
                >
                  Medium (6×6 Grid)
                </Button>
                <Button
                  variant={difficulty === "hard" ? "default" : "outline"}
                  className="w-full"
                  onClick={() => startWordSearch("hard")}
                >
                  Hard (7×7 Grid)
                </Button>
                <Button
                  variant={difficulty === "expert" ? "default" : "outline"}
                  className="w-full"
                  onClick={() => startWordSearch("expert")}
                >
                  Expert (8×8 Grid)
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Loading puzzle...</p>
      </div>
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
          {isKids ? "Word Hunt" : "Word Explorer"}
        </h1>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-3 mb-6">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setShowStats(true)}
          className="relative"
          title="Statistics"
        >
          <BarChart2 className="h-5 w-5" />
        </Button>

        <div className="flex flex-wrap items-center justify-center gap-3">
          <div className="flex items-center space-x-2 bg-primary/10 px-3 py-1 rounded-full">
            <Timer className="w-4 h-4" />
            <span className="font-mono">{formatTime(timeLeft)}</span>
          </div>
          <div className="bg-primary/10 px-3 py-1 rounded-full">
            <span className="text-sm font-medium">
              Words: {foundWords.length}/{puzzleData?.words.length ?? 0}
            </span>
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
          >
            <HelpCircle className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <WordSearchGrid
        grid={puzzleData.grid}
        words={puzzleData.words}
        onWordFound={handleWordFound}
        difficulty={difficulty}
        scoring={puzzleData.scoring}
        disabled={isGameOver}
      />

      <GameResultModal
        open={showResultModal}
        onOpenChange={setShowResultModal}
        gameName="word-explorer"
        outcome={outcome}
        stats={{
          wordsFound: foundWords.length,
          timeSpentSeconds: getTimeLimit(difficulty) - timeLeft,
        }}
        onPlayAgain={() => startWordSearch(difficulty)}
      />
      <StatsModal open={showStats} onClose={() => setShowStats(false)} />
      <TutorialModal
        open={showTutorial}
        onClose={() => setShowTutorial(false)}
        game="word-explorer"
      />
    </div>
  );
}
