import { CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface FoundWordsPanelProps {
  words: string[];
  className?: string;
}

export default function FoundWordsPanel({
  words,
  className,
}: FoundWordsPanelProps) {
  return (
    <section
      className={cn(
        "w-full max-w-md rounded-lg border border-border/70 bg-card/80 p-4 shadow-sm",
        className
      )}
    >
      <div className="flex flex-col items-center gap-1 text-center">
        <div className="flex items-center justify-center gap-2">
          <CheckCircle2 className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold leading-none">Found Words</h3>
        </div>
        <div className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
          {words.length} found
        </div>
      </div>

      <div className="mt-4 min-h-14">
        {words.length > 0 ? (
          <div className="flex max-h-36 flex-wrap items-center justify-center gap-2 overflow-y-auto pr-1">
            {words.map((word) => (
              <span
                key={word}
                className="rounded-full bg-secondary px-3 py-1.5 text-center text-sm font-semibold uppercase tracking-normal text-secondary-foreground shadow-sm"
              >
                {word}
              </span>
            ))}
          </div>
        ) : (
          <div className="flex min-h-14 items-center justify-center rounded-md border border-dashed border-border/80 px-4 text-center text-sm text-muted-foreground">
            No words found yet
          </div>
        )}
      </div>
    </section>
  );
}
