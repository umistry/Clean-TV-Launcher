import { useTranslation } from "../../shared/i18n/useTranslation";
import { AppArtwork } from "../components/AppArtwork";
import type { HomeEnvironment } from "../types";

import type { StopState } from "./createSystemStats";
import type { RunningTask } from "./tasks";

const STOP_LABELS = {
  stopping: "tasks.stopping",
  refused: "tasks.refused",
} as const satisfies Record<StopState, string>;

export const TaskRow = ({
  env,
  task,
  selected,
  stopState,
  onStop,
}: {
  env: HomeEnvironment;
  task: RunningTask;
  selected: boolean;
  stopState?: StopState;
  onStop(): void;
}) => {
  const { t } = useTranslation();
  const brand = env.describe(task.app);
  return (
    <div class={"task-row" + (selected ? " selected" : "")} role="menuitem" aria-selected={selected} onClick={onStop}>
      <span class="task-row__icon" style={{ "--app-background": brand.background }}>
        <AppArtwork app={task.app} brand={brand} active />
      </span>
      <span class="task-row__name">{brand.title}</span>
      <span class={"task-row__action" + (stopState ? " task-row__action--" + stopState : "")}>
        {t(stopState ? STOP_LABELS[stopState] : "tasks.forceStop")}
      </span>
    </div>
  );
};
