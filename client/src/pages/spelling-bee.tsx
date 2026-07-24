import { useState, useEffect, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { useLocation } from "wouter";
import SpellingBeeBoard from "@/components/spelling-bee/board";
import TutorialModal from "@/components/game/tutorial-modal";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  HelpCircle,
  Delete,
  RefreshCw,
  Share2,
} from "lucide-react";
import SpellingBeeDifficultySelector from "@/components/spelling-bee/difficulty-selector";
import { useSpellingBeeStore } from "@/lib/spelling-bee";
import GameResultModal from "@/components/shared/game-result-modal";
import FoundWordsPanel from "@/components/shared/found-words-panel";
import HintStatus from "@/components/shared/hint-status";
import { fetchJsonOrThrow } from "@/lib/queryClient";
import GameLoadError, {
  getErrorMessage,
} from "@/components/shared/game-load-error";
import { useGameView } from "@/lib/game-view";
import { submitWordAttempt } from "@/lib/word-attempts";
import { submitPracticePlay } from "@/lib/practice-play";
import { postGameRecap, isEmbeddedInParentFrame } from "@/lib/game-recap";

type DifficultyLevel = "3" | "4" | "5" | "6" | "7";

const useQuerys = () => {
  return new URLSearchParams(window.location.search);
};

interface SpellingBeeHive {
  id: string;
  letters: string[];
  centerLetter: string;
  themedWords: string[];
}

export default function SpellingBee() {
  const query = useQuerys();
  const id = query.get("id");
  const userId = query.get("user_id");
  const [currentWord, setCurrentWord] = useState("");
  const [outerLetters, setOuterLetters] = useState<string[]>([]);
  const [difficulty, setDifficulty] = useState<DifficultyLevel>("5");
  const [loading, setLoading] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);
  const [showTutorial, setShowTutorial] = useState(false);
  const [showResultModal, setShowResultModal] = useState(false);
  const [playToken] = useState(
    () => `${Date.now()}-${Math.random().toString(36).slice(2)}`
  );
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const { isKids } = useGameView();

  const {
    themedWords,
    foundWords,
    nonThemedWords,
    hintsAvailable,
    hintsUsed,
    currentHiveId,
    centerLetter,
    revealedWord,
    gameStarted,
    isGameOver,
    initializeGame,
    addFoundWord,
    useHint,
    endGame,
  } = useSpellingBeeStore();

  useEffect(() => {
    // See game.tsx — the parent's recap overlay covers this moment when embedded.
    if (isGameOver && !isEmbeddedInParentFrame()) setShowResultModal(true);
  }, [isGameOver]);

  const outcome: "win" | "loss" | null = isGameOver ? "win" : null;
  const currentWords = foundWords[currentHiveId] || [];
  const hintProgress = nonThemedWords.length % 3;

  const startGame = async (level: DifficultyLevel) => {
    setLoading(true);
    setStartError(null);
    try {
      const params = new URLSearchParams({ length: level });
      if (id) params.set("id", id);
      params.set("play", playToken);

      const hive = await fetchJsonOrThrow<SpellingBeeHive>(
        `/api/spelling-bee/puzzle?${params.toString()}`
      );

      initializeGame(hive.id, hive.letters, hive.centerLetter, hive.themedWords);
      setOuterLetters(hive.letters);
      setCurrentWord("");
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

  const handleDifficultyChange = (newDifficulty: DifficultyLevel) => {
    setDifficulty(newDifficulty);
  };

  const handlePlayAgain = () => {
    setShowResultModal(false);
    void startGame(difficulty);
  };

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

    const revealed = useHint();
    toast({
      title: revealed ? "First letter highlighted" : "No hint available",
      description: revealed
        ? "The story word is shown above the hive."
        : "No hidden story word is available to reveal.",
      variant: revealed ? "default" : "destructive",
    });
  };

  const handleSubmit = useCallback(async () => {
    if (isGameOver) return;

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
    if (currentWords.includes(upperWord)) {
      toast({
        title: "Word already found",
        description: "Try another word",
        variant: "destructive",
      });
      setCurrentWord("");
      return;
    }

    const result = await addFoundWord(currentWord);

    if (result.isValid && result.isThemed) {
      // revealedWord reflects the store's pre-clear state from this
      // render — addFoundWord() only clears it once *this* word is found,
      // so this comparison is still valid at the moment of submission.
      const hintApplied = revealedWord === upperWord;
      submitWordAttempt({
        bookId: id,
        userId,
        word: upperWord,
        game: "bee-genius",
        mode: "practice",
        correct: true,
        hintsUsed: hintApplied ? 1 : 0,
        // This hint reveals the whole word, not just the first letter as
        // its own toast copy claims — see project memory for the mismatch.
        heaviestHintTier: hintApplied ? "heavy" : null,
      });

      const nextStoryWords = [...new Set([...currentWords, upperWord])];
      const isComplete =
        themedWords.length > 0 &&
        themedWords.every((storyWord) => nextStoryWords.includes(storyWord));

      toast({
        title: isComplete ? "Bee Genius complete!" : "Story word found!",
        description: isComplete
          ? "You found every story word."
          : `${nextStoryWords.length}/${themedWords.length} story words found`,
      });

      if (isComplete) {
        endGame();
        submitPracticePlay({
          bookId: id,
          userId,
          game: "bee-genius",
          wordsLearned: nextStoryWords,
        });
        postGameRecap({
          game: "bee-genius",
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

    setCurrentWord("");
  }, [
    currentWord,
    centerLetter,
    currentWords,
    themedWords,
    isGameOver,
    addFoundWord,
    endGame,
    toast,
    revealedWord,
    id,
    userId,
    hintsUsed,
  ]);

  const handleShare = useCallback(() => {
    const result = `Bee Genius\nStory words found: ${currentWords.length}/${themedWords.length}\n\nPlay at: ${window.location.origin}/spelling-bee`;

    navigator.clipboard.writeText(result).then(() => {
      toast({
        title: "Copied to clipboard!",
        description: "Share your results with friends!",
      });
    });
  }, [currentWords.length, themedWords.length, toast]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault();
        handleSubmit();
        return;
      }

      if (e.key === "Backspace") {
        e.preventDefault();
        handleBackspace();
        return;
      }

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
    handleLetterClick,
    handleSubmit,
    handleBackspace,
  ]);

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
            className="max-w-md w-full space-y-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <SpellingBeeDifficultySelector
              difficulty={difficulty}
              onDifficultyChange={handleDifficultyChange}
              onStartGame={() => startGame(difficulty)}
            />
          </motion.div>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center p-4 pt-16 sm:pt-4">
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
          {isKids ? "Letter Bee" : "Bee Genius"}
        </motion.h1>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-3 mb-6">
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
      </div>

      <FoundWordsPanel words={currentWords} className="mt-8" />

      <GameResultModal
        open={showResultModal}
        onOpenChange={setShowResultModal}
        gameName="bee-genius"
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
        game="bee-genius"
      />
    </div>
  );
}
