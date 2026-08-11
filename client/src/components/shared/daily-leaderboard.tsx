import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { Globe, Loader2, Medal, Trophy } from "lucide-react";
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
  /** Only sent for a global game — the school a player is ranked from. */
  school_name?: string | null;
}

interface LeaderboardPayload {
  total_players: number;
  entries: LeaderboardEntry[];
  current_user_entry?: LeaderboardEntry | null;
  /** "global" when every school playing this book in step shares one ranking. */
  scope?: "school" | "global";
  is_global_game?: boolean;
  schools_ranked?: number;
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
      <LeaderboardHeader
        title={title}
        total={leaderboard.payload?.total_players || 0}
        isGlobal={Boolean(leaderboard.payload?.is_global_game)}
        schoolsRanked={leaderboard.payload?.schools_ranked || 0}
      />
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
  const isGlobal = Boolean(leaderboard.payload?.is_global_game);
  // Ranking is best score first, fastest time as the tiebreak, so the copy
  // no longer promises a pure race.
  const ranking = isGlobal
    ? "Best score today across every school playing along"
    : "Best score today, fastest time breaks a tie";
  const subtitle =
    outcome === "win"
      ? `Nicely done! ${ranking}.`
      : outcome === "loss"
      ? `Didn't finish this time — ${ranking.toLowerCase()}.`
      : ranking;

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
            title={isGlobal ? "Today, worldwide" : "Today"}
            total={leaderboard.payload?.total_players || 0}
            isGlobal={isGlobal}
            schoolsRanked={leaderboard.payload?.schools_ranked || 0}
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
  isGlobal = false,
  schoolsRanked = 0,
  compact = false,
}: {
  title: string;
  total: number;
  isGlobal?: boolean;
  schoolsRanked?: number;
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
            {isGlobal && schoolsRanked > 1
              ? ` from ${schoolsRanked} schools`
              : ""}
          </p>
        </div>
      </div>
      {isGlobal ? (
        <span className="flex shrink-0 items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
          <Globe className="h-3.5 w-3.5" />
          Global game
        </span>
      ) : null}
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
        <p className="truncate text-xs text-muted-foreground">
          {/* On a global board the school is the interesting fact about a
              player you have never met; on a school board everyone shares it. */}
          {entry.school_name ||
            (entry.is_current_user ? "Your result today" : "Completed today")}
        </p>
      </div>
      <div className="text-right">
        <div className="font-mono text-sm font-semibold">
          {Math.round(entry.score || 0)}
        </div>
        <div className="font-mono text-xs text-muted-foreground">
          {formatTime(entry.time_spent_seconds)}
        </div>
      </div>
    </div>
  );
}
