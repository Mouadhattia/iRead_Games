import { Switch, Route } from "wouter";
import { Toaster } from "@/components/ui/toaster";
import Game from "@/pages/game";
import DailyChallenge from "@/pages/daily-challenge";
import ChallengeCalendar from "@/pages/challenge-calendar";
import SpellingBee from "@/pages/spelling-bee";
import NotFound from "@/pages/not-found";
import MainMenu from "@/components/game/main-menu";
import DailySpellingBee from "@/pages/daily-spelling-bee";
import SpellingBeeCalendar from "@/pages/spelling-bee-calendar";
import Strands from "@/pages/strands";
import DailyStrands from "@/pages/daily-strands";
import StrandsCalendar from "@/pages/strands-calendar";
import WordSearch from "@/pages/word-search";
import DailyWordSearch from "@/pages/daily-word-search";
import WordSearchCalendar from "@/pages/word-search-calendar";
import WordSearchComp from "@/pages/word-search-comp";
import DisplaySettings from "@/components/game/display-settings";
import { GameViewProvider, useGameView } from "@/lib/game-view";

function Router() {
  const { viewClassName } = useGameView();

  return (
    <div
      className={`iread-game-app ${viewClassName} flex min-h-screen w-full flex-col items-center overflow-x-hidden bg-background p-4`}
    >
      <Switch>
        <Route path="/" component={MainMenu} />
        <Route path="/game" component={Game} />
        <Route path="/daily-challenge" component={DailyChallenge} />
        <Route path="/challenge-calendar" component={ChallengeCalendar} />
        <Route path="/spelling-bee" component={SpellingBee} />
        <Route path="/daily-spelling-bee" component={DailySpellingBee} />
        <Route path="/spelling-bee-calendar" component={SpellingBeeCalendar} />
        <Route path="/strands" component={Strands} />
        <Route path="/daily-strands" component={DailyStrands} />
        <Route path="/strands-calendar" component={StrandsCalendar} />
        <Route path="/word-search" component={WordSearch} />
        <Route path="/daily-word-search" component={DailyWordSearch} />
        <Route path="/word-search-calendar" component={WordSearchCalendar} />
        <Route path="/word-search-comp" component={WordSearchComp} />
        <Route component={NotFound} />
      </Switch>
    </div>
  );
}

function App() {
  return (
    <GameViewProvider>
      <DisplaySettings />
      <Router />
      <Toaster />
    </GameViewProvider>
  );
}

export default App;
