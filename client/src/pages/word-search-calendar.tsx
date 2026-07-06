import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { useLocation } from "wouter";
import { ArrowLeft, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import WordSearchGrid from "@/components/word-search/grid";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { GameConfig } from "../../../shared/config"; // Fixed import path
import { fetchJsonOrThrow } from "@/lib/queryClient";
import { getErrorMessage } from "@/components/shared/game-load-error";

export default function WordSearchCalendar() {
  const query = new URLSearchParams(window.location.search);
  const id = query.get("id");
  const [, setLocation] = useLocation();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [showPuzzle, setShowPuzzle] = useState(false);
  const [timeLeft, setTimeLeft] = useState(GameConfig.dailyChallenge.wordSearch.timeLimit);
  const { toast } = useToast();

  const {
    data: puzzleData,
    isLoading,
    error,
  } = useQuery<any>({
    queryKey: ["/api/daily-word-search", selectedDate?.toISOString(), id],
    queryFn: async () => {
      if (!selectedDate) return null;
      const params = new URLSearchParams({ date: selectedDate.toISOString() });
      if (id) params.set("id", id);

      return fetchJsonOrThrow<any>(
        `/api/daily-word-search?${params.toString()}`
      );
    },
    enabled: !!selectedDate && showPuzzle && !!id,
  });

  const handleDateSelect = (date: Date | undefined) => {
    setSelectedDate(date);
    if (date) {
      setShowPuzzle(true);
    }
  };

  const handleWordFound = (word: string) => {
    if (!puzzleData) return;

    // Calculate score using config parameters
    const basePoints = GameConfig.rules.wordSearch.scoring.basePoints;
    const lengthBonus = GameConfig.rules.wordSearch.scoring.lengthBonus;
    const difficultyMultiplier = GameConfig.rules.wordSearch.scoring.difficultyMultiplier.hard;
    const points = (basePoints + (word.length * lengthBonus)) * difficultyMultiplier;

    toast({
      title: "Word Found!",
      description: `You found "${word}"! +${points} points`,
    });
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-2xl mx-auto">
        <div className="w-full flex items-center justify-between mb-6">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setLocation(id ? `/word-search?id=${id}` : "/word-search")}
            className="absolute left-4 top-4"
          >
            <ArrowLeft className="h-6 w-6" />
          </Button>
          <motion.h1
            className="text-4xl font-bold mx-auto"
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
          >
            Word Search Calendar
          </motion.h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Select a Date
            </CardTitle>
          </CardHeader>
          <CardContent>
            <CalendarComponent
              mode="single"
              selected={selectedDate}
              onSelect={handleDateSelect}
              disabled={{ after: new Date() }}
              className="rounded-md border"
            />
          </CardContent>
        </Card>

        <Dialog open={showPuzzle} onOpenChange={setShowPuzzle}>
          <DialogContent className="max-w-2xl sm:max-w-3xl">
            <DialogHeader>
              <DialogTitle className="text-xl">
                Word Search for {selectedDate?.toLocaleDateString()}
              </DialogTitle>
            </DialogHeader>
            {isLoading ? (
              <div className="flex items-center justify-center p-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
              </div>
            ) : error ? (
              <div className="p-4 text-center text-destructive">
                {getErrorMessage(
                  error,
                  "No words available today. Please try again later."
                )}
              </div>
            ) : puzzleData && (
              <div className="p-2">
                <WordSearchGrid
                  grid={puzzleData.grid}
                  words={puzzleData.words}
                  onWordFound={handleWordFound}
                  difficulty="hard"
                />
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
