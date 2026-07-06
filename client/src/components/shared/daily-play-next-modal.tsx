import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { BookOpen, Loader2, PartyPopper } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { fetchJsonOrThrow } from "@/lib/queryClient";
import { GAME_META, type GameKey } from "@/lib/game-meta";

interface SuggestedBook {
  id: number;
  title: string;
  img?: string | null;
}

interface DailyRunSuggestions {
  book_id: number;
  pack_id: number | null;
  game: GameKey;
  date: string;
  other_games_same_book: GameKey[];
  other_books_same_game: SuggestedBook[];
}

interface DailyPlayNextModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bookId: string | null;
  game: GameKey;
  userId?: string | number | null;
  schoolId?: string | null;
  packId?: string | null;
  date?: string | null;
}

function buildGameHref(
  game: GameKey,
  bookId: string,
  schoolId?: string | null,
  userId?: string | number | null,
  packId?: string | null
) {
  const params = new URLSearchParams({ id: bookId });
  if (schoolId) params.set("school_id", schoolId);
  if (userId) params.set("user_id", String(userId));
  if (packId) params.set("pack_id", packId);
  return `${GAME_META[game].dailyRoute}?${params.toString()}`;
}

function buildMenuHref(
  bookId: string | null,
  schoolId?: string | null,
  userId?: string | number | null,
  packId?: string | null
) {
  const params = new URLSearchParams();
  if (bookId) params.set("id", bookId);
  if (schoolId) params.set("school_id", schoolId);
  if (userId) params.set("user_id", String(userId));
  if (packId) params.set("pack_id", packId);
  const queryString = params.toString();
  return queryString ? `/?${queryString}` : "/";
}

/**
 * Shown after the daily-run leaderboard dialog closes — offers the other
 * not-yet-played daily runs for today: another game for this same book, or
 * this same game for a sibling book in the pack the reader came from.
 */
export default function DailyPlayNextModal({
  open,
  onOpenChange,
  bookId,
  game,
  userId,
  schoolId,
  packId,
  date,
}: DailyPlayNextModalProps) {
  const [, setLocation] = useLocation();
  const [suggestions, setSuggestions] = useState<DailyRunSuggestions | null>(
    null
  );
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !bookId) return;

    let cancelled = false;
    setLoading(true);

    const params = new URLSearchParams({ id: bookId, game });
    if (schoolId) params.set("school_id", schoolId);
    if (userId) params.set("user_id", String(userId));
    if (packId) params.set("pack_id", packId);
    if (date) params.set("date", date);

    fetchJsonOrThrow<DailyRunSuggestions>(
      `/api/daily-run-suggestions?${params.toString()}`
    )
      .then((data) => {
        if (!cancelled) setSuggestions(data);
      })
      .catch((error) => {
        console.error("Unable to load daily run suggestions:", error);
        if (!cancelled) setSuggestions(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, bookId, game, schoolId, userId, packId, date]);

  if (!bookId) return null;

  const otherGames = suggestions?.other_games_same_book ?? [];
  const otherBooks = suggestions?.other_books_same_game ?? [];
  const nothingLeft =
    !loading && otherGames.length === 0 && otherBooks.length === 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="text-left">
          <DialogTitle>What's next?</DialogTitle>
          <DialogDescription>
            Keep your streak going with today's remaining daily runs.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Looking for more daily runs
          </div>
        ) : nothingLeft ? (
          <div className="flex flex-col items-center gap-2 py-6 text-center">
            <PartyPopper className="h-8 w-8 text-primary" />
            <p className="text-sm font-medium">
              You've completed everything for today!
            </p>
            <p className="text-xs text-muted-foreground">
              Come back tomorrow for new daily runs.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {otherGames.length > 0 ? (
              <div>
                <p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">
                  Play another game for this book
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {otherGames.map((key) => {
                    const meta = GAME_META[key];
                    const Icon = meta.icon;
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() =>
                          setLocation(
                            buildGameHref(key, bookId, schoolId, userId, packId)
                          )
                        }
                        className="flex flex-col items-center gap-1 rounded-lg border p-3 text-xs font-medium transition-colors hover:bg-accent"
                      >
                        <Icon className="h-5 w-5" />
                        {meta.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : null}

            {otherBooks.length > 0 ? (
              <div>
                <p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">
                  Play {GAME_META[game].label} in another book from this pack
                </p>
                <div className="flex flex-col gap-2">
                  {otherBooks.map((book) => (
                    <button
                      key={book.id}
                      type="button"
                      onClick={() =>
                        setLocation(
                          buildGameHref(
                            game,
                            String(book.id),
                            schoolId,
                            userId,
                            packId
                          )
                        )
                      }
                      className="flex items-center gap-3 rounded-lg border p-2 text-left transition-colors hover:bg-accent"
                    >
                      {book.img ? (
                        <img
                          src={book.img}
                          alt=""
                          className="h-10 w-10 shrink-0 rounded object-cover"
                        />
                      ) : (
                        <BookOpen className="h-10 w-10 shrink-0 rounded bg-muted p-2 text-muted-foreground" />
                      )}
                      <span className="min-w-0 truncate text-sm font-medium">
                        {book.title}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        )}

        <Button
          variant="ghost"
          onClick={() =>
            setLocation(buildMenuHref(bookId, schoolId, userId, packId))
          }
        >
          Back to Menu
        </Button>
      </DialogContent>
    </Dialog>
  );
}
