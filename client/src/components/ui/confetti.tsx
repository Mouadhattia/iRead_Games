import { useEffect } from "react";
import confetti from "canvas-confetti";
import successSound from "@/assest/audio/goodresult.mp3";

export function Confetti() {
  const audio = new Audio(successSound);

  useEffect(() => {
    // Play the audio when the effect starts
    audio.play();

    const duration = 3000;
    const end = Date.now() + duration;

    const frame = () => {
      confetti({
        particleCount: 2,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: ["#ff0000", "#00ff00", "#0000ff"],
      });

      confetti({
        particleCount: 2,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: ["#ff0000", "#00ff00", "#0000ff"],
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      } else {
        // Stop the audio after the animation ends
        audio.pause();
        audio.currentTime = 0;
      }
    };

    frame();
  }, []);

  return null;
}
