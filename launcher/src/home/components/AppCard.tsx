import { Lock } from "lucide-preact";
import { useMemo } from "preact/hooks";

import type { InstalledApp } from "../../contracts/launcher";
import { useStore } from "../../shared/hooks/useStore";
import { Icon } from "../../shared/icons/Icon";
import type { HomeEnvironment } from "../types";

import { AppArtwork } from "./AppArtwork";
import { HomeControl } from "./HomeControl";
import { ReorderControls } from "./ReorderControls";
export const AppCard = ({
  env,
  app,
  active,
  checked,
}: {
  env: HomeEnvironment;
  app: InstalledApp;
  active: boolean;
  checked?: boolean;
}) => {
  const brand = useMemo(() => env.describe(app), [env, app]);
  const state = useStore(env.state);
  const moving = state.moving === app.id;
  const { lockedApps } = useStore(env.settings);
  return (
    <HomeControl
      env={env}
      controlKey={"app:" + app.id}
      dataId={app.id}
      registered={active}
      className={"tile app-tile" + (moving ? " moving" : "") + (checked ? " is-checked" : "")}
      title={brand.title}
      style={{ "--app-background": brand.background }}
    >
      <AppArtwork app={app} brand={brand} active={active} />
      {moving ? <ReorderControls env={env} id={app.id} /> : null}
      {lockedApps.includes(app.id) ? (
        <span class="app-lock-badge">
          <Icon icon={Lock} />
        </span>
      ) : null}
    </HomeControl>
  );
};
