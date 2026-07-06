import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { Loader2, Medal, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Confetti } from "@/components/ui/confetti";
import { fetchJsonOrThrow } from "@/lib/queryClient";

interface LeaderboardEntry {
  id: number;
  rank: number;
  user_id: number;
  username: string | null;
  user_img: string | null;
  score: number;
  time_spent_seconds: number;
  is_current_user?: boolean;
}

interface LeaderboardPayload {
  total_players: number;
  entries: LeaderboardEntry[];
  current_user_entry?: LeaderboardEntry | null;
}

interface DailyLeaderboardProps {
  bookId?: string | null;
  game: string;
  date?: string | null;
  userId?: string | number | null;
  enabled: boolean;
  title: string;
}

interface DailyLeaderboardDialogProps {
  bookId?: string | null;
  game: string;
  date?: string | null;
  userId?: string | number | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  celebrate?: boolean;
  /** Result of the daily run just played — drives the headline copy. Omit for a neutral headline. */
  outcome?: "win" | "loss" | null;
  /** Practice route for this game (with book/school params) — shown as a "come back tomorrow" nudge. */
  practiceHref?: string;
}

const DEFAULT_AVATAR =
  "https://upload.wikimedia.org/wikipedia/commons/thumb/5/59/User-avatar.svg/2048px-User-avatar.svg.png";

const formatTime = (seconds: number) => {
  const safeSeconds = Math.max(0, Number(seconds) || 0);
  if (safeSeconds <= 0) return "--:--";

  const minutes = Math.floor(safeSeconds / 60);
  const remainingSeconds = safeSeconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
};

const rankLabel = (rank: number) => {
  if (rank === 1) return "1";
  if (rank === 2) return "2";
  if (rank === 3) return "3";
  return String(rank);
};

function useDailyLeaderboard({
  bookId,
  game,
  date,
  userId,
  enabled,
}: Omit<DailyLeaderboardProps, "title">) {
  const [payload, setPayload] = useState<LeaderboardPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (!enabled || !bookId) return;

    const loadLeaderboard = async () => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({
          id: bookId,
          game,
          limit: expanded ? "50" : "5",
        });
        if (date) params.set("date", date);
        if (userId) params.set("user_id", String(userId));

        const data = await fetchJsonOrThrow<LeaderboardPayload>(
          `/api/leaderboard?${params.toString()}`
        );
        setPayload(data);
      } catch (requestError) {
        console.error("Unable to load leaderboard:", requestError);
        setError("Leaderboard is not available yet.");
      } finally {
        setLoading(false);
      }
    };

    void loadLeaderboard();
  }, [bookId, date, enabled, expanded, game, userId]);

  const entries = payload?.entries || [];
  const currentUserOutsideList = useMemo(() => {
    const currentEntry = payload?.current_user_entry;
    if (!currentEntry) return null;
    return entries.some((entry) => entry.id === currentEntry.id)
      ? null
      : currentEntry;
  }, [entries, payload?.current_user_entry]);

  return {
    payload,
    loading,
    error,
    expanded,
    setExpanded,
    entries,
    currentUserOutsideList,
  };
}

export default function DailyLeaderboard({
  bookId,
  game,
  date,
  userId,
  enabled,
  title,
}: DailyLeaderboardProps) {
  const leaderboard = useDailyLeaderboard({ bookId, game, date, userId, enabled });

  if (!enabled || !bookId) return null;

  return (
    <section className="mt-6 w-full max-w-xl overflow-hidden rounded-lg border bg-card text-card-foreground shadow-sm">
      <LeaderboardHeader title={title} total={leaderboard.payload?.total_players || 0} />
      <LeaderboardContent {...leaderboard} />
    </section>
  );
}

