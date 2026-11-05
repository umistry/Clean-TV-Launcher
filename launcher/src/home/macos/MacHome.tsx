import { ArrowUp } from "lucide-preact";
import { useLayoutEffect } from "preact/hooks";

import { useStore } from "../../shared/hooks/useStore";
import { useTranslation } from "../../shared/i18n/useTranslation";
import { Icon } from "../../shared/icons/Icon";
import { AppActionsMenu } from "../components/AppActionsMenu";
import { AppGrid } from "../components/AppGrid";
import { HomeControl } from "../components/HomeControl";
import type { HomeEnvironment } from "../types";

import { DesktopWidgets } from "./DesktopWidgets";
import { Dock } from "./Dock";
import { LockMenu } from "./LockMenu";
import { MenuBar } from "./MenuBar";
import { TaskManager } from "./TaskManager";

// The macOS layout: Home is a desktop with widgets and a Dock, and All Apps is a Launchpad-style grid.
export const MacHome = ({ env }: { env: HomeEnvironment }) => {
  const { t } = useTranslation();
  const settings = useStore(env.settings);
  const { page, active, appsEndOffset, draft, scroll, editingDock } = useStore(env.state);
  const { apps, inputs, ready } = useStore(env.inventory);
  const conversation = useStore(env.moments.conversation);
  const fireplace = env.runtime.config.FIREPLACE_ID;
  const home = draft || (settings.homeInitialized ? settings.home : [fireplace]);
  const dockApps = home.filter((id) => id === fireplace || !ready || apps.some((app) => app.id === id));
  const onDesktop = page === "home";
  const atAppsEnd = !onDesktop && scroll === appsEndOffset;
  useLayoutEffect(() => {
    env.bridge.focus();
  }, [env, page, apps, inputs, ready, settings.home, settings.homeInitialized, draft, conversation]);
  return (
    <>
      <div class="launchpad-scrim" aria-hidden="true" hidden={onDesktop} />
      <MenuBar env={env} />
      {onDesktop ? <DesktopWidgets env={env} /> : null}
      <div
        class={"content-viewport" + (scroll > 0 ? " is-scrolled" : "") + (atAppsEnd ? " is-at-apps-end" : "")}
        aria-hidden={!active}
      >
        <div class="content-mask">
          <main
            id="rows"
            class={onDesktop ? "rows--desktop" : "rows--apps"}
            ref={env.rows}
            style={{ "--home-offset": -scroll + "px", "--apps-end-offset": appsEndOffset + "px" }}
          >
            <div class="home-page-surface" data-page={page}>
              {editingDock ? <p class="launchpad-hint">{t("dock.editHint")}</p> : null}
              <AppGrid
                env={env}
                ids={apps.map((app) => app.id)}
                apps={apps}
                settings={settings}
                page="apps"
                shown={!onDesktop}
                active={active}
                label={t("home.allApps")}
                checkedIds={editingDock ? settings.home : undefined}
              />
              <p id="apps-empty" class="apps-empty" hidden={onDesktop || apps.length > 0}>
                {t("home.emptyApps")}
              </p>
            </div>
            {!onDesktop && apps.length > 0 && (
              <HomeControl
                env={env}
                controlKey="back-to-top"
                className="back-to-top"
                title={t("home.backToTop")}
                preserveSelection
              >
                <Icon icon={ArrowUp} />
              </HomeControl>
            )}
          </main>
        </div>
      </div>
      <Dock env={env} ids={dockApps} apps={apps} inputs={inputs} shown={onDesktop} active={active} />
      <AppActionsMenu env={env} />
      <TaskManager env={env} />
      <LockMenu env={env} />
    </>
  );
};
