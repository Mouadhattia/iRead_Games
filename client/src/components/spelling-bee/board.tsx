import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface SpellingBeeBoardProps {
  letters: string[];
  centerLetter: string;
  onLetterClick: (letter: string) => void;
  revealedWord?: string | null;
  disabled?: boolean;
}

export default function SpellingBeeBoard({
  letters,
  centerLetter,
  onLetterClick,
  revealedWord = null,
  disabled = false,
}: SpellingBeeBoardProps) {
  const hexagonStyle = "before:content-[''] before:absolute before:w-full before:h-full before:bg-inherit before:rotate-[30deg] before:z-[-1] after:content-[''] after:absolute after:w-full after:h-full after:bg-inherit after:rotate-[-30deg] after:z-[-1]";
  const hintedLetter = revealedWord ? revealedWord[0] : null;
  const hintedTileStyle =
    "ring-2 ring-yellow-500 bg-yellow-200 text-yellow-950 hover:bg-yellow-300";

  // Using a fixed hexagonal pattern for all layouts with adjusted positions
  const letterPositions = {
    3: [
      { top: "25%", left: "35%", transform: "translate(-50%, -50%)" },
      { top: "25%", left: "65%", transform: "translate(-50%, -50%)" },
      { top: "75%", left: "50%", transform: "translate(-50%, -50%)" },
    ],
    4: [
      { top: "20%", left: "35%", transform: "translate(-50%, -50%)" },
      { top: "20%", left: "65%", transform: "translate(-50%, -50%)" },
      { top: "65%", left: "25%", transform: "translate(-50%, -50%)" },
      { top: "65%", left: "75%", transform: "translate(-50%, -50%)" },
    ],
    5: [
      { top: "20%", left: "35%", transform: "translate(-50%, -50%)" },
      { top: "20%", left: "65%", transform: "translate(-50%, -50%)" },
      { top: "50%", left: "20%", transform: "translate(-50%, -50%)" },
      { top: "50%", left: "80%", transform: "translate(-50%, -50%)" },
      { top: "80%", left: "50%", transform: "translate(-50%, -50%)" },
    ],
    6: [
      { top: "20%", left: "35%", transform: "translate(-50%, -50%)" },
      { top: "20%", left: "65%", transform: "translate(-50%, -50%)" },
      { top: "50%", left: "20%", transform: "translate(-50%, -50%)" },
      { top: "50%", left: "80%", transform: "translate(-50%, -50%)" },
      { top: "80%", left: "35%", transform: "translate(-50%, -50%)" },
      { top: "80%", left: "65%", transform: "translate(-50%, -50%)" },
    ],
    7: [
      { top: "20%", left: "35%", transform: "translate(-50%, -50%)" },
      { top: "20%", left: "65%", transform: "translate(-50%, -50%)" },
      { top: "50%", left: "20%", transform: "translate(-50%, -50%)" },
      { top: "50%", left: "80%", transform: "translate(-50%, -50%)" },
      { top: "80%", left: "25%", transform: "translate(-50%, -50%)" },
      { top: "80%", left: "50%", transform: "translate(-50%, -50%)" },
      { top: "80%", left: "75%", transform: "translate(-50%, -50%)" },
    ],
  };

  // Safely get positions based on number of letters
  const getPositions = () => {
    const numLetters = letters?.length || 0;
    if (numLetters >= 3 && numLetters <= 7) {
      return letterPositions[numLetters as keyof typeof letterPositions];
    }
    return letterPositions[5]; // Default to 5 letter layout
  };

  return (
    <div className="flex flex-col items-center justify-center">
      {revealedWord && (
        <div className="mb-3 flex justify-center">
          <div className="rounded-full border border-yellow-500/50 bg-yellow-100 px-4 py-1.5 text-center text-sm font-bold uppercase tracking-normal text-yellow-950 shadow-sm">
            {revealedWord}
          </div>
        </div>
      )}
      <div className="relative aspect-square w-[min(82vw,400px)] max-w-[400px]">
        {/* Center button */}
        <motion.div
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2 }}
        >
          <button
            onClick={() => !disabled && onLetterClick(centerLetter)}
            disabled={disabled}
            className={cn(
              `relative flex h-14 w-14 items-center justify-center overflow-hidden bg-[hsl(var(--bee-center))] text-lg font-bold text-white hover:brightness-95 sm:h-16 sm:w-16 ${hexagonStyle}`,
              disabled && "cursor-not-allowed opacity-60",
              hintedLetter === centerLetter && hintedTileStyle
            )}
          >
            <span className="relative z-10">{centerLetter}</span>
          </button>
        </motion.div>

        {/* Outer letters */}
        {letters && letters.map((letter, index) => {
          const positions = getPositions();
          return (
            <motion.div
              key={index}
              className="absolute"
              style={positions[index]}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.1 + (index * 0.1) }}
            >
              <button
                onClick={() => !disabled && onLetterClick(letter)}
                disabled={disabled}
                className={cn(
                  `relative flex h-14 w-14 items-center justify-center overflow-hidden border-2 border-border bg-card text-lg font-bold text-card-foreground hover:bg-accent sm:h-16 sm:w-16 ${hexagonStyle}`,
                  disabled && "cursor-not-allowed opacity-60",
                  hintedLetter === letter && hintedTileStyle
                )}
              >
                <span className="relative z-10">{letter}</span>
              </button>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
