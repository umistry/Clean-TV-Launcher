import { useStore } from "../../shared/hooks/useStore";
import { useTranslation } from "../../shared/i18n/useTranslation";
import type { HomeEnvironment } from "../types";

// The menu behind the lock icon in the menu bar.
export const LockMenu = ({ env }: { env: HomeEnvironment }) => {
  const { t } = useTranslation();
  const selected = useStore(env.locks.menu);
  useStore(env.settings);
  if (selected === null) {
    return null;
  }
  return (
    <>
      <div class="task-manager__backdrop" aria-hidden="true" onClick={env.locks.closeMenu} />
      <section class="lock-menu" role="menu" aria-label={t("lock.menuTitle")}>
        <h2 class="lock-menu__title">{t("lock.menuTitle")}</h2>
        {env.locks.menuChoices().map((choice, index) => (
          <div
            key={choice.action}
            class={"lock-menu__row" + (index === selected ? " selected" : "")}
            data-action={choice.action}
            role="menuitem"
            aria-selected={index === selected}
            onClick={() => env.locks.chooseMenu(index)}
          >
            <span>{t(choice.label)}</span>
            {choice.on === undefined ? null : (
              <span class="lock-menu__value">{t(choice.on ? "common.on" : "common.off")}</span>
            )}
          </div>
        ))}
      </section>
    </>
  );
};
