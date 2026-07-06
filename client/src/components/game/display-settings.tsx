import { Moon, Palette, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useAccessibilityPreferences } from "@/hooks/use-accessibility-preferences";

export default function DisplaySettings() {
  const {
    darkMode,
    colorblindMode,
    setDarkMode,
    setColorblindMode,
  } = useAccessibilityPreferences();

  return (
    <TooltipProvider>
      <Popover>
        <Tooltip>
          <TooltipTrigger asChild>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="fixed right-3 top-3 z-50 h-10 w-10 rounded-full bg-background/95 shadow-sm backdrop-blur sm:right-4 sm:top-4"
                aria-label="Display settings"
              >
                <Settings2 className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
          </TooltipTrigger>
          <TooltipContent side="left">Display settings</TooltipContent>
        </Tooltip>

        <PopoverContent align="end" className="w-64">
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <Label
                htmlFor="dark-mode"
                className="flex items-center gap-2 text-sm font-medium"
              >
                <Moon className="h-4 w-4" />
                Dark mode
              </Label>
              <Switch
                id="dark-mode"
                checked={darkMode}
                onCheckedChange={setDarkMode}
                aria-label="Dark mode"
              />
            </div>

            <div className="flex items-center justify-between gap-4">
              <Label
                htmlFor="colorblind-mode"
                className="flex items-center gap-2 text-sm font-medium"
              >
                <Palette className="h-4 w-4" />
                Colorblind mode
              </Label>
              <Switch
                id="colorblind-mode"
                checked={colorblindMode}
                onCheckedChange={setColorblindMode}
                aria-label="Colorblind mode"
              />
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </TooltipProvider>
  );
}
