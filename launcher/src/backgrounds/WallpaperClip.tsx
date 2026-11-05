import { useEffect, useRef } from "preact/hooks";

import { clipUrl } from "./photoRotation";

// The encoder refines the picture over the first few frames, so hold a frame from later in the clip.
const HOLD_AFTER_MS = 500;
const GIVE_UP_MS = 6000;

// The TV draws web pages at 1920x1080 but video at full 4K. This plays a photo's very short clip on the video
// layer and holds on one frame, which is how the wallpaper reaches every pixel of the panel.
export const WallpaperClip = ({ name, onHeld, onFailed }: { name: string; onFailed(): void; onHeld(): void }) => {
  const video = useRef<HTMLVideoElement>(null);
  const report = useRef({ onFailed, onHeld });
  report.current = { onFailed, onHeld };
  useEffect(() => {
    const node = video.current;
    if (!node) {
      return undefined;
    }
    let hold: number | undefined;
    const failed = () => report.current.onFailed();
    const giveUp = window.setTimeout(failed, GIVE_UP_MS);
    const playing = () => {
      window.clearTimeout(giveUp);
      hold = window.setTimeout(() => {
        node.pause();
        report.current.onHeld();
      }, HOLD_AFTER_MS);
    };
    node.addEventListener("playing", playing, { once: true });
    node.addEventListener("error", failed);
    node.play().catch(failed);
    return () => {
      window.clearTimeout(giveUp);
      window.clearTimeout(hold);
      node.removeEventListener("playing", playing);
      node.removeEventListener("error", failed);
      // Only this frees the TV's video decoder for the app that's about to open.
      node.pause();
      node.removeAttribute("src");
      node.load();
    };
  }, []);
  return <video ref={video} class="bg-clip" src={clipUrl(name)} muted playsInline preload="auto" />;
};
