import { motion } from "framer-motion";
import { getColorForState } from "@/lib/game";

interface TileProps {
  letter: string;
  state?: "correct" | "present" | "absent" | null;
  delay: number;
}

export default function Tile({ letter, state, delay }: TileProps) {
  return (
    <motion.div
      className={`
        h-12 w-12 border-2 flex items-center justify-center sm:h-14 sm:w-14
        font-bold text-xl sm:text-2xl ${state ? 'text-white' : 'text-foreground'} 
        ${getColorForState(state ?? null)}
        ${letter ? "border-border" : "border-border/70"}
        select-none
      `}
      initial={{ scale: letter ? 1.1 : 1, rotateX: 0 }}
      animate={{ 
        scale: 1,
        rotateX: state ? 360 : 0 
      }}
      transition={{ 
        scale: { duration: 0.1 },
        rotateX: { delay, duration: 0.5 }
      }}
      aria-label={`${letter || 'Empty'} tile ${state || 'empty'}`}
    >
      {letter}
    </motion.div>
  );
}
