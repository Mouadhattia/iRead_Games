import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useGameStore } from "@/lib/game";
import { Timer, Target, Brain, Trophy, BarChart2 } from "lucide-react";
import { GameConfig } from "@shared/config";

const WIN_BONUS = GameConfig.scoring.winBonus;
const QUICK_WIN_BONUS = GameConfig.scoring.quickWinBonus;
const HINT_PENALTY = Math.abs(GameConfig.scoring.hintPenalty);
const TIME_PENALTY = Math.abs(GameConfig.scoring.timePenalty);
const TIME_PENALTY_THRESHOLD = GameConfig.scoring.timePenaltyThreshold;

export default function GameSummary() {
  const metrics = useGameStore((state) => state.gameMetrics);

  if (!metrics) return null;

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full max-w-md mx-auto mt-6"
    >
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart2 className="w-5 h-5" />
            Game Summary
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <Trophy className="w-5 h-5 text-primary" />
            <div>
              <p className="text-sm font-medium">Guesses Used</p>
              <p className="text-lg">{metrics.guessesUsed}/{metrics.maxGuesses}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Brain className="w-5 h-5 text-primary" />
            <div>
              <p className="text-sm font-medium">Hints Used</p>
              <p className="text-lg">{metrics.hintsUsed} {metrics.hintsUsed > 0 && `(-${HINT_PENALTY} points per hint)`}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Timer className="w-5 h-5 text-primary" />
            <div>
              <p className="text-sm font-medium">Time Spent</p>
              <p className="text-lg">{formatTime(metrics.timeSpent)} {metrics.timeSpent > TIME_PENALTY_THRESHOLD && `(-${TIME_PENALTY} points/min over 3min)`}</p>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t">
            <div className="space-y-2">
              <p className="font-semibold">Score Breakdown</p>
              {metrics.won && (
                <div className="flex justify-between text-sm">
                  <span>Win Bonus</span>
                  <span className="text-green-600">+{WIN_BONUS}</span>
                </div>
              )}
              {metrics.won && metrics.guessesUsed < metrics.maxGuesses && (
                <div className="flex justify-between text-sm">
                  <span>Quick Win Bonus</span>
                  <span className="text-green-600">+{(metrics.maxGuesses - metrics.guessesUsed) * QUICK_WIN_BONUS}</span>
                </div>
              )}
              {metrics.hintsUsed > 0 && (
                <div className="flex justify-between text-sm">
                  <span>Hint Penalty</span>
                  <span className="text-red-600">-{HINT_PENALTY * metrics.hintsUsed}</span>
                </div>
              )}
              {metrics.timeSpent > TIME_PENALTY_THRESHOLD && (
                <div className="flex justify-between text-sm">
                  <span>Time Penalty</span>
                  <span className="text-red-600">-{Math.floor((metrics.timeSpent - TIME_PENALTY_THRESHOLD) / 60) * TIME_PENALTY}</span>
                </div>
              )}
              <div className="flex justify-between items-center mt-2 pt-2 border-t">
                <p className="font-semibold">Final Score</p>
                <p className="text-2xl font-bold text-primary">{metrics.finalScore}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
