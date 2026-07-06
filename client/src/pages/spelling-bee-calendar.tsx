import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Calendar } from "@/components/ui/calendar";
import { useToast } from "@/hooks/use-toast";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Trophy, Star } from "lucide-react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { format } from "date-fns";

export default function SpellingBeeCalendar() {
  const query = new URLSearchParams(window.location.search);
  const id = query.get("id");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const { data: pastChallenges } = useQuery({
    queryKey: ["/api/daily-spelling-bee/past"],
    queryFn: async () => {
      const res = await fetch("/api/daily-spelling-bee/past");
      if (!res.ok) throw new Error('Failed to fetch past challenges');
      return res.json();
    }
  });

  const handleDateSelect = (date: Date | undefined) => {
    if (!date) return;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (date > today) {
      toast({
        title: "Future date",
        description: "This challenge is not available yet",
        variant: "destructive",
      });
      return;
    }

    setSelectedDate(date);
    const params = new URLSearchParams({ date: date.toISOString() });
    if (id) params.set("id", id);

    setLocation(`/daily-spelling-bee?${params.toString()}`);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center p-4">
      <div className="w-full max-w-4xl flex items-center justify-between mb-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setLocation(id ? `/?id=${id}` : "/")}
          className="absolute left-4 top-4"
        >
          <ArrowLeft className="h-6 w-6" />
        </Button>
        <motion.h1
          className="text-4xl font-bold mx-auto"
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
        >
          Spelling Bee Calendar
        </motion.h1>
      </div>

      <div className="grid gap-8 md:grid-cols-2 w-full max-w-4xl mt-8">
        <Card className="p-6">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={handleDateSelect}
            className="rounded-md border"
            modifiers={{
              completed: (date) => 
                pastChallenges?.some(
                  (challenge: any) => 
                    format(new Date(challenge.date), 'yyyy-MM-dd') === 
                    format(date, 'yyyy-MM-dd') && 
                    challenge.completed
                ),
            }}
            modifiersClassNames={{
              completed: "bg-primary/20 text-primary font-bold",
            }}
          />
        </Card>

        <Card className="p-6">
          <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
            <Trophy className="h-5 w-5 text-primary" />
            Statistics
          </h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-primary/5 rounded-lg">
              <span>Challenges Completed</span>
              <span className="font-bold">
                {pastChallenges?.filter((c: any) => c.completed).length || 0}
              </span>
            </div>
            <div className="flex items-center justify-between p-3 bg-primary/5 rounded-lg">
              <span>Current Streak</span>
              <span className="font-bold">
                {/* Implement streak calculation */}
                0 days
              </span>
            </div>
            <div className="flex items-center justify-between p-3 bg-primary/5 rounded-lg">
              <span>Best Words</span>
              <div className="flex items-center gap-1">
                <Star className="h-4 w-4 text-yellow-500" />
                <span className="font-bold">Coming soon</span>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
