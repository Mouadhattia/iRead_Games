import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowLeft, BarChart2, HelpCircle } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { addDays, format, isSameDay, startOfToday, subDays } from "date-fns";
import { cn } from "@/lib/utils";
import { GameConfig } from "@shared/config";

interface ChallengeDay {
  id: number;
  date: Date;
  completed: boolean;
}

export default function StrandsCalendar() {
  const query = new URLSearchParams(window.location.search);
  const id = query.get("id");
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [challenges, setChallenges] = useState<ChallengeDay[]>([]);

  useEffect(() => {
    const fetchChallenges = async () => {
      try {
        const endDate = startOfToday();
        const startDate = subDays(endDate, GameConfig.dailyChallenge.calendarHistory);
        const params = new URLSearchParams({
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
        });
        if (id) params.set("id", id);

        const response = await fetch(`/api/strands/daily/past?${params.toString()}`);

        if (!response.ok) throw new Error('Failed to fetch challenge history');
        const data = await response.json();
        setChallenges(data);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching challenges:', error);
        toast({
          title: "Error",
          description: "Failed to load challenge history",
          variant: "destructive",
        });
      }
    };

    fetchChallenges();
  }, [toast, id]);

  const handleDateSelect = (date: Date | undefined) => {
    if (!date) return;

    const today = startOfToday();
    if (date > today) {
      toast({
        title: "Not available",
        description: "Future challenges are not yet available",
        variant: "destructive",
      });
      return;
    }

    setSelectedDate(date);
    const params = new URLSearchParams({ date: date.toISOString() });
    if (id) params.set("id", id);

    setLocation(`/daily-strands?${params.toString()}`);
  };

  const modifiers = {
    completed: challenges.filter(day => day.completed).map(day => day.date),
    available: challenges.map(day => day.date),
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
        <h1 className="text-4xl font-bold mx-auto">
          Strands Calendar
        </h1>
      </div>

      <div className="w-full max-w-md p-4">
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={handleDateSelect}
          modifiers={modifiers}
          modifiersClassNames={{
            completed: "bg-primary/50 text-primary-foreground hover:bg-primary/60",
            available: "bg-secondary/50 hover:bg-secondary",
          }}
          disabled={(date) => {
            return date > startOfToday() || !modifiers.available.some(d => isSameDay(d, date));
          }}
          className={cn(
            "rounded-md border w-full",
            loading && "opacity-50 pointer-events-none"
          )}
        />

        <div className="mt-6 space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <div className="w-4 h-4 rounded-full bg-primary/50" />
            <span>Completed challenges</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <div className="w-4 h-4 rounded-full bg-secondary/50" />
            <span>Available challenges</span>
          </div>
        </div>
      </div>
    </div>
  );
}
