import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowLeft, HelpCircle } from "lucide-react";
import Board from "@/components/strands/board";
import { useStrandsStore } from "@/lib/strands";
import TutorialModal from "@/components/game/tutorial-modal";
import DifficultySelector from "@/components/strands/difficulty-selector";
import GameResultModal from "@/components/shared/game-result-modal";
import FoundWordsPanel from "@/components/shared/found-words-panel";
import HintStatus from "@/components/shared/hint-status";
import { fetchJsonOrThrow } from "@/lib/queryClient";
import GameLoadError, {
  getErrorMessage,
} from "@/components/shared/game-load-error";
import { useGameView } from "@/lib/game-view";
import { submitWordAttempt } from "@/lib/word-attempts";
import { postGameRecap, isEmbeddedInParentFrame } from "@/lib/game-recap";

const useQuerys = () => {
  return new URLSearchParams(window.location.search);
};

export default function Strands() {
  const query = useQuerys();
  const id = query.get("id");
  const userId = query.get("user_id");
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [showTutorial, setShowTutorial] = useState(false);
  const [showResultModal, setShowResultModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);
  const [playToken] = useState(
    () => `${Date.now()}-${Math.random().toString(36).slice(2)}`
  );
  const { isKids } = useGameView();
  const {
    letters,
    foundWords,
    themedWords,
    wordPositions,
    gameStarted,
    gridSize,
    initializeGame,
    addFoundWord,
    currentPuzzleId,
    nonThemedWords,
    hintsAvailable,
    hintsUsed,
    revealedWord,
    useHint,
    isGameOver,
    endGame,
  } = useStrandsStore();

  useEffect(() => {
    // See game.tsx — the parent's recap overlay covers this moment when embedded.
    if (isGameOver && !isEmbeddedInParentFrame()) setShowResultModal(true);
  }, [isGameOver]);

  const outcome: "win" | "loss" | null = isGameOver ? "win" : null;

  const handlePlayAgain = () => {
    setShowResultModal(false);
    void startGame(gridSize);
  };

  const startGame = async (size: number) => {
    setLoading(true);
    setStartError(null);
    try {
      const params = new URLSearchParams({ size: String(size) });
      if (id) params.set("id", id);
      params.set("play", playToken);

      const puzzle = await fetchJsonOrThrow<any>(
        `/api/strands/puzzle?${params.toString()}`
      );

      const grid = Array.from({ length: size }, (_, row) =>
        puzzle.letters.slice(row * size, (row + 1) * size)
      );

      initializeGame(
        size,
        puzzle.id,
        puzzle.themedWords || [],
        grid,
        puzzle.wordPositions || []
      );
    } catch (error) {
      console.error("Error starting game:", error);
      setStartError(
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

  const currentWords = foundWords[currentPuzzleId] || [];
  const hintProgress = nonThemedWords.length % 3;

  const handleUseHint = () => {
    const readyHints =
      Math.max(hintsAvailable, Math.floor(nonThemedWords.length / 3)) -
      hintsUsed;

    if (readyHints <= 0) {
      toast({
        title: "No hint available",
        description: "Find three valid non-story words to unlock one.",
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

    const revealedWord = useHint();
    toast({
      title: revealedWord ? "First letter highlighted" : "No hint available",
      description: revealedWord
        ? "The story word is shown above the board."
        : "No hidden story word is available to reveal.",
      variant: revealedWord ? "default" : "destructive",
    });
  };

  const handleWordComplete = async (word: string) => {
    if (isGameOver) return;

    const upperWord = word.toUpperCase();

    if (upperWord.length < 3) {
      toast({
        title: "Word too short",
        description: "Words must be at least 3 letters long",
        variant: "destructive",
      });
      return;
    }
    if (currentWords.includes(upperWord)) {
      toast({
        title: "Word already found",
        description: "Try finding a different word",
        variant: "destructive",
      });
      return;
    }
    const result = await addFoundWord(upperWord);

    if (result.isValid && result.isThemed) {
      const hintApplied = revealedWord === upperWord;
      submitWordAttempt({
        bookId: id,
        userId,
        word: upperWord,
        game: "intellect-link",
        mode: "practice",
        correct: true,
        hintsUsed: hintApplied ? 1 : 0,
        heaviestHintTier: hintApplied ? "heavy" : null,
      });

      const nextStoryWords = [...new Set([...currentWords, upperWord])];
      const isComplete =
        themedWords.length > 0 &&
        themedWords.every((storyWord) =>
          nextStoryWords.includes(storyWord.toUpperCase())
        );

      toast({
        title: isComplete ? "Intellect Link complete!" : "Story word found!",
        description: isComplete
          ? "You found every story word."
          : `${nextStoryWords.length}/${themedWords.length} story words found`,
      });

      if (isComplete) {
        endGame();
        postGameRecap({
          game: "intellect-link",
          mode: "practice",
          bookId: id,
          userId,
          wordsGuessed: nextStoryWords.length,
          hintsUsed,
          outcome: "win",
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
        description: `Hint progress ${result.hintProgress}/3`,
      });
    } else {
      toast({
        title: "Invalid word",
        description: "Try another combination",
        variant: "destructive",
      });
    }
  };

  if (!gameStarted) {
    if (startError) {
      return (
        <GameLoadError
          message={startError}
          onBack={() => setLocation(id ? `/?id=${id}` : "/")}
          onRetry={() => setStartError(null)}
        />
      );
    }

    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        {loading ? (
          <div className="text-primary">Loading...</div>
        ) : (
          <motion.div
            className="max-w-md w-full"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <DifficultySelector onStartGame={startGame} />
          </motion.div>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center p-4 pt-16 sm:pt-4">
      <div className="relative w-full max-w-3xl flex flex-wrap items-center justify-center gap-3 mb-6">
        <div className="flex items-center justify-center gap-3">
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
            {isKids ? "Letter Links" : "Intellect Link"}
          </motion.h1>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <HintStatus
            storyFound={currentWords.length}
            storyTotal={themedWords.length}
            nonStoryWordCount={nonThemedWords.length}
            hintProgress={hintProgress}
            hintsAvailable={hintsAvailable}
            hintsUsed={hintsUsed}
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
        </div>
      </div>

      {letters.length > 0 && (
        <motion.div
          className="w-full max-w-md"
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
        >
          <Board
            letters={letters}
            onWordComplete={handleWordComplete}
            foundWords={currentWords}
            themedWords={themedWords}
            wordPositions={wordPositions}
            disabled={isGameOver}
          />
        </motion.div>
      )}

      <FoundWordsPanel words={currentWords} className="mt-8" />
      <GameResultModal
        open={showResultModal}
        onOpenChange={setShowResultModal}
        gameName="intellect-link"
        outcome={outcome}
        stats={{
          wordsFound: currentWords.length,
          hintsUsed,
        }}
        onPlayAgain={handlePlayAgain}
      />

      <TutorialModal
        open={showTutorial}
        onClose={() => setShowTutorial(false)}
        game="intellect-link"
      />
    </div>
  );
}
