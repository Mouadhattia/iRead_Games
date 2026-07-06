import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Trophy, Target, Star, Brain } from "lucide-react";
import { useGameStore } from "@/lib/game";

interface StatsModalProps {
  open: boolean;
  onClose: () => void;
}

export default function StatsModal({ open, onClose }: StatsModalProps) {
  const { stats, score, achievements, getAverageGuesses } = useGameStore();

  const winPercentage = stats.gamesPlayed > 0 
    ? Math.round((stats.wins / stats.gamesPlayed) * 100) 
    : 0;
  const unlockedAchievements = achievements.filter(
    (achievement) => achievement.earnedAt
  ).length;
  const achievementProgress =
    achievements.length > 0
      ? Math.round((unlockedAchievements / achievements.length) * 100)
      : 0;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-primary" />
            Statistics
          </DialogTitle>
          <DialogDescription>
            Your game performance overview
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="h-[60vh] pr-4">
          <div className="grid grid-cols-2 gap-4 py-4">
            <StatCard
              icon={<Target className="h-4 w-4" />}
              label="Games Played"
              value={stats.gamesPlayed}
              description="Total games completed"
            />

            <StatCard
              icon={<Star className="h-4 w-4" />}
              label="Win Rate"
              value={`${winPercentage}%`}
              description="Percentage of games won"
            />

            <StatCard
              icon={<Trophy className="h-4 w-4" />}
              label="Current Streak"
              value={stats.streak}
              description="Consecutive wins"
            />

            <StatCard
              icon={<Brain className="h-4 w-4" />}
              label="Best Streak"
              value={stats.bestStreak}
              description="Longest win streak"
            />
          </div>

          <div className="space-y-4 mt-6">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium">Guess Distribution</h4>
              <span className="text-sm text-muted-foreground">
                Avg: {getAverageGuesses().toFixed(1)} guesses
              </span>
            </div>
            <GuessDistribution distribution={stats.guessDistribution} />
          </div>

          <div className="mt-6">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-medium">Current Score</h4>
              <span className="text-lg font-bold">{score}</span>
            </div>
            <Progress value={achievementProgress} className="h-2" />
            <p className="text-xs text-muted-foreground mt-1">
              {unlockedAchievements} / {achievements.length} achievements unlocked
            </p>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

function StatCard({ icon, label, value, description }: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  description: string;
}) {
  return (
    <div className="flex flex-col items-center p-3 bg-card rounded-lg border">
      <div className="flex items-center gap-1 text-primary mb-1">
        {icon}
        <span className="text-xs font-medium">{label}</span>
      </div>
      <span className="text-2xl font-bold">{value}</span>
      <span className="text-xs text-muted-foreground text-center">
        {description}
      </span>
    </div>
  );
}

function GuessDistribution({ distribution }: { distribution: Record<string, number> }) {
  const maxValue = Math.max(...Object.values(distribution));

  return (
    <div className="space-y-2">
      {Object.entries(distribution).map(([guess, count]) => {
        const percentage = maxValue ? (count / maxValue * 100) : 0;
        return (
          <div key={guess} className="flex items-center gap-2">
            <div className="w-4 text-sm font-medium">{guess}</div>
            <div className="flex-1 relative">
              <Progress
                value={percentage}
                className={`h-8 ${count > 0 ? 'bg-primary/20' : 'bg-secondary'}`}
              />
              <span className="absolute inset-0 flex items-center justify-end pr-2 text-sm">
                {count}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
