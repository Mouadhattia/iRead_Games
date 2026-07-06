import { useQuery } from "@tanstack/react-query";
import { format, isSameDay } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useGameStore } from "@/lib/game";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { Loader2, Calendar as CalendarIcon, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";

interface PastChallenge {
  id: number;
  date: string | Date;
  completed: boolean;
}

export default function ChallengeCalendar() {
  const query = new URLSearchParams(window.location.search);
  const id = query.get("id");
  const [, setLocation] = useLocation();
  const { lastCompletedChallengeId } = useGameStore();
  const { toast } = useToast();

  const { data: pastChallenges, isLoading } = useQuery({
    queryKey: ["/api/daily-challenges/past"],
    queryFn: async () => {
      const res = await fetch("/api/daily-challenges/past");
      if (!res.ok) throw new Error('Failed to fetch past challenges');
      return res.json() as Promise<PastChallenge[]>;
    },
  });

  const handleDayClick = (date: Date) => {
    if (date > new Date()) return;

    const challenge = pastChallenges?.find(c => isSameDay(new Date(c.date), date));
    if (!challenge) return;

    if (challenge.completed || challenge.id === lastCompletedChallengeId) {
      toast({
        title: "Challenge Already Completed",
        description: "You've already completed this day's challenge. Please select another day.",
      });
      return;
    }

    const params = new URLSearchParams({ date: format(date, "yyyy-MM-dd") });
    if (id) params.set("id", id);

    setLocation(`/daily-challenge?${params.toString()}`);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center p-4">
      <div className="w-full max-w-md relative">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setLocation(id ? `/?id=${id}` : "/")}
          className="absolute left-4 top-4"
        >
          <ArrowLeft className="h-6 w-6" />
        </Button>
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalendarIcon className="w-5 h-5" />
                Daily Challenge Calendar
              </CardTitle>
              <CardDescription>
                View and play challenges from the past 30 days. 
                {lastCompletedChallengeId && " Completed challenges are marked and cannot be replayed."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Calendar
                mode="single"
                selected={new Date()}
                onSelect={(date) => date && handleDayClick(date)}
                disabled={(date) => {
                  if (date > new Date()) return true;
                  const challenge = pastChallenges?.find(c => isSameDay(new Date(c.date), date));
                  return Boolean(challenge?.completed || challenge?.id === lastCompletedChallengeId);
                }}
                modifiers={{
                  completed: (date) => {
                    const challenge = pastChallenges?.find(c => isSameDay(new Date(c.date), date));
                    return Boolean(challenge?.completed || challenge?.id === lastCompletedChallengeId);
                  }
                }}
                modifiersClassNames={{
                  completed: "bg-primary/50 text-primary-foreground hover:bg-primary/50 cursor-not-allowed",
                  disabled: "opacity-50 cursor-not-allowed hover:bg-transparent"
                }}
                className="rounded-md border"
              />
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
