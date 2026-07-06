import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface DifficultyOption {
  size: number;
  label: string;
}

const difficulties: DifficultyOption[] = [
  { size: 5, label: "5×5" },
  { size: 6, label: "6×6" },
  { size: 7, label: "7×7" },
  { size: 8, label: "8×8" },
];

interface DifficultySelectorProps {
  onStartGame: (size: number) => void;
}

export default function DifficultySelector({
  onStartGame,
}: DifficultySelectorProps) {
  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-4xl font-bold">Choose Grid Size</h1>
        <p className="text-muted-foreground">Select a grid size to begin</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {difficulties.map((option) => (
          <motion.button
            key={option.size}
            className={cn(
              "p-6 rounded-lg text-center transition-colors",
              "border-2 border-border hover:border-primary",
              "bg-card hover:bg-card/80"
            )}
            onClick={() => onStartGame(option.size)}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <div className="text-2xl font-bold">{option.label}</div>
            <div className="text-sm text-muted-foreground mt-1">
              Grid
            </div>
          </motion.button>
        ))}
      </div>
    </div>
  );
}