import type { HomeEnvironment } from "../types";

import { ClockWidget } from "./ClockWidget";
import { GreetingWidget } from "./GreetingWidget";
import { MemoryWidget } from "./MemoryWidget";

// Greeting on the far left, time on the far right and memory between them. Below this row stays empty.
export const DesktopWidgets = ({ env }: { env: HomeEnvironment }) => (
  <div class="desktop-widgets">
    <GreetingWidget env={env} />
    <MemoryWidget env={env} />
    <ClockWidget env={env} />
  </div>
);
