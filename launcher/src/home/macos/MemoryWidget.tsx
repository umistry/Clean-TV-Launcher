import { useStore } from "../../shared/hooks/useStore";
import { useTranslation } from "../../shared/i18n/useTranslation";
import type { HomeEnvironment } from "../types";

const HIGH_MEMORY_PERCENT = 90;

export const MemoryWidget = ({ env }: { env: HomeEnvironment }) => {
  const { t } = useTranslation();
  const memory = useStore(env.stats.memory);
  if (!memory) {
    return <div />;
  }
  const high = memory.percent >= HIGH_MEMORY_PERCENT;
  return (
    <section class={"widget widget--memory" + (high ? " is-high" : "")}>
      <div class="widget-memory__head">
        <span class="widget__label">{t("memory.title")}</span>
        <span class="widget-memory__percent">{memory.percent}%</span>
      </div>
      <div class="widget-memory__track">
        <div class="widget-memory__fill" style={{ width: memory.percent + "%" }} />
      </div>
      <p class="widget-memory__detail">{t("memory.usage", { used: memory.usedGb, total: memory.totalGb })}</p>
    </section>
  );
};
