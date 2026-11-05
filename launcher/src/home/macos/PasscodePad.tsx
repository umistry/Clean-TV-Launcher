import { Delete, X } from "lucide-preact";

import { useTranslation } from "../../shared/i18n/useTranslation";
import { Icon } from "../../shared/icons/Icon";
import type { HomeEnvironment } from "../types";

import type { PasscodePrompt } from "./createLocks";
import { PAD_KEYS } from "./createLocks";
import { PASSCODE_LENGTH } from "./passcode";

const DOTS = Array.from({ length: PASSCODE_LENGTH }, (_, index) => index);

export const PasscodePad = ({ env, prompt }: { env: HomeEnvironment; prompt: PasscodePrompt }) => {
  const { t } = useTranslation();
  const title = t(prompt.title, prompt.titleValues);
  return (
    <section class="passcode-pad" aria-label={title}>
      <h2 class="passcode-pad__title">{title}</h2>
      <div class="passcode-pad__dots" aria-hidden="true">
        {DOTS.map((dot) => (
          <span key={dot} class={"passcode-pad__dot" + (dot < prompt.digits ? " is-filled" : "")} />
        ))}
      </div>
      <p class="passcode-pad__notice" role="alert">
        {prompt.notice ? t(prompt.notice) : ""}
      </p>
      <div class="passcode-pad__keys" dir="ltr">
        {PAD_KEYS.map((key, index) => {
          if (key === "cancel" && prompt.cover) {
            return <span key={key} aria-hidden="true" />;
          }
          const label =
            key === "cancel" || key === "delete" ? t(key === "cancel" ? "lock.cancel" : "lock.delete") : key;
          return (
            <div
              key={key}
              class={"passcode-pad__key" + (prompt.key === index ? " focused" : "")}
              data-key={key}
              role="button"
              aria-label={label}
              onClick={() => env.locks.pressKey(index)}
            >
              {key === "cancel" ? <Icon icon={X} /> : null}
              {key === "delete" ? <Icon icon={Delete} /> : null}
              {key !== "cancel" && key !== "delete" ? key : null}
            </div>
          );
        })}
      </div>
    </section>
  );
};
