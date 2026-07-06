import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { useGameStore } from "@/lib/game";
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";

const difficultyLabels: Record<number, string> = {
  5: "Classic",
  6: "Hard",
  7: "Expert"
};

interface WordLengthsResponse {
  wordLengths: number[];
}

export default function DifficultySelector() {
  const { setDifficulty } = useGameStore();
  const [selectedLength, setSelectedLength] = useState<string | null>(null);

  // Fetch available word lengths from the API
  const { data: wordLengthsResponse, isLoading } = useQuery({
    queryKey: ["/api/word-lengths"],
    queryFn: async () => {
      const res = await fetch("/api/word-lengths");
      if (!res.ok) throw new Error("Failed to fetch word lengths");
      return res.json() as Promise<WordLengthsResponse>;
    }
  });

  const wordLengths: number[] = wordLengthsResponse?.wordLengths || [];

  // Auto-select if only one length is available
  useEffect(() => {
    if (wordLengths.length === 1) {
      setDifficulty(wordLengths[0]);
    } else if (wordLengths.length > 0 && !selectedLength) {
      setSelectedLength(wordLengths[0].toString());
    }
  }, [wordLengths, setDifficulty]);

  const handleDifficultySelect = () => {
    if (selectedLength) {
      setDifficulty(Number(selectedLength));
    }
  };

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === "Enter" && selectedLength) {
        handleDifficultySelect();
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [selectedLength]);

  // If loading or only one length available, show nothing (game will start automatically)
  if (isLoading || wordLengths.length <= 1) {
    return null;
  }

  return (
    <motion.div
      initial={{ scale: 0.98, opacity: 1 }}
      animate={{ scale: 1, opacity: 1 }}
      className="w-full max-w-md mx-auto"
    >
      <Card>
        <CardHeader>
          <CardTitle>Select Difficulty</CardTitle>
          <CardDescription>
            Choose your preferred word length. Longer words offer more challenge.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RadioGroup 
            value={selectedLength || ""} 
            onValueChange={setSelectedLength} 
            className="space-y-4"
          >
            {wordLengths.map(length => (
              <div key={length} className="flex items-center space-x-2">
                <RadioGroupItem value={length.toString()} id={`length-${length}`} />
                <Label htmlFor={`length-${length}`} className="flex-1">
                  {difficultyLabels[length]} ({length} letters)
                  <span className="text-sm text-muted-foreground ml-2">
                    (6 guesses)
                  </span>
                </Label>
              </div>
            ))}
          </RadioGroup>
          <Button 
            onClick={handleDifficultySelect} 
            className="w-full mt-6"
          >
            Start Game
          </Button>
        </CardContent>
      </Card>
    </motion.div>
  );
}
