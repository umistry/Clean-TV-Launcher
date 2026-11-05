import { useStore } from "../shared/hooks/useStore";

import { MacHome } from "./macos/MacHome";
import { PasscodeOverlay } from "./macos/PasscodeOverlay";
import { TileHome } from "./TileHome";
import type { HomeEnvironment } from "./types";

export const Home = ({ env }: { env: HomeEnvironment }) => {
  const { macosLook } = useStore(env.settings);
  return (
    <>
      {macosLook ? <MacHome env={env} /> : <TileHome env={env} />}
      <PasscodeOverlay env={env} />
    </>
  );
};
