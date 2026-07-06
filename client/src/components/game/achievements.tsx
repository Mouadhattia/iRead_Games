import { motion } from "framer-motion";
import { Trophy, Clock, Brain, Calendar, ArrowUpCircle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useGameStore } from "@/lib/game";
import type { Achievement } from "@/lib/game";

interface AchievementItemProps {
  achievement: Achievement;
  delay: number;
}

function AchievementItem({ achievement, delay }: AchievementItemProps) {
  const iconMap = {
    WINNING_STREAK_5: Trophy,
    WINNING_STREAK_10: Trophy,
    WINNING_STREAK_20: Trophy,
    QUICK_WIN: Clock,
    NO_HINT_WIN: Brain,
    DAILY_STREAK_7: Calendar,
    WORD_LENGTH_MASTER: ArrowUpCircle,
  };

  const Icon = iconMap[achievement.type as keyof typeof iconMap];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
    >
      <Card className={achievement.earnedAt ? "border-primary" : "opacity-50"}>
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <div className="rounded-full p-2 bg-primary/10">
              <Icon className="w-6 h-6 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold">{achievement.title}</h3>
              <p className="text-sm text-muted-foreground">
                {achievement.description}
              </p>
              {achievement.progress !== undefined && achievement.goal !== undefined && (
                <Progress 
                  value={(achievement.progress / achievement.goal) * 100}
                  className="mt-2"
                />
              )}
              {achievement.earnedAt && (
                <p className="text-xs text-muted-foreground mt-2">
                  Earned {achievement.earnedAt.toLocaleDateString()}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

export default function Achievements() {
  const achievements = useGameStore((state) => state.achievements);

  return (
    <div className="w-full max-w-2xl mx-auto space-y-4">
      <div className="text-center mb-6">
        <h2 className="text-3xl font-bold">Achievements</h2>
        <p className="text-muted-foreground">
          Track your progress and unlock special achievements!
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {achievements.map((achievement, index) => (
          <AchievementItem
            key={achievement.type}
            achievement={achievement}
            delay={index * 0.1}
          />
        ))}
      </div>
    </div>
  );
}
