import { forwardRef } from "react";
import { cn } from "@/lib/utils";
import { motion, type HTMLMotionProps } from "framer-motion";

interface LetterTileProps extends HTMLMotionProps<"button"> {
  letter: string;
  isSelected?: boolean;
  isConnectable?: boolean;
  isFoundPart?: boolean;
  isHintedPart?: boolean;
  position: { x: number; y: number };
}

const LetterTile = forwardRef<HTMLButtonElement, LetterTileProps>(({
  letter,
  isSelected = false,
  isConnectable = false,
  isFoundPart = false,
  isHintedPart = false,
  position,
  className,
  ...props
}, ref) => {
  return (
    <motion.button
      ref={ref}
      type="button"
      className={cn(
        "aspect-square w-full rounded-lg text-base font-bold flex items-center justify-center sm:text-lg",
        "transition-all duration-200 ease-out",
        "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
        isSelected ? "bg-primary text-primary-foreground shadow-lg" :
        isHintedPart ? "bg-yellow-200 text-yellow-950 ring-2 ring-yellow-500 shadow-md cursor-pointer hover:bg-yellow-300" :
        isFoundPart ? "bg-emerald-100 text-emerald-900 ring-2 ring-emerald-400 cursor-not-allowed opacity-75" :
        isConnectable ? "bg-secondary hover:bg-secondary/80" :
        "bg-secondary/50 cursor-not-allowed opacity-80",
        className
      )}
      initial={{ opacity: 0, y: 20 }}
      animate={{ 
        opacity: 1, 
        y: 0,
        transition: {
          duration: 0.3,
          delay: (position.x + position.y) * 0.1
        }
      }}
      {...props}
    >
      <span className={cn(
        "relative z-10",
        "transition-colors duration-200"
      )}>
        {letter}
      </span>
    </motion.button>
  );
});

LetterTile.displayName = "LetterTile";

export default LetterTile;
