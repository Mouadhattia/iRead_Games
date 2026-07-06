import { Lightbulb } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getHintUnlockWordCount } from "@/lib/hints";

interface HintStatusProps {
  storyFound: number;
  storyTotal: number;
  nonStoryWordCount: number;
  hintProgress: number;
  hintsAvailable: number;
  hintsUsed: number;
  hintUnlockWordCount?: number | null;
  onUseHint: () => void;
}

export default function HintStatus({
  storyFound,
  storyTotal,
  nonStoryWordCount,
  hintProgress,
  hintsAvailable,
  hintsUsed,
  hintUnlockWordCount,
  onUseHint,
}: HintStatusProps) {
  const unlockCount = getHintUnlockWordCount(hintUnlockWordCount);
  const earnedHints = Math.floor(nonStoryWordCount / unlockCount);
  const totalAvailableHints = Math.max(hintsAvailable, earnedHints);
  const readyHints = Math.max(0, totalAvailableHints - hintsUsed);
  const hintLabel =
    readyHints > 0
      ? `${readyHints} ready`
      : `${hintProgress}/${unlockCount}`;
  const hasRemainingStoryWords = storyTotal > 0 && storyFound < storyTotal;
  const canUseHint = readyHints > 0 && hasRemainingStoryWords;
  const hintTitle = canUseHint
    ? "Reveal first story letter"
    : `Find ${unlockCount} non-story ${
        unlockCount === 1 ? "word" : "words"
      }`;

  return (
    <div className="flex flex-wrap items-center justify-center gap-2">
      <div className="rounded-full bg-primary/10 px-3 py-1 text-sm font-medium">
        Story {storyFound}/{storyTotal}
      </div>
      <div className="rounded-full bg-secondary px-3 py-1 text-sm font-medium">
        Hint {hintLabel}
      </div>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className={`h-8 w-8 rounded-full ${
          canUseHint
            ? "bg-primary text-primary-foreground hover:bg-primary/90"
            : "bg-primary/10"
        }`}
        disabled={!canUseHint}
        onClick={onUseHint}
        title={canUseHint ? "Reveal first story letter" : hintTitle}
      >
        <Lightbulb className="h-4 w-4" />
      </Button>
    </div>
  );
}
