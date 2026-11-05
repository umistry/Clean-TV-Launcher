import { useStore } from "../../shared/hooks/useStore";
import { useTranslation } from "../../shared/i18n/useTranslation";
import { useClock } from "../../status/hooks/useClock";
import { HomeControl } from "../components/HomeControl";
import type { HomeEnvironment } from "../types";

import { greetingFor, MOODS } from "./conversation";

export const GreetingWidget = ({ env }: { env: HomeEnvironment }) => {
  const { t } = useTranslation();
  const settings = useStore(env.settings);
  const { answer, back, turn } = useStore(env.moments.conversation);
  const { timestamp } = useClock(env.status.time, env.runtime.clock, settings);
  const trimmed = settings.greetingName.trim();
  const name = trimmed ? ", " + trimmed : "";
  const { salutation, question } = greetingFor(new Date(timestamp).getHours(), turn);
  const line = back ? t("greeting.welcomeBack", { app: back, name }) : t(answer || question);
  return (
    <section class="widget widget--greeting" hidden={!settings.greetingEnabled}>
      <h2 class="widget-greeting__salutation">{t(salutation, { name })}</h2>
      <p class="widget-greeting__line">{line}</p>
      {!back && !answer ? (
        <div class="widget-greeting__replies">
          {MOODS.map(({ key, label }) => (
            <HomeControl key={key} env={env} controlKey={key} className="widget-greeting__reply" title={t(label)}>
              {t(label)}
            </HomeControl>
          ))}
        </div>
      ) : null}
    </section>
  );
};
