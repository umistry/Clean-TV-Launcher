import { useEffect, useRef, useState } from "preact/hooks";

import { watchPresence } from "../shared/presence/watchPresence";

import { createPhotoRotation, photoUrl } from "./photoRotation";
import { WallpaperClip } from "./WallpaperClip";

// A blip, like a quick overlay, isn't "coming back to the home screen", so it keeps the same photo.
const MIN_AWAY_MS = 5000;
// An app that was asked to open has had this long if the launcher is still on screen: it didn't open.
const HANDOFF_FAILED_MS = 8000;

const safeStorage = () => {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
};
const usesVideoPlane = () => "tizen" in window || Boolean(window.AeroSystemDemo?.videoPlane);

export const PhotoWallpaper = () => {
  const rotation = useRef(createPhotoRotation(safeStorage()));
  const [photos, setPhotos] = useState(() => ({ current: rotation.current.advance(), previous: "" }));
  // The clip waits for the photo to finish fading in, and for the launcher to have the screen.
  const [settled, setSettled] = useState(false);
  const [present, setPresent] = useState(true);
  const [held, setHeld] = useState(false);
  const [failedClip, setFailedClip] = useState("");
  const next = useRef<HTMLImageElement | null>(null);
  const preloadNext = () => {
    const image = new Image();
    image.src = photoUrl(rotation.current.peek());
    next.current = image;
    image.decode().catch(() => undefined);
  };
  const settle = () => {
    setPhotos((state) => ({ current: state.current, previous: "" }));
    setSettled(true);
  };
  const stepAside = () => {
    setPresent(false);
    setHeld(false);
  };
  useEffect(
    () =>
      watchPresence(window, {
        onAway: stepAside,
        onReturn(awayMs) {
          setPresent(true);
          // After a TV power cycle the decoder is gone, so the clip always restarts.
          setHeld(false);
          if (awayMs >= MIN_AWAY_MS) {
            const name = rotation.current.advance();
            setSettled(false);
            setPhotos((state) => ({ current: name, previous: state.current }));
          }
        },
      }),
    [],
  );
  useEffect(() => {
    let timer: number | undefined;
    const handoff = () => {
      stepAside();
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        if (!document.hidden && document.hasFocus()) {
          setPresent(true);
        }
      }, HANDOFF_FAILED_MS);
    };
    const event = window.AeroTizen.config.HANDOFF_EVENT;
    document.addEventListener(event, handoff);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener(event, handoff);
    };
  }, []);
  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("has-video-plane", held);
    return () => root.classList.remove("has-video-plane");
  }, [held]);
  const showClip = usesVideoPlane() && settled && present && failedClip !== photos.current;
  return (
    <div class="bg-photos">
      {showClip ? (
        <WallpaperClip
          key={photos.current + "-clip"}
          name={photos.current}
          onHeld={() => setHeld(true)}
          onFailed={() => {
            setHeld(false);
            setFailedClip(photos.current);
          }}
        />
      ) : null}
      {photos.previous ? <img key={photos.previous} class="bg-photo" alt="" src={photoUrl(photos.previous)} /> : null}
      <img
        key={photos.current}
        class={"bg-photo bg-photo--entering" + (held && showClip ? " bg-photo--revealed" : "")}
        alt=""
        src={photoUrl(photos.current)}
        onLoad={preloadNext}
        onAnimationEnd={settle}
      />
    </div>
  );
};
