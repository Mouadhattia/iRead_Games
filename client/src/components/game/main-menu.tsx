/**
 * MainMenu Component
 *
 * The main navigation hub for the Word Games application. Displays available game modes
 * and provides links to different sections of the application.
 *
 * Features:
 * - Animated cards for each game mode
 * - Responsive grid layout
 * - Visual feedback on hover
 * - Accessible navigation
 *
 * @component
 * @example
 * return (
 *   <MainMenu />
 * )
 */

import { Link, useLocation } from "wouter";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Brain,
  Hexagon,
  Grid,
  Search,
  Sparkles,
  Trophy,
  Zap,
} from "lucide-react";
import { motion } from "framer-motion";
import { apiRequest, fetchJsonOrThrow } from "@/lib/queryClient.ts";
import { useGameStore } from "@/lib/game.ts";
import { getErrorMessage } from "@/components/shared/game-load-error";
import { DailyLeaderboardDialog } from "@/components/shared/daily-leaderboard";
import { useGameView, type GameView } from "@/lib/game-view";

import { useToast } from "@/hooks/use-toast";
import { useEffect, useState } from "react";

const useQuery = () => {
  return new URLSearchParams(window.location.search);
};

const COMPETITION_CHALLENGES_ENABLED = false;
const competitionDateKey = () => new Date().toISOString().slice(0, 10);
const gameCardClass =
  "game-menu-card flex h-full min-h-[250px] flex-col overflow-hidden transition-colors";
const gameCardHeaderClass = "min-h-[74px]";
const gameCardContentClass = "grid flex-1 content-start gap-2";
const gameActionClass =
  "game-menu-action flex min-h-10 w-full items-center rounded-lg bg-secondary/50 px-3 py-2 text-left text-sm font-medium transition-colors hover:bg-secondary";
const leaderboardActionClass =
  "game-menu-action game-menu-action-leaderboard flex min-h-10 w-full items-center rounded-lg bg-primary/10 px-3 py-2 text-left text-sm font-medium transition-colors hover:bg-primary/20";
const disabledGameActionClass = `${gameActionClass} disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-secondary/50`;
const gameViewOptions: Array<{
  value: GameView;
  label: string;
  description: string;
}> = [
  {
    value: "kids",
    label: "Kids",
    description: "Quest mode",
  },
  {
    value: "teens",
    label: "Teens",
    description: "Arena mode",
  },
];

