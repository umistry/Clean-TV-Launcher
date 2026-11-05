import { LayoutGrid, Plus } from "lucide-preact";

import type { InputSource, InstalledApp } from "../../contracts/launcher";
import { useStore } from "../../shared/hooks/useStore";
import { useTranslation } from "../../shared/i18n/useTranslation";
import { Icon } from "../../shared/icons/Icon";
import { AppCard } from "../components/AppCard";
import { FireplaceCard } from "../components/FireplaceCard";
import { HomeControl } from "../components/HomeControl";
import { InputCard } from "../components/InputCard";
import type { HomeEnvironment } from "../types";

import { DOCK_ADD_KEY, inputKey, LAUNCHPAD_KEY } from "./dockKeys";

const DOCK_WIDTH = 1720;
const MAX_ICON_SIZE = 112;
const ICON_GAP = 30;
// Magnification by distance from the focused icon, as in the macOS Dock.
const PROXIMITY_CLASSES = [" dock__slot--focused", " dock__slot--near", " dock__slot--nearby"];

export const Dock = ({
  env,
  ids,
  apps,
  inputs,
  shown,
  active,
}: {
  env: HomeEnvironment;
  ids: readonly string[];
  apps: readonly InstalledApp[];
  inputs: readonly InputSource[];
  shown: boolean;
  active: boolean;
}) => {
  const { t } = useTranslation();
  const { selected } = useStore(env.state);
  const registered = active && shown;
  const keys = [LAUNCHPAD_KEY, ...ids.map((id) => "app:" + id), DOCK_ADD_KEY, ...inputs.map(inputKey)];
  const focusedAt = registered ? keys.indexOf(selected) : -1;
  const iconSize = Math.min(MAX_ICON_SIZE, Math.floor(DOCK_WIDTH / keys.length) - ICON_GAP);
  const slotClass = (key: string) => {
    const proximity = focusedAt < 0 ? "" : PROXIMITY_CLASSES[Math.abs(keys.indexOf(key) - focusedAt)];
    return "dock__slot" + (proximity || "");
  };
  return (
    <nav
      id={shown ? "grid" : "dock-parked"}
      class="dock"
      hidden={!shown}
      aria-label={t("home.homeApps")}
      style={{ "--dock-icon": iconSize + "px" }}
    >
      <div class={slotClass(LAUNCHPAD_KEY)}>
        <HomeControl
          env={env}
          controlKey={LAUNCHPAD_KEY}
          className="tile dock-launchpad"
          title={t("home.allApps")}
          registered={registered}
        >
          <span class="dock-launchpad__face">
            <Icon icon={LayoutGrid} />
          </span>
        </HomeControl>
      </div>
      {ids.map((id) => {
        const key = "app:" + id;
        const app = apps.find((app) => app.id === id) || { id, name: id, icon: "" };
        return (
          <div key={id} class={slotClass(key)}>
            {id === env.runtime.config.FIREPLACE_ID ? (
              <FireplaceCard env={env} registered={registered} />
            ) : (
              <AppCard env={env} app={app} active={registered} />
            )}
          </div>
        );
      })}
      <div class={slotClass(DOCK_ADD_KEY)}>
        <HomeControl
          env={env}
          controlKey={DOCK_ADD_KEY}
          className="tile dock-add"
          title={t("dock.edit")}
          registered={registered}
        >
          <span class="dock-add__face">
            <Icon icon={Plus} />
          </span>
        </HomeControl>
      </div>
      {inputs.length > 0 ? <span class="dock__separator" aria-hidden="true" /> : null}
      {inputs.map((source) => (
        <div key={inputKey(source)} class={slotClass(inputKey(source))}>
          <InputCard env={env} source={source} glass />
        </div>
      ))}
    </nav>
  );
};
