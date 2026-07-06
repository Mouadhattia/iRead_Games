import { motion } from "framer-motion";
import Tile from "./tile";
import { Button } from "@/components/ui/button";
import { HelpCircle } from "lucide-react";
import { checkGuess, useGameStore } from "@/lib/game";

interface GameBoardProps {
  guesses: string[];
  currentGuess: string;
  targetWord: string;
  wordLength: number;
  maxGuesses: number;
}

export default function GameBoard({ 
  guesses, 
  currentGuess, 
  targetWord,
  wordLength,
  maxGuesses
}: GameBoardProps) {
  const rows = new Array(maxGuesses).fill(null);
  const { 
    showHintButton, 
    showHint, 
    setShowHint,
  } = useGameStore();

  return (
    <motion.div 
      className="grid gap-1 mb-8"
      style={{ gridTemplateRows: `repeat(${maxGuesses}, 1fr)` }}
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
    >
      {rows.map((_, rowIndex) => {
        const isCurrentRow = rowIndex === guesses.length;
        const isLastRow = rowIndex === maxGuesses - 1;
        const guess = isCurrentRow ? currentGuess : guesses[rowIndex];
        const evaluation = guess && !isCurrentRow ? checkGuess(guess, targetWord) : null;

        return (
          <div 
            key={rowIndex} 
            className="relative flex items-center"
          >
            {isLastRow && showHintButton && !showHint && (
              <Button
                size="icon"
                variant="outline"
                className="absolute left-[-2.5rem] h-14 w-8 border-yellow-500 hover:bg-yellow-500/10"
                onClick={() => {
                  setShowHint(true);
                }}
                title="Show hint (-5 points)"
              >
                <HelpCircle className="h-4 w-4 text-yellow-500" />
              </Button>
            )}
            <div 
              className="grid gap-1"
              style={{ gridTemplateColumns: `repeat(${wordLength}, 1fr)` }}
            >
              {new Array(wordLength).fill(null).map((_, colIndex) => (
                <Tile
                  key={colIndex}
                  letter={guess?.[colIndex] || ""}
                  state={evaluation?.[colIndex]}
                  delay={colIndex * 0.1}
                />
              ))}
            </div>
          </div>
        );
      })}
    </motion.div>
  );
}
