import { AlertCircle, ArrowLeft, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface GameLoadErrorProps {
  message?: string;
  onBack: () => void;
  onRetry?: () => void;
}

export function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}

export default function GameLoadError({
  message = "No words available today. Please try again later.",
  onBack,
  onRetry,
}: GameLoadErrorProps) {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 text-center">
      <div className="flex max-w-md flex-col items-center gap-4 rounded-lg border border-destructive/30 bg-destructive/10 p-6">
        <AlertCircle className="h-8 w-8 text-destructive" />
        <p className="text-lg font-semibold text-destructive">{message}</p>
        <div className="flex flex-wrap justify-center gap-3">
          <Button variant="outline" onClick={onBack}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Games Menu
          </Button>
          {onRetry && (
            <Button onClick={onRetry}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Try Again
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
