import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";

type DifficultyLevel = '3' | '4' | '5' | '6' | '7';

interface DifficultyProps {
  difficulty: DifficultyLevel;
  onDifficultyChange: (difficulty: DifficultyLevel) => void;
  onStartGame: () => void;
}

export default function SpellingBeeDifficultySelector({
  difficulty,
  onDifficultyChange,
  onStartGame
}: DifficultyProps) {
  // Fetch available word lengths
  const { data: wordLengthsData, isLoading } = useQuery({
    queryKey: ['/api/word-lengths'],
    queryFn: async () => {
      const res = await fetch('/api/word-lengths');
      if (!res.ok) throw new Error('Failed to fetch word lengths');
      return res.json();
    }
  });

  // Effect to auto-start if only one length is available
  useEffect(() => {
    if (wordLengthsData?.wordLengths?.length === 1) {
      onDifficultyChange(wordLengthsData.wordLengths[0].toString() as DifficultyLevel);
      onStartGame();
    }
  }, [wordLengthsData, onDifficultyChange, onStartGame]);

  const difficultyLabels: Record<string, string> = {
    '3': 'Starter (3 letters)',
    '4': 'Easy (4 letters)',
    '5': 'Classic (5 letters)',
    '6': 'Hard (6 letters)',
    '7': 'Expert (7 letters)'
  };

  const guessesPerDifficulty: Record<string, number> = {
    '3': 1,
    '4': 6,
    '5': 6,
    '6': 6,
    '7': 6
  };

  // If only one length is available, don't render the selector
  if (isLoading || wordLengthsData?.wordLengths?.length === 1) {
    return null;
  }

  return (
    <motion.div
      initial={{ scale: 0.9, opacity: 0 }}
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
            value={difficulty} 
            onValueChange={(value) => onDifficultyChange(value as DifficultyLevel)} 
            className="space-y-4"
          >
            {wordLengthsData?.wordLengths.map((length: number) => (
              <div key={length} className="flex items-center space-x-2">
                <RadioGroupItem value={length.toString()} id={`length-${length}`} />
                <Label htmlFor={`length-${length}`} className="flex-1">
                  {difficultyLabels[length]}
                  <span className="text-sm text-muted-foreground ml-2">
                    ({guessesPerDifficulty[length]} guesses)
                  </span>
                </Label>
              </div>
            ))}
          </RadioGroup>
          <Button 
            onClick={onStartGame} 
            className="w-full mt-6"
          >
            Start Game
          </Button>
        </CardContent>
      </Card>
    </motion.div>
  );
}
