import { motion } from "framer-motion";
import { AlertCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { GameConfig } from "@shared/config";

interface HintProps {
  word: string;
}

export default function Hint({ word }: HintProps) {
  const { data: definitionData, isLoading } = useQuery({
    queryKey: ["/api/word", word, "definition"],
    queryFn: async () => {
      const res = await fetch(`/api/word/${word}/definition`);
      if (!res.ok) throw new Error("Failed to fetch definition");
      return res.json();
    },
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full max-w-md mx-auto mt-4"
    >
      <Card className="border-yellow-500">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-yellow-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-sm">Hint</h3>
                <span className="text-xs text-muted-foreground">
                  Penalty: -{Math.abs(GameConfig.scoring.hintPenalty)} points
                </span>
              </div>
              <p className="text-sm text-muted-foreground">
                {isLoading
                  ? "Loading definition..."
                  : definitionData?.definition ||
                    `This is a ${word.length}-letter word that's commonly used in English.`}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
