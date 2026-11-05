import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp } from "lucide-preact";

import { useStore } from "../../shared/hooks/useStore";
import { Icon } from "../../shared/icons/Icon";
import type { HomeEnvironment } from "../types";
const DIRECTION_ICONS = [
  { direction: "left", icon: ChevronLeft },
  { direction: "right", icon: ChevronRight },
  { direction: "up", icon: ChevronUp },
  { direction: "down", icon: ChevronDown },
] as const;
export const ReorderControls = ({ env, id }: { env: HomeEnvironment; id: string }) => {
  const { draft, page } = useStore(env.state);
  const settings = useStore(env.settings);
  const ids = draft || settings.home;
  const index = ids.indexOf(id);
  const columns = env.columns(settings);
  // The Dock is a single row, so apps only move sideways there.
  const twoAxes = !settings.macosLook || page !== "home";
  const allowed = {
    left: index > 0,
    right: index < ids.length - 1,
    up: twoAxes && index >= columns,
    down: twoAxes && index + columns < ids.length,
  };
  return (
    <>
      {DIRECTION_ICONS.filter(({ direction }) => allowed[direction]).map(({ direction, icon }) => (
        <div key={direction} class={"move-arrow " + direction} aria-hidden="true">
          <Icon icon={icon} color="#111" />
        </div>
      ))}
    </>
  );
};
