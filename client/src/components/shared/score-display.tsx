import { cn } from "@/lib/utils";
import { Trophy } from "lucide-react";

/**
 * Props for the ScoreDisplay component
 * @interface ScoreDisplayProps
 */
interface ScoreDisplayProps {
  /** Current score value */
  score: number;
  /** Current streak (optional) */
  streak?: number;
  /** Best streak achieved (optional) */
  bestStreak?: number;
  /** Number of hints used in the game (optional) */
  hintsUsed?: number;
  /** Time elapsed in seconds (optional) */
  timeElapsed?: number;
  /** Additional CSS classes */
  className?: string;
  /** Whether to show detailed stats */
  showDetails?: boolean;
  /** Display variant - 'default' shows full stats, 'compact' shows only score */
  variant?: 'default' | 'compact';
}

/**
 * A reusable score display component used across different game modes
 * Supports both compact and detailed views of game statistics
 * 
 * @component
 * @example
 * // Compact usage
 * <ScoreDisplay score={100} variant="compact" />
 * 
 * // Full stats usage
 * <ScoreDisplay 
 *   score={100}
 *   streak={5}
 *   bestStreak={10}
 *   hintsUsed={2}
 *   timeElapsed={300}
 *   showDetails={true}
 * />
 */
export default function ScoreDisplay({
  score,
  streak,
  bestStreak,
  hintsUsed,
  timeElapsed,
  className,
  showDetails = true,
  variant = 'default'
}: ScoreDisplayProps) {
  if (variant === 'compact') {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <Trophy className="h-5 w-5 text-primary" />
        <span className="text-xl font-semibold">{score}</span>
      </div>
    );
  }

  return (
    <div className={cn("w-full max-w-3xl mx-auto", className)}>
      <div className="flex items-center justify-between p-4 bg-card rounded-lg shadow-sm">
        <div className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-primary" />
          <div>
            <p className="text-sm font-medium text-muted-foreground">Score</p>
            <p className="text-2xl font-bold">{score}</p>
          </div>
        </div>
        {showDetails && (
          <div className="flex gap-6">
            {streak !== undefined && (
              <div className="flex items-center gap-2">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Streak</p>
                  <p className="text-lg font-semibold">{streak}/{bestStreak || streak}</p>
                </div>
              </div>
            )}

            {timeElapsed !== undefined && (
              <div className="flex items-center gap-2">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Time</p>
                  <p className="text-lg font-semibold">{Math.floor(timeElapsed / 60)}:{(timeElapsed % 60).toString().padStart(2, '0')}</p>
                </div>
              </div>
            )}

            {hintsUsed !== undefined && (
              <div className="flex items-center gap-2">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Hints</p>
                  <p className="text-lg font-semibold">{hintsUsed}</p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}