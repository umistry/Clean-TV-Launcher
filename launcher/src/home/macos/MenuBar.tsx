import { ListChecks, Lock, LockOpen, Settings, ShoppingBag, Tv } from "lucide-preact";

import { useStore } from "../../shared/hooks/useStore";
import { useTranslation } from "../../shared/i18n/useTranslation";
import { Icon } from "../../shared/icons/Icon";
import { useClock } from "../../status/hooks/useClock";
import { useWeather } from "../../status/hooks/useWeather";
import { NetworkStatus } from "../../status/NetworkStatus";
import { WeatherStatus } from "../../status/WeatherStatus";
import { HomeControl } from "../components/HomeControl";
import type { HomeEnvironment } from "../types";

import { LOCK_KEY, STORE_KEY } from "./dockKeys";

export const MenuBar = ({ env }: { env: HomeEnvironment }) => {
  const { t } = useTranslation();
  const { page, active } = useStore(env.state);
  const { unread } = useStore(env.updates);
  const settings = useStore(env.settings);
  const running = useStore(env.stats.tasks).length;
  const weather = useWeather(env.status.weather);
  const { text, date } = useClock(env.status.time, env.runtime.clock, settings);
  const settingsTitle = t(unread ? "settings.about.homeNotice" : "common.settings");
  const runningLabel = t(running === 1 ? "tasks.runningOne" : "tasks.running", { count: running });
  return (
    <header class="menubar" aria-hidden={!active}>
      <nav class="menubar__group" aria-label={t("home.views")}>
        <span class="menubar__mark">
          <Icon icon={Tv} />
        </span>
        <HomeControl
          env={env}
          id="home-tab"
          controlKey="home-tab"
          className={"menubar__item" + (page === "home" ? " active" : "")}
          title={t("home.home")}
          pressed={page === "home"}
        >
          {t("home.home")}
        </HomeControl>
        <HomeControl
          env={env}
          id="apps-tab"
          controlKey="apps-tab"
          className={"menubar__item" + (page === "apps" ? " active" : "")}
          title={t("home.allApps")}
          pressed={page === "apps"}
        >
          {t("home.allApps")}
        </HomeControl>
        <HomeControl
          env={env}
          id={STORE_KEY}
          controlKey={STORE_KEY}
          className="menubar__item menubar__item--store"
          title={t("home.appStore")}
          preserveSelection
        >
          <Icon icon={ShoppingBag} />
          {t("home.appStore")}
        </HomeControl>
        <HomeControl
          env={env}
          id="task-manager"
          controlKey="task-manager"
          className="menubar__item menubar__item--tasks"
          title={t("tasks.title")}
          preserveSelection
        >
          <Icon icon={ListChecks} />
          <span class="menubar__tasks-count">{runningLabel}</span>
        </HomeControl>
      </nav>
      <div class="menubar__group">
        <WeatherStatus
          variant="compact"
          weather={weather}
          showWeather={settings.showWeather}
          showLocation={settings.weatherShowLocation}
        />
        <NetworkStatus status={env.status} />
        <HomeControl
          env={env}
          id={LOCK_KEY}
          controlKey={LOCK_KEY}
          className="menubar__item menubar__item--icon"
          preserveSelection
          title={t("lock.menuTitle")}
        >
          <Icon icon={settings.passcodeHash ? Lock : LockOpen} />
        </HomeControl>
        <HomeControl
          env={env}
          id="gear"
          controlKey="gear"
          className="menubar__item menubar__item--icon"
          preserveSelection
          title={settingsTitle}
        >
          <Icon icon={Settings} />
          {unread && <span class="home-update-dot" aria-hidden="true" />}
        </HomeControl>
        {/* The clock widget already shows the time on Home. */}
        <span class="menubar__clock" hidden={page === "home" || !settings.showTime}>
          {date} {text}
        </span>
      </div>
    </header>
  );
};
