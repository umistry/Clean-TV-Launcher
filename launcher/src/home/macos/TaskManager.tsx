import { useLayoutEffect, useRef } from "preact/hooks";

import { useStore } from "../../shared/hooks/useStore";
import { useTranslation } from "../../shared/i18n/useTranslation";
import type { HomeEnvironment } from "../types";

import { TaskRow } from "./TaskRow";

export const TaskManager = ({ env }: { env: HomeEnvironment }) => {
  const { t } = useTranslation();
  const { taskPanel } = useStore(env.state);
  const tasks = useStore(env.stats.tasks);
  const stopping = useStore(env.stats.stopping);
  const list = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    list.current?.querySelector(".task-row.selected")?.scrollIntoView({ block: "nearest" });
  }, [taskPanel, tasks.length]);
  if (taskPanel === null) {
    return null;
  }
  const selected = Math.min(taskPanel, tasks.length - 1);
  return (
    <>
      <div class="task-manager__backdrop" aria-hidden="true" onClick={env.closeTasks} />
      <section class="task-manager" role="menu" aria-label={t("tasks.title")}>
        <h2 class="task-manager__title">{t("tasks.title")}</h2>
        {tasks.length ? (
          <div class="task-manager__list" ref={list}>
            {tasks.map((task, index) => (
              <TaskRow
                key={task.app.id}
                env={env}
                task={task}
                selected={index === selected}
                stopState={stopping[task.app.id]}
                onStop={() => {
                  void env.stats.stop(task);
                }}
              />
            ))}
          </div>
        ) : (
          <p class="task-manager__empty">{t("tasks.none")}</p>
        )}
        <p class="task-manager__hint">{t("tasks.hint")}</p>
      </section>
    </>
  );
};