export default function MainMenu() {
  const [user, setUser] = useState<{
    client_id_invoicing_api: string;
    email: string;
    id: number;
    img: string;
    is_authenticated: boolean;
    quiz_id: string;
    role: string;
    schools: Array<{
      id: number;
      name: string;
    }>;
    username: string;
  } | null>(null);
  const [leaderboardGame, setLeaderboardGame] = useState<{
    game: string;
    title: string;
  } | null>(null);
  const { getResult, clearScore } = useGameStore();
  const [location, setLocation] = useLocation();
  const query = useQuery();
  const id = query.get("id");
  const schoolId =
    query.get("school_id") || query.get("school") || query.get("shcool_id");
  const packId = query.get("pack_id");
  const { view, setView, isKids } = useGameView();
  const menuTitle = isKids ? "Game Time!" : "iRead Arena";
  const menuSubtitle = isKids
    ? "Choose a bright challenge and start playing."
    : "Daily word runs, streaks, and rankings built for focus.";
  const playLabel = isKids ? "Play" : "Start";
  const dailyLabel = isKids ? "Daily Quest" : "Daily Run";
  const leaderboardLabel = isKids ? "Top Players" : "Rankings";
  const competitionLabel = isKids ? "Tournament" : "Competition Challenge";
  const gameDescriptions = {
    thinkWord: isKids
      ? "Guess the secret word."
      : "Guess the hidden word with colored hints",
    beeGenius: isKids
      ? "Make words with letter tiles."
      : "Create words using available letters",
    intellectLink: isKids
      ? "Connect letters and find story words."
      : "Connect letters to form words in a grid",
    wordExplorer: isKids
      ? "Find words hiding in the grid."
      : "Find hidden words in a letter grid",
  };
  const withId = (path: string) => {
    const params = new URLSearchParams();
    if (id) params.set("id", id);
    if (schoolId) params.set("school_id", schoolId);
    if (user?.id) params.set("user_id", String(user.id));
    if (packId) params.set("pack_id", packId);
    const queryString = params.toString();
    return queryString ? `${path}?${queryString}` : path;
  };
  const withCompetition = (path: string) => {
    const params = new URLSearchParams();
    if (id) params.set("id", id);
    if (schoolId) params.set("school_id", schoolId);
    if (user?.id) params.set("user_id", String(user.id));
    if (packId) params.set("pack_id", packId);
    params.set("competition", "true");
    return `${path}?${params.toString()}`;
  };
  const { toast } = useToast();

  const openLeaderboard = (game: string, title: string) => {
    if (!id) {
      toast({
        title: "Book required",
        description: "Open games from an iRead book to see its leaderboard.",
        variant: "destructive",
      });
      return;
    }

    setLeaderboardGame({ game, title });
  };

  //clearScore

  useEffect(() => {
    clearScore();
  }, []);

  const getCompetitionAttemptKey = (game: string) =>
    `iread-games:competition:${user?.id ?? 610}:${id ?? "no-book"}:${game}:${competitionDateKey()}`;

  const hasCompetitionAttemptToday = (game: string) =>
    Boolean(window.localStorage.getItem(getCompetitionAttemptKey(game)));

  const lockCompetitionAttempt = (game: string, resultId?: string | number) => {
    window.localStorage.setItem(
      getCompetitionAttemptKey(game),
      JSON.stringify({
        resultId: resultId ?? null,
        startedAt: new Date().toISOString(),
      }),
    );
  };

  const preflightCompetitionChallenge = (game: string) => {
    const params = new URLSearchParams({ id: id ?? "", competition: "true" });
    if (schoolId) params.set("school_id", schoolId);

    if (game === "think-word") {
      return fetchJsonOrThrow(`/api/daily-challenge?${params.toString()}`);
    }

    if (game === "bee-genius") {
      return fetchJsonOrThrow(`/api/daily-spelling-bee?${params.toString()}`);
    }

    if (game === "intellect-link") {
      return fetchJsonOrThrow(`/api/strands/daily?${params.toString()}`);
    }

    const wordSearchParams = new URLSearchParams({
      id: id ?? "",
      competition: "true",
    });
    return fetchJsonOrThrow(
      `/api/daily-word-search?${wordSearchParams.toString()}`,
    );
  };

  const startCompetitionChallenge = async (game: string, path: string) => {
    if (!id) {
      toast({
        title: "Book required",
        description:
          "Open this game from an iRead book before starting a competition.",
        variant: "destructive",
      });
      return;
    }

    if (hasCompetitionAttemptToday(game)) {
      toast({
        title: "Competition already played",
        description: "You can play this competition again tomorrow.",
        variant: "destructive",
      });
      return;
    }

    try {
      await preflightCompetitionChallenge(game);

      const response = await apiRequest("POST", "/api/save-result", {
        game,
        book_id: id,
        score: 0,
        user_id: user?.id ?? 610,
      });

      const res = await response.json();
      const savedResult = res?.result ?? res;
      getResult(savedResult ?? {});

      if (savedResult?.completed) {
        lockCompetitionAttempt(game, savedResult?.id);
        toast({
          title: "Game Over",
          description:
            "You have already finished the game today. Come back tomorrow!",
          variant: "destructive",
        });
        return;
      }

      if (!savedResult?.id) {
        toast({
          title: "Unable to start competition",
          description: "The result could not be created. Please try again.",
          variant: "destructive",
        });
        return;
      }

      lockCompetitionAttempt(game, savedResult.id);
      setLocation(withCompetition(path));
    } catch (error) {
      console.error("Error starting competition challenge:", error);
      toast({
        title: "Unable to start competition",
        description: getErrorMessage(
          error,
          "No words available today. Please try again later.",
        ),
        variant: "destructive",
      });
    }
  };
  // const ireadApi = "http://localhost:5003"; // Replace with your actual API URL
  const ireadApi = "api.iread.education"; // Replace with your actual API URL
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await fetch(ireadApi + "/reader/user_authenticated", {
          method: "GET",
          credentials: "include",
        });

        const currentUsser = await response.json();

        setUser(currentUsser);
      } catch (error) {
        console.error("Error fetching user:", error);
      }
    };

    fetchUser();
  }, []);

  return (
    <div className="game-menu-page relative flex min-h-[calc(100vh-2rem)] w-full flex-col items-center justify-center overflow-x-hidden bg-background p-4 pt-16 sm:pt-4">
      <motion.h1
        className="game-view-title text-3xl sm:text-4xl font-bold mb-3 text-center bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent"
        initial={{ y: -20, opacity: 1 }}
        animate={{ y: 0, opacity: 1 }}
      >
        {menuTitle}
      </motion.h1>
      <p className="game-view-subtitle mb-3 w-full max-w-2xl text-center text-sm text-muted-foreground sm:text-base">
        {menuSubtitle}
      </p>

      <div
        className="game-view-selector mb-5 flex w-full max-w-xl flex-col gap-2 rounded-lg border bg-card p-2 shadow-sm sm:flex-row"
        role="radiogroup"
        aria-label="Choose game view"
      >
        {gameViewOptions.map((option) => {
          const selected = view === option.value;
          const Icon = option.value === "kids" ? Sparkles : Zap;
          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => setView(option.value)}
              className={`game-view-selector-option flex min-h-14 flex-1 items-center gap-3 rounded-md px-4 py-3 text-left transition-colors ${
                selected
                  ? "is-selected bg-primary text-primary-foreground shadow-sm"
                  : "bg-transparent text-foreground hover:bg-secondary"
              }`}
            >
              <Icon className="h-5 w-5 shrink-0" />
              <span className="min-w-0">
                <span className="block font-semibold leading-tight">
                  {option.label}
                </span>
                <span
                  className={`block text-xs leading-tight ${
                    selected
                      ? "text-primary-foreground/80"
                      : "text-muted-foreground"
                  }`}
                >
                  {option.description}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      <div className="grid w-full max-w-5xl grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-2">
        <motion.div
          className="h-full"
          initial={{ x: -20, opacity: 1 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
        >
          <Card className={`${gameCardClass} game-card-think`}>
            <CardHeader className={gameCardHeaderClass}>
              <CardTitle className="game-menu-card-title flex items-center gap-3">
                <span className="game-menu-icon">
                  <Brain className="h-6 w-6" />
                </span>
                <span>Think Word</span>
              </CardTitle>
              <CardDescription>{gameDescriptions.thinkWord}</CardDescription>
            </CardHeader>
            <CardContent className={gameCardContentClass}>
              <Link href={withId("/game")} className={gameActionClass}>
                {playLabel} Think Word
              </Link>
              <Link
                href={withId("/daily-challenge")}
                className={gameActionClass}
              >
                {dailyLabel}
              </Link>
              <button
                type="button"
                onClick={() =>
                  startCompetitionChallenge("think-word", "/daily-challenge")
                }
                disabled={!COMPETITION_CHALLENGES_ENABLED}
                title="Competition Challenge is temporarily disabled"
                className={disabledGameActionClass}
              >
                <div className="flex items-center gap-2">
                  <Trophy className="h-4 w-4" />
                  {competitionLabel}
                </div>
              </button>
              <button
                type="button"
                onClick={() =>
                  openLeaderboard("think-word", "Think Word Leaderboard")
                }
                className={leaderboardActionClass}
              >
                <div className="flex items-center gap-2">
                  <Trophy className="h-4 w-4" />
                  {leaderboardLabel}
                </div>
              </button>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          className="h-full"
          initial={{ y: 20, opacity: 1 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <Card className={`${gameCardClass} game-card-bee`}>
            <CardHeader className={gameCardHeaderClass}>
              <CardTitle className="game-menu-card-title flex items-center gap-3">
                <span className="game-menu-icon">
                  <Hexagon className="h-6 w-6" />
                </span>
                <span>Bee Genius</span>
              </CardTitle>
              <CardDescription>{gameDescriptions.beeGenius}</CardDescription>
            </CardHeader>
            <CardContent className={gameCardContentClass}>
              <Link href={withId("/spelling-bee")} className={gameActionClass}>
                {playLabel} Bee Genius
              </Link>
              <button
                type="button"
                onClick={() => setLocation(withId("/daily-spelling-bee"))}
                className={gameActionClass}
              >
                {dailyLabel}
              </button>
              <button
                type="button"
                onClick={() =>
                  startCompetitionChallenge("bee-genius", "/daily-spelling-bee")
                }
                disabled={!COMPETITION_CHALLENGES_ENABLED}
                title="Competition Challenge is temporarily disabled"
                className={disabledGameActionClass}
              >
                <div className="flex items-center gap-2">
                  <Trophy className="h-4 w-4" />
                  {competitionLabel}
                </div>
              </button>
              <button
                type="button"
                onClick={() =>
                  openLeaderboard("bee-genius", "Bee Genius Leaderboard")
                }
                className={leaderboardActionClass}
              >
                <div className="flex items-center gap-2">
                  <Trophy className="h-4 w-4" />
                  {leaderboardLabel}
                </div>
              </button>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          className="h-full"
          initial={{ x: -20, opacity: 1 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <Card className={`${gameCardClass} game-card-link`}>
            <CardHeader className={gameCardHeaderClass}>
              <CardTitle className="game-menu-card-title flex items-center gap-3">
                <span className="game-menu-icon">
                  <Grid className="h-6 w-6" />
                </span>
                <span>Intellect Link</span>
              </CardTitle>
              <CardDescription>
                {gameDescriptions.intellectLink}
              </CardDescription>
            </CardHeader>
            <CardContent className={gameCardContentClass}>
              <Link href={withId("/strands")} className={gameActionClass}>
                {playLabel} Intellect Link
              </Link>
              <button
                type="button"
                onClick={() => setLocation(withId("/daily-strands"))}
                className={gameActionClass}
              >
                {dailyLabel}
              </button>
              <button
                type="button"
                onClick={() =>
                  startCompetitionChallenge("intellect-link", "/daily-strands")
                }
                disabled={!COMPETITION_CHALLENGES_ENABLED}
                title="Competition Challenge is temporarily disabled"
                className={disabledGameActionClass}
              >
                <div className="flex items-center gap-2">
                  <Trophy className="h-4 w-4" />
                  {competitionLabel}
                </div>
              </button>
              <button
                type="button"
                onClick={() =>
                  openLeaderboard(
                    "intellect-link",
                    "Intellect Link Leaderboard",
                  )
                }
                className={leaderboardActionClass}
              >
                <div className="flex items-center gap-2">
                  <Trophy className="h-4 w-4" />
                  {leaderboardLabel}
                </div>
              </button>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          className="h-full"
          initial={{ x: 20, opacity: 1 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          <Card className={`${gameCardClass} game-card-search`}>
            <CardHeader className={gameCardHeaderClass}>
              <CardTitle className="game-menu-card-title flex items-center gap-3">
                <span className="game-menu-icon">
                  <Search className="h-6 w-6" />
                </span>
                <span>Word Explorer</span>
              </CardTitle>
              <CardDescription>{gameDescriptions.wordExplorer}</CardDescription>
            </CardHeader>
            <CardContent className={gameCardContentClass}>
              <Link href={withId("/word-search")} className={gameActionClass}>
                {playLabel} Word Explorer
              </Link>
              <button
                type="button"
                onClick={() => setLocation(withId("/daily-word-search"))}
                className={gameActionClass}
              >
                {dailyLabel}
              </button>
              <button
                type="button"
                onClick={() =>
                  startCompetitionChallenge(
                    "word-explorer",
                    "/daily-word-search",
                  )
                }
                disabled={!COMPETITION_CHALLENGES_ENABLED}
                title="Competition Challenge is temporarily disabled"
                className={disabledGameActionClass}
              >
                <div className="flex items-center gap-2">
                  <Trophy className="h-4 w-4" />
                  {competitionLabel}
                </div>
              </button>
              <button
                type="button"
                onClick={() =>
                  openLeaderboard("word-explorer", "Word Explorer Leaderboard")
                }
                className={leaderboardActionClass}
              >
                <div className="flex items-center gap-2">
                  <Trophy className="h-4 w-4" />
                  {leaderboardLabel}
                </div>
              </button>
            </CardContent>
          </Card>
        </motion.div>
      </div>
      <DailyLeaderboardDialog
        bookId={id}
        game={leaderboardGame?.game || "think-word"}
        userId={user?.id}
        open={Boolean(leaderboardGame)}
        onOpenChange={(open) => {
          if (!open) setLeaderboardGame(null);
        }}
        title={leaderboardGame?.title || "Leaderboard"}
      />
    </div>
  );
}
