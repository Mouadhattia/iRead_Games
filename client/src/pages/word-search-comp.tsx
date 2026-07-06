import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
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
import { Confetti } from "@/components/ui/confetti.tsx";
import { apiRequest, fetchJsonOrThrow } from "@/lib/queryClient.ts";
import GameLoadError, {
  getErrorMessage,
} from "@/components/shared/game-load-error";

const useQuerys = () => {
  return new URLSearchParams(window.location.search);
};
export default function WordSearchComp() {
  const query = useQuerys();
  const id = query.get("id");
  const mainMenuPath = id ? `/?id=${id}` : "/";
  const [, setLocation] = useLocation();
  const [difficulty, setDifficulty] = useState<
    "easy" | "medium" | "hard" | "expert"
  >("expert");
  const [foundWords, setFoundWords] = useState<string[]>([]);
  const [timeLeft, setTimeLeft] = useState(300);
  const [showStats, setShowStats] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const [score, setScore] = useState(0);
  const [isGameOver, setIsGameOver] = useState(false);
  const [endReason, setEndReason] = useState<"complete" | "time" | null>(null);
  const { toast } = useToast();

  const { gameStarted, startGame, resetGame, result } = useGameStore();

  useEffect(() => {
    if (result?.id) return;

    toast({
      title: "Competition result missing",
      description: "Start the competition from the games menu.",
      variant: "destructive",
    });
    setLocation(mainMenuPath);
  }, [result?.id, mainMenuPath, setLocation, toast]);

  const updateResult = async (
    completed: boolean,
    wordsLearned = foundWords,
    finalScore = score
  ) => {
    if (!result?.id) return;

    try {
      await apiRequest("POST", "/api/update-result", {
        id: result.id,
        score: finalScore,
        words_learned: wordsLearned,
        completed,
      });
    } catch (error) {
      console.error("Failed to save game result:", error);
    }
  };
  // Fetch puzzle data
  const {
    data: puzzleData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["/api/word-search", difficulty, id],
    queryFn: async () => {
      const params = new URLSearchParams({ difficulty });
      if (id) params.set("id", id);

      return fetchJsonOrThrow<any>(`/api/word-search?${params.toString()}`);
    },
    enabled: gameStarted && !!id,
  });

  useEffect(() => {
    if (!gameStarted) {
      startGame();
    }
  }, [gameStarted, startGame]);

  useEffect(() => {
    return () => {
      resetGame();
    };
  }, [resetGame]);

  const finishGame = async (
    completed: boolean,
    reason: "complete" | "time",
    wordsLearned = foundWords,
    finalScore = score
  ) => {
    if (isGameOver) return;

    setIsGameOver(true);
    setEndReason(reason);
    setScore(finalScore);
    await updateResult(completed, wordsLearned, finalScore);

    toast({
      title: reason === "time" ? "Time's Up!" : "Competition Complete!",
      description:
        reason === "time"
          ? `You found ${wordsLearned.length} words.`
          : "Great work. Return to the menu when you're ready.",
      variant: reason === "time" ? "destructive" : "default",
    });

    if (reason === "time") {
      setLocation(mainMenuPath);
    }
  };

  useEffect(() => {
    if (!gameStarted || !puzzleData || isGameOver || timeLeft <= 0) return;

    const timer = setInterval(() => {
      setTimeLeft((prevTime) => {
        if (prevTime <= 1) {
          clearInterval(timer);
          void finishGame(true, "time", foundWords, score);
          return 0;
        }

        return prevTime - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [gameStarted, puzzleData, isGameOver, timeLeft, foundWords, score]);

  const handleWordFound = (word: string, hintLevel: number) => {
    if (isGameOver) return;
    if (foundWords.includes(word)) return; // Avoid duplicates

    let points = 1;

    if (hintLevel > 0) {
      const totalDeduction = 0.25 * hintLevel;
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

    // Update score
    setScore(nextScore);

    // Update foundWords (this will trigger useEffect)
    setFoundWords((prevFoundWords) => {
      const updatedFoundWords = [...prevFoundWords, word];

      // Check for puzzle completion only here
      if (puzzleData && updatedFoundWords.length === puzzleData.words.length) {
        handleGameComplete(updatedFoundWords, nextScore);
      }

      return updatedFoundWords;
    });
  };

  const handleGameComplete = (
    wordsLearned = foundWords,
    currentScore = score
  ) => {
    const timeBonus =
      Math.floor(timeLeft / 30) *
      (GameConfig.rules.wordSearch?.scoring.timeBonus ?? 5);
    const difficultyMultiplier =
      GameConfig.rules.wordSearch?.scoring.difficultyMultiplier[difficulty] ??
      1;
    const finalScore = (currentScore + timeBonus) * difficultyMultiplier;
    void finishGame(true, "complete", wordsLearned, finalScore);

    // addToScore(timeBonus);
    toast({
      title: "Puzzle Complete! 🎉",
      description: `Time Bonus: +${timeBonus} points!`,
    });
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
  };

  const handleShare = () => {
    const timeSpent = 300 - timeLeft;
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
      gameName: `Competition Word Explorer (${difficulty})`,
      score,
      guesses: foundWords.length,
      maxGuesses: puzzleData?.words.length || 0,
      timeSpent,
      wordLength: puzzleData?.grid.length || 0,
      achievements: [],
      emoji: `${emojiGrid}\n\n🎯 Found: ${foundWords.length}/${
        puzzleData?.words.length || 0
      } words\n⏱️ Time: ${formatTime(
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

  useEffect(() => {
    if (!isGameOver && foundWords.length > 0) {
      let completed = foundWords.length === puzzleData?.words.length;
      updateResult(completed);
    }
  }, [foundWords]);
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
          Competition Word Explorer
        </h1>
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
            <span className="font-mono">{formatTime(timeLeft)}</span>
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
          difficulty={difficulty}
          scoring={puzzleData.scoring}
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
        gameMode="competition"
        game="word-explorer"
      />
    </div>
  );
}