export function DailyLeaderboardDialog({
  bookId,
  game,
  date,
  userId,
  open,
  onOpenChange,
  title,
  celebrate = false,
  outcome = null,
  practiceHref,
}: DailyLeaderboardDialogProps) {
  const [, setLocation] = useLocation();
  const leaderboard = useDailyLeaderboard({
    bookId,
    game,
    date,
    userId,
    enabled: open,
  });
  const currentRank = leaderboard.payload?.current_user_entry?.rank;
  const subtitle =
    outcome === "win"
      ? "Nicely done! Ranked by fastest time today."
      : outcome === "loss"
      ? "Didn't finish this time — ranked by fastest time today."
      : "Ranked by fastest time today";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88vh] overflow-hidden p-0 sm:max-w-xl">
        {celebrate && open ? <Confetti /> : null}
        <div className="bg-primary px-5 py-5 text-primary-foreground">
          <DialogHeader className="text-left">
            <div className="mb-2 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary-foreground text-primary shadow-sm animate-bounce">
                <Trophy className="h-6 w-6" />
              </div>
              <div>
                <DialogTitle className="text-xl">{title}</DialogTitle>
                <DialogDescription className="text-primary-foreground/80">
                  {subtitle}
                </DialogDescription>
              </div>
            </div>
            {currentRank ? (
              <div className="mt-2 inline-flex w-fit rounded-full bg-primary-foreground px-3 py-1 text-sm font-semibold text-primary">
                Your rank: #{currentRank}
              </div>
            ) : null}
          </DialogHeader>
        </div>
        <div className="max-h-[62vh] overflow-y-auto">
          <LeaderboardHeader
            title="Today"
            total={leaderboard.payload?.total_players || 0}
            compact
          />
          <LeaderboardContent {...leaderboard} />
        </div>
        {practiceHref ? (
          <div className="border-t px-4 py-3 text-center">
            <p className="mb-2 text-xs text-muted-foreground">
              Come back tomorrow for a new daily run.
            </p>
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => setLocation(practiceHref)}
            >
              Practice this game now
            </Button>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function LeaderboardHeader({
  title,
  total,
  compact = false,
}: {
  title: string;
  total: number;
  compact?: boolean;
}) {
  return (
    <div className="flex items-center justify-between border-b px-4 py-3">
      <div className="flex items-center gap-2">
        {!compact ? <Trophy className="h-5 w-5 text-primary" /> : null}
        <div>
          <h2 className="text-base font-semibold leading-tight">{title}</h2>
          <p className="text-xs text-muted-foreground">
            {total} {total === 1 ? "player" : "players"} today
          </p>
        </div>
      </div>
    </div>
  );
}

function LeaderboardContent({
  payload,
  loading,
  error,
  expanded,
  setExpanded,
  entries,
  currentUserOutsideList,
}: ReturnType<typeof useDailyLeaderboard>) {
  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 px-4 py-6 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading leaderboard
      </div>
    );
  }

  if (error) {
    return (
      <div className="px-4 py-6 text-center text-sm text-muted-foreground">
        {error}
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="px-4 py-6 text-center text-sm text-muted-foreground">
        No completed results yet.
      </div>
    );
  }

  return (
    <>
      <div className="divide-y">
        {entries.map((entry) => (
          <LeaderboardRow key={entry.id} entry={entry} />
        ))}
        {currentUserOutsideList ? (
          <LeaderboardRow entry={currentUserOutsideList} separated />
        ) : null}
      </div>
      {payload && payload.total_players > 5 ? (
        <div className="border-t px-4 py-3">
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={() => setExpanded((current) => !current)}
          >
            {expanded ? "See less" : "See full leaderboard"}
          </Button>
        </div>
      ) : null}
    </>
  );
}

function LeaderboardRow({
  entry,
  separated = false,
}: {
  entry: LeaderboardEntry;
  separated?: boolean;
}) {
  return (
    <div
      className={`flex items-center gap-3 px-4 py-3 ${
        entry.is_current_user ? "bg-primary/10" : ""
      } ${separated ? "border-t" : ""}`}
    >
      <div className="flex w-9 shrink-0 items-center justify-center text-sm font-semibold">
        {entry.rank <= 3 ? (
          <Medal className="h-5 w-5 text-primary" />
        ) : (
          rankLabel(entry.rank)
        )}
      </div>
      <img
        src={entry.user_img || DEFAULT_AVATAR}
        alt=""
        className="h-10 w-10 shrink-0 rounded-full object-cover"
      />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">
          {entry.is_current_user ? "You" : entry.username || "Player"}
        </p>
        <p className="text-xs text-muted-foreground">
          {entry.is_current_user ? "Your best time today" : "Completed today"}
        </p>
      </div>
      <div className="font-mono text-sm font-semibold">
        {formatTime(entry.time_spent_seconds)}
      </div>
    </div>
  );
}
