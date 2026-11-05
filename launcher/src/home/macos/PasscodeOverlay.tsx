import { useLayoutEffect } from "preact/hooks";

import { useStore } from "../../shared/hooks/useStore";
import type { HomeEnvironment } from "../types";

import { ClockWidget } from "./ClockWidget";
import { PasscodePad } from "./PasscodePad";

// The passcode prompt: a panel over Home, or the lock screen when it covers the whole TV.
export const PasscodeOverlay = ({ env }: { env: HomeEnvironment }) => {
  const prompt = useStore(env.locks.prompt);
  const covered = Boolean(prompt?.cover);
  useLayoutEffect(() => {
    document.body.classList.toggle("tv-locked", covered);
    return () => document.body.classList.remove("tv-locked");
  }, [covered]);
  if (!prompt) {
    return null;
  }
  return (
    <div class={"passcode" + (covered ? " passcode--cover" : "")}>
      {covered ? <ClockWidget env={env} /> : null}
      <PasscodePad env={env} prompt={prompt} />
    </div>
  );
};
