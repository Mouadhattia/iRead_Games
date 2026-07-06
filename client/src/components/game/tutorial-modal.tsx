import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Brain,
  Clock,
  Grid,
  HelpCircle,
  Keyboard,
  Lightbulb,
  Search,
  Sparkles,
  Target,
  Trophy,
} from "lucide-react";

type GameMode = "classic" | "daily" | "competition";
export type TutorialGame =
  | "think-word"
  | "word-explorer"
  | "bee-genius"
  | "intellect-link";

interface TutorialModalProps {
  open: boolean;
  onClose: () => void;
  gameMode?: GameMode;
  game?: TutorialGame;
}

const modeLabels: Record<GameMode, string> = {
  classic: "Classic",
  daily: "Daily",
  competition: "Competition",
};

const practiceModeSection = {
  icon: Sparkles,
  title: "Practice Mode",
  bullets: [
    "Unlimited replays — jump into Play Again or try another game anytime.",
    "No score here — your progress counts toward your word achievements (coming soon).",
  ],
};

const copy = {
  "think-word": {
    title: "How to Play Think Word",
    description: "Guess the hidden word before you run out of attempts.",
    sections: {
      classic: [
        {
          icon: Brain,
          title: "Goal",
          bullets: [
            "Guess the hidden word using the selected word length.",
            "Green tiles are correct, yellow tiles are in the word, and gray tiles are absent.",
            "Repeated guesses are blocked so every attempt counts.",
          ],
        },
        {
          icon: Keyboard,
          title: "Input",
          bullets: [
            "Use the on-screen keyboard or your physical keyboard.",
            "Press Enter to submit and Backspace to edit.",
          ],
        },
        {
          icon: Lightbulb,
          title: "Hints",
          bullets: [
            "A hint unlocks once you reach your final guess.",
            "Using it reveals the word's definition and costs points.",
          ],
        },
        practiceModeSection,
      ],
      daily: [
        {
          icon: Clock,
          title: "Daily Pack",
          bullets: [
            "Solve each word in the daily pack in order.",
            "Your score carries through the pack.",
            "Use Finish to return to the main menu when the game ends.",
          ],
        },
      ],
      competition: [
        {
          icon: Trophy,
          title: "Competition",
          bullets: [
            "Competition mode starts from the main menu and saves only that competition result.",
            "Wins, losses, score, and learned words are sent when a valid result exists.",
            "Time-up and game-over states return safely to the main menu.",
          ],
        },
      ],
    },
  },
  "word-explorer": {
    title: "How to Play Word Explorer",
    description: "Find hidden words in the letter grid before time runs out.",
    sections: {
      classic: [
        {
          icon: Search,
          title: "Goal",
          bullets: [
            "Drag across adjacent letters to select a word.",
            "Words can run horizontally, vertically, diagonally, or backward when the puzzle allows it.",
            "Found words stay highlighted in the grid.",
          ],
        },
        {
          icon: Grid,
          title: "Hints",
          bullets: [
            "Click a word in the list to reveal hint information.",
            "Each hint reduces that word's points, though practice mode doesn't track an overall score.",
          ],
        },
        practiceModeSection,
      ],
      daily: [
        {
          icon: Clock,
          title: "Daily Puzzle",
          bullets: [
            "Daily mode uses a single timed puzzle.",
            "The game ends cleanly when all words are found or time runs out.",
            "Use Finish to return to the main menu when the round is over.",
          ],
        },
      ],
      competition: [
        {
          icon: Trophy,
          title: "Competition",
          bullets: [
            "Competition mode saves progress only when it was started from the competition challenge button.",
            "The final score includes found-word points plus completion bonuses.",
            "Time-up saves an incomplete result instead of marking the puzzle complete.",
          ],
        },
      ],
    },
  },
  "bee-genius": {
    title: "How to Play Bee Genius",
    description: "Build valid words from the letter hive and uncover every story word.",
    sections: {
      classic: [
        {
          icon: Brain,
          title: "Goal",
          bullets: [
            "Use the available letters to make valid words — every word must be at least four letters long and include the center letter.",
            "Find every story word from today's book to complete the puzzle.",
            "Other valid words you find along the way earn hints.",
          ],
        },
        {
          icon: Keyboard,
          title: "Controls",
          bullets: [
            "Click letters or type them on your keyboard.",
            "Submit with Enter and edit with Delete.",
            "Shuffle rearranges the outer letters.",
          ],
        },
        {
          icon: Lightbulb,
          title: "Hints",
          bullets: [
            "Find a set number of non-story words to earn a hint.",
            "Use a hint to reveal an unfound story word above the hive, with its first letter highlighted on the board.",
          ],
        },
        practiceModeSection,
      ],
      daily: [
        {
          icon: Clock,
          title: "Daily Pack",
          bullets: [
            "Daily mode can contain multiple letter hives, each with its own story words.",
            "Finish a hive's story words to unlock the next one.",
            "The round ends as soon as every story word in the pack is found, or when time runs out.",
          ],
        },
      ],
      competition: [
        {
          icon: Trophy,
          title: "Competition",
          bullets: [
            "Competition mode starts from the main menu challenge button.",
            "Only competition mode saves the iRead result from this game.",
            "Finish returns to the main menu after completion or time-up.",
          ],
        },
      ],
    },
    extraSections: [
      {
        icon: Target,
        title: "Scoring",
        bullets: [
          "Daily Run and Competition Challenge score words by length — longer words are worth more.",
          "Practice mode has no score, so explore freely while you work toward your word achievements.",
        ],
      },
    ],
  },
  "intellect-link": {
    title: "How to Play Intellect Link",
    description: "Connect adjacent letters to find every story word.",
    sections: {
      classic: [
        {
          icon: Brain,
          title: "Goal",
          bullets: [
            "Connect neighboring letters in any direction — words must be at least three letters long.",
            "Find every story word from today's book to complete the puzzle.",
            "Other valid words you find along the way earn hints.",
          ],
        },
        {
          icon: Grid,
          title: "Board",
          bullets: [
            "Click and drag through letters to build a path.",
            "Release to submit the selected word.",
            "Found words stay listed below the board.",
          ],
        },
        {
          icon: Lightbulb,
          title: "Hints",
          bullets: [
            "Find a set number of non-story words to earn a hint.",
            "Use a hint to reveal an unfound story word above the board, with its first letter highlighted.",
          ],
        },
        practiceModeSection,
      ],
      daily: [
        {
          icon: Target,
          title: "Daily Pack",
          bullets: [
            "Daily mode presents a set of timed letter-link puzzles.",
            "Complete a puzzle's story words to unlock the next one.",
            "Finish returns safely to the main menu when the game ends.",
          ],
        },
      ],
      competition: [
        {
          icon: Trophy,
          title: "Competition",
          bullets: [
            "Competition mode starts from the main menu challenge button.",
            "Only competition mode sends saved result updates.",
            "Time-up saves an incomplete result and returns to the menu.",
          ],
        },
      ],
    },
  },
} as const;

