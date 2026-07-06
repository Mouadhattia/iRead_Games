import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { checkGuess, getColorForState } from "@/lib/game";

interface KeyboardProps {
  guesses: string[];
  targetWord: string;
  onKeyPress: (key: string) => void;
}

export default function Keyboard({ guesses, targetWord, onKeyPress }: KeyboardProps) {
  const rows = [
    ["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P"],
    ["A", "S", "D", "F", "G", "H", "J", "K", "L"],
    ["ENTER", "Z", "X", "C", "V", "B", "N", "M", "BACKSPACE"]
  ];

  const getKeyState = (key: string) => {
    let state: "correct" | "present" | "absent" | null = null;

    guesses.forEach(guess => {
      const evaluation = checkGuess(guess, targetWord);

      // Check all occurrences of the key in the guess
      for (let i = 0; i < guess.length; i++) {
        if (guess[i].toUpperCase() === key) {
          const keyState = evaluation[i];
          if (keyState === "correct") {
            state = "correct";
            break; // Found correct position, no need to check further
          } else if (keyState === "present" && state !== "correct") {
            state = "present";
          } else if (keyState === "absent" && !state) {
            state = "absent";
          }
        }
      }
    });

    return state;
  };

  return (
    <motion.div 
      className="w-full max-w-2xl px-1 sm:px-4"
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
    >
      {rows.map((row, rowIndex) => (
        <div key={rowIndex} className="flex justify-center gap-1 mb-1">
          {row.map((key) => {
            const state = getKeyState(key);
            const bgColor = state
              ? getColorForState(state)
              : "bg-secondary hover:bg-secondary/80";
            return (
              <Button
                key={key}
                onClick={() => onKeyPress(key)}
                className={`
                  h-11 px-1 text-xs font-bold text-foreground sm:h-14 sm:px-2 sm:text-sm
                  ${key.length > 1 ? "min-w-12 sm:px-4" : "w-8 sm:w-10"}
                  ${bgColor}
                  transition-colors
                `}
              >
                {key === "BACKSPACE" ? "⌫" : key}
              </Button>
            );
          })}
        </div>
      ))}
    </motion.div>
  );
}
