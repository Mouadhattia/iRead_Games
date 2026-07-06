import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "wouter";
import GameBoard from "@/components/game/board";
import Keyboard from "@/components/game/keyboard";
import DifficultySelector from "@/components/game/difficulty-selector";
import { checkGuess, useGameStore } from "@/lib/game";
import { apiRequest, fetchJsonOrThrow } from "@/lib/queryClient";
import Hint from "@/components/game/hint";
import {
  Share2,
  ArrowLeft,
  BarChart2,
  AlertCircle,
  HelpCircle,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import StatsModal from "@/components/game/stats-modal";
import { formatShareText } from "@/lib/utils";
import { GameConfig } from "@shared/config";
import TutorialModal from "@/components/game/tutorial-modal";
import GameResultModal from "@/components/shared/game-result-modal";
import GameLoadError, {
  getErrorMessage,
} from "@/components/shared/game-load-error";
import { useGameView } from "@/lib/game-view";
import { submitWordAttempt } from "@/lib/word-attempts";
import { postGameRecap, isEmbeddedInParentFrame } from "@/lib/game-recap";

/**
 * Classic Wordle Game Component
 * A word guessing game with colored feedback
 *
 * Features:
 * - Multiple word lengths (3-7 letters)
 * - Difficulty-based guess limits
 * - Score tracking with bonuses
 * - Achievement system
 * - Share results functionality
 */
const useQuerys = () => {
  return new URLSearchParams(window.location.search);
};
export default function Game() {
  const query = useQuerys();
  const id = query.get("id");
  const userId = query.get("user_id");
  const [, setLocation] = useLocation();
  const [guesses, setGuesses] = useState<string[]>([]);
  const [currentGuess, setCurrentGuess] = useState("");
  const [isGameOver, setIsGameOver] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [invalidAttempt, setInvalidAttempt] = useState(false);
  const { toast } = useToast();
  const [startTime, setStartTime] = useState<number | null>(null);
  const [showTutorial, setShowTutorial] = useState(false);
  const [showResultModal, setShowResultModal] = useState(false);
  const [playToken, setPlayToken] = useState(
    () => `${Date.now()}-${Math.random().toString(36).slice(2)}`
  );
  const { isKids } = useGameView();

  const {
    setShowHint,
    showHint,
    showHintButton,
    setShowHintButton,
    stats,
    gameStarted,
    wordLength,
    maxGuesses,
    addToScore,
    endGame,
    resetGame,
    achievements,
    gameMetrics,
    hintsUsedThisGame,
  } = useGameStore();

  // Reset game on unmount
  useEffect(() => {
    return () => {
      resetGame();
    };
  }, [resetGame]);

  useEffect(() => {
    // When embedded in IREAD_FRONT, the parent's recap overlay covers this
    // moment fully (words/hints stats, achievements, play-again) — showing
    // this native modal too would stack two "you're done" screens.
    if (isGameOver && !isEmbeddedInParentFrame()) setShowResultModal(true);
  }, [isGameOver]);

  const outcome: "win" | "loss" | null = isGameOver
    ? gameMetrics?.won
      ? "win"
      : "loss"
    : null;

  const handlePlayAgain = () => {
    setShowResultModal(false);
    setGuesses([]);
    setCurrentGuess("");
    setIsGameOver(false);
    setInvalidAttempt(false);
    setStartTime(null);
    useGameStore.setState({
      gameMetrics: null,
      hintsUsedThisGame: 0,
      showHint: false,
      showHintButton: false,
    });
    setPlayToken(`${Date.now()}-${Math.random().toString(36).slice(2)}`);
  };

  // Fetch target word based on selected length
  const {
    data: wordData,
    isLoading: isWordLoading,
    error: wordError,
  } = useQuery<{ word: string }>({
    queryKey: ["/api/word", wordLength, id, playToken],
    queryFn: async () => {
      const params = new URLSearchParams({ length: String(wordLength) });
      if (id) params.set("id", id);
      params.set("play", playToken);

      return fetchJsonOrThrow<{ word: string }>(
        `/api/word?${params.toString()}`
      );
    },
    enabled: gameStarted && !!id,
  });
  // Start timer when game begins
  useEffect(() => {
    if (gameStarted && !startTime) {
      setStartTime(Date.now());
    }
  }, [gameStarted, startTime]);

  const targetWord = wordData?.word || "";

  // Update max guesses based on word length
  useEffect(() => {
    if (wordLength) {
      const configuredGuesses =
        GameConfig.rules.maxGuesses[
          wordLength as keyof typeof GameConfig.rules.maxGuesses
        ];
      if (configuredGuesses !== maxGuesses) {
        useGameStore.setState({ maxGuesses: configuredGuesses });
      }
    }
  }, [wordLength, maxGuesses]);

  const calculateTimeSpent = () => {
    if (!startTime) return 0;
    return Math.floor((Date.now() - startTime) / 1000);
  };

  const handleShare = () => {
    if (!isGameOver) return;

    const timeSpent = calculateTimeSpent();
    const emoji = guesses
      .map((guess) =>
        checkGuess(guess, targetWord)
          .map((state) => {
            if (state === "correct") return "🟩";
            if (state === "present") return "🟨";
            return "⬛";
          })
          .join("")
      )
      .join("\n");

    const result = formatShareText({
      gameName: "Classic Wordle",
      guesses: guesses.length,
      maxGuesses,
      timeSpent,
      wordLength,
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

  const handleKeyPress = async (key: string) => {
    if (isGameOver) return;

    if (showHint) {
      setShowHint(false);
    }

    if (key === "ENTER") {
      if (currentGuess.length !== wordLength) {
        setInvalidAttempt(true);
        toast({
          title: "Word too short",
          description: `Please enter a ${wordLength}-letter word`,
          variant: "destructive",
        });
        return;
      }

      if (guesses.includes(currentGuess)) {
        setInvalidAttempt(true);
        toast({
          title: "Already tried",
          description: "Use a new word for this guess.",
          variant: "destructive",
        });
        return;
      }

      const res = await apiRequest("POST", "/api/validate", {
        guess: currentGuess,
        wordLength: wordLength,
      });
      const { isValid, isPredefinedWord, score: guessScore } = await res.json();

      if (!isValid) {
        setInvalidAttempt(true);
        toast({
          title: "Invalid word",
          description: "Please enter a valid word",
          variant: "destructive",
        });
        return;
      }

      setInvalidAttempt(false);

      if (isPredefinedWord) {
        addToScore(guessScore);
        toast({
          title: "Story word!",
          description: "That's one of today's story words 📖",
        });
      }

      const nextGuesses = [...guesses, currentGuess];
      setGuesses(nextGuesses);
      setCurrentGuess("");

      if (currentGuess === targetWord) {
        endGame(true, nextGuesses);
        setIsGameOver(true);
        submitWordAttempt({
          bookId: id,
          userId,
          word: targetWord,
          game: "think-word",
          mode: "practice",
          correct: true,
          hintsUsed: hintsUsedThisGame,
          heaviestHintTier: hintsUsedThisGame > 0 ? "light" : null,
        });
        toast({
          title: "Congratulations!",
          description: `You won! Current streak: ${stats.streak + 1} 🎉`,
        });
        postGameRecap({
          game: "think-word",
          mode: "practice",
          bookId: id,
          userId,
          wordsGuessed: 1,
          hintsUsed: hintsUsedThisGame,
          outcome: "win",
        });
      } else if (guesses.length === maxGuesses - 1) {
        endGame(false, nextGuesses);
        setIsGameOver(true);
        submitWordAttempt({
          bookId: id,
          userId,
          word: targetWord,
          game: "think-word",
          mode: "practice",
          correct: false,
        });
        toast({
          title: "Game Over",
          description: `The word was ${targetWord}. Streak ended at ${stats.streak}`,
          variant: "destructive",
        });
        postGameRecap({
          game: "think-word",
          mode: "practice",
          bookId: id,
          userId,
          wordsGuessed: 0,
          hintsUsed: hintsUsedThisGame,
          outcome: "loss",
        });
      }
    } else if (key === "BACKSPACE") {
      setCurrentGuess((prev) => prev.slice(0, -1));
      setInvalidAttempt(false);
    } else if (currentGuess.length < wordLength) {
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
  }, [currentGuess, guesses, isGameOver]);

  useEffect(() => {
    if (guesses.length === maxGuesses - 1 && !isGameOver) {
      setShowHintButton(true);
    }
  }, [guesses.length, maxGuesses, isGameOver]);

  if (!gameStarted) {
    return <DifficultySelector />;
  }

  if (isWordLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Loading word...</p>
      </div>
    );
  }

  if (wordError || !wordData?.word) {
    return (
      <GameLoadError
        message={
          !id
            ? "Open this game from an iRead book to load today's words."
            : getErrorMessage(
                wordError,
                "No words available today. Please try again later."
              )
        }
        onBack={() => setLocation(id ? `/?id=${id}` : "/")}
        onRetry={() => window.location.reload()}
      />
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 pt-16 sm:pt-4">
      <div className="relative w-full max-w-4xl flex items-center justify-center gap-2 mb-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setLocation(id ? `/?id=${id}` : "/")}
          className="absolute left-0 top-1/2 -translate-y-1/2"
        >
          <ArrowLeft className="h-6 w-6" />
        </Button>
        <motion.h1
          className="text-2xl font-bold text-center leading-tight px-12 sm:text-4xl"
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
        >
          {isKids ? "Secret Word" : "Think Word"}
        </motion.h1>
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

        <motion.div
          className="flex flex-wrap items-center justify-center gap-3"
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
        >
          <div className="flex items-center space-x-2 bg-primary/10 px-3 py-1 rounded-full">
            <span className="text-sm font-medium">Guess:</span>
            <span className="text-lg font-bold text-primary">
              {guesses.length}/{maxGuesses}
            </span>
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
        </motion.div>
      </div>

      <AnimatePresence>
        {invalidAttempt && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mb-4 flex items-center gap-2 text-destructive"
          >
            <AlertCircle className="h-4 w-4" />
            <span>Invalid word - try again</span>
          </motion.div>
        )}
      </AnimatePresence>

      <GameBoard
        guesses={guesses}
        currentGuess={currentGuess}
        targetWord={targetWord}
        wordLength={wordLength}
        maxGuesses={maxGuesses}
      />

      {showHint && !isGameOver && <Hint word={targetWord} />}

      {isGameOver && (
        <Button onClick={handleShare} className="mt-4 mb-6" variant="outline">
          <Share2 className="w-4 h-4 mr-2" />
          Share Results
        </Button>
      )}

      <Keyboard
        guesses={guesses}
        targetWord={targetWord}
        onKeyPress={handleKeyPress}
      />
      <GameResultModal
        open={showResultModal}
        onOpenChange={setShowResultModal}
        gameName="think-word"
        outcome={outcome}
        stats={{
          guessesUsed: gameMetrics?.guessesUsed,
          hintsUsed: gameMetrics?.hintsUsed,
          timeSpentSeconds: gameMetrics?.timeSpent,
        }}
        onPlayAgain={handlePlayAgain}
      />
      <StatsModal open={showStats} onClose={() => setShowStats(false)} />
      <TutorialModal
        open={showTutorial}
        onClose={() => setShowTutorial(false)}
        game="think-word"
      />
    </div>
  );
}
