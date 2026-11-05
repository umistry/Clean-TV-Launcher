import { useStore } from "../../shared/hooks/useStore";
import { useClock } from "../../status/hooks/useClock";
import type { HomeEnvironment } from "../types";

export const ClockWidget = ({ env }: { env: HomeEnvironment }) => {
  const settings = useStore(env.settings);
  const { clock } = env.runtime;
  const value = useClock(env.status.time, clock, settings);
  return (
    <section class="widget widget--clock" hidden={!settings.showTime && settings.dateFormat === "none"}>
      <div class="widget-clock__date" hidden={settings.dateFormat === "none"}>
        {clock.formatDate(new Date(value.timestamp), "long")}
      </div>
      <div class="widget-clock__time" aria-label={value.text} hidden={!settings.showTime}>
        {value.hour}:{value.minute}
        {value.period ? <small>{value.period}</small> : null}
      </div>
    </section>
  );
};