export default function TutorialModal({
  open,
  onClose,
  gameMode = "classic",
  game = "think-word",
}: TutorialModalProps) {
  const tutorial = copy[game];
  const extraSections =
    "extraSections" in tutorial ? tutorial.extraSections : undefined;

  return (
    <Dialog modal open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-[92vw] sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <HelpCircle className="h-6 w-6" />
            {tutorial.title}
          </DialogTitle>
          <DialogDescription>{tutorial.description}</DialogDescription>
        </DialogHeader>

        <Tabs defaultValue={gameMode} className="mt-4">
          <TabsList className="grid w-full grid-cols-3">
            {(Object.keys(modeLabels) as GameMode[]).map((mode) => (
              <TabsTrigger key={mode} value={mode}>
                {modeLabels[mode]}
              </TabsTrigger>
            ))}
          </TabsList>

          <ScrollArea className="h-[60vh] mt-6 pr-4">
            {(Object.keys(modeLabels) as GameMode[]).map((mode) => (
              <TabsContent key={mode} value={mode}>
                <div className="space-y-6">
                  {tutorial.sections[mode].map((section) => {
                    const Icon = section.icon;

                    return (
                      <section key={section.title}>
                        <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
                          <Icon className="h-5 w-5 text-primary" />
                          {section.title}
                        </h3>
                        <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
                          {section.bullets.map((bullet) => (
                            <li key={bullet}>{bullet}</li>
                          ))}
                        </ul>
                      </section>
                    );
                  })}
                </div>
              </TabsContent>
            ))}

            {extraSections ? (
              <div className="mt-6 space-y-6">
                {extraSections.map((section) => {
                  const Icon = section.icon;

                  return (
                    <section key={section.title}>
                      <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
                        <Icon className="h-5 w-5 text-primary" />
                        {section.title}
                      </h3>
                      <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
                        {section.bullets.map((bullet) => (
                          <li key={bullet}>{bullet}</li>
                        ))}
                      </ul>
                    </section>
                  );
                })}
              </div>
            ) : null}
          </ScrollArea>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
