import { useTextInput } from "../../shared/hooks/useTextInput";
import { useTranslation } from "../../shared/i18n/useTranslation";
import { ChoiceGroup } from "../components/ChoiceGroup";
import { SettingsControl } from "../components/SettingsControl";
import { SettingsSection } from "../components/SettingsSection";
import type { SettingsSectionProps } from "../types";

// Glass and Classic keep their original true and false values, which are also their remote keys.
const APPEARANCE_OPTIONS = [
  { value: "macos", labelKey: "appearance.macos" },
  { value: true, labelKey: "appearance.glass" },
  { value: false, labelKey: "appearance.classic" },
] as const;

const ON_OFF_OPTIONS = [
  { value: true, labelKey: "common.on" },
  { value: false, labelKey: "common.off" },
] as const;

const HOME_CARD_MODE_OPTIONS = [
  { value: "square", labelKey: "appearance.square" },
  { value: "rectangle", labelKey: "appearance.rectangle" },
] as const;

const HOME_CARD_COLUMNS_OPTIONS = [
  { value: "auto", labelKey: "appearance.followSize" },
  { value: "3", label: "3" },
  { value: "4", label: "4" },
  { value: "5", label: "5" },
] as const;

const CARD_SIZE_OPTIONS = [
  { value: "big", labelKey: "appearance.big" },
  { value: "small", labelKey: "appearance.small" },
] as const;

export const AppearanceSettings = ({ settings, actions }: SettingsSectionProps) => {
  const { t } = useTranslation();
  const { focus, ...nameInput } = useTextInput(settings.greetingName, actions.setGreetingName);
  return (
    <>
      <SettingsSection title={t("appearance.title")}>
        <ChoiceGroup
          id="settings-appearance"
          label={t("appearance.title")}
          value={settings.macosLook ? "macos" : settings.glassSettings === true}
          options={APPEARANCE_OPTIONS}
          onSelect={actions.setAppearance}
        />
      </SettingsSection>
      <SettingsSection title={t("greeting.settings")} hidden={!settings.macosLook}>
        <SettingsControl class="pill unit name-pill" focusKey="name:greeting" onClick={focus}>
          <span class="port">{t("greeting.nameLabel")}</span>
          <input
            {...nameInput}
            type="text"
            maxLength={24}
            placeholder={t("greeting.namePlaceholder")}
            aria-label={t("greeting.nameLabel")}
          />
        </SettingsControl>
        <ChoiceGroup
          id="greeting-enabled"
          label={t("greeting.show")}
          value={settings.greetingEnabled}
          options={ON_OFF_OPTIONS}
          onSelect={actions.setGreetingEnabled}
        />
      </SettingsSection>
      <SettingsSection title={t("appearance.cards")} hidden={settings.macosLook}>
        <ChoiceGroup
          id="home-card-mode"
          label={t("appearance.tileLayout")}
          value={settings.homeCardMode}
          options={HOME_CARD_MODE_OPTIONS}
          onSelect={actions.setHomeCardMode}
        />
        <ChoiceGroup
          id="home-card-columns"
          label={t("appearance.columns")}
          value={String(settings.homeCardColumns || "auto")}
          options={HOME_CARD_COLUMNS_OPTIONS}
          onSelect={(value) => actions.setHomeCardColumns(value === "auto" ? null : Number(value))}
        />
        {!settings.homeCardColumns ? (
          <ChoiceGroup
            id="card-sizes"
            label={t("appearance.cardSize")}
            value={settings.cardSize || "big"}
            options={CARD_SIZE_OPTIONS}
            onSelect={actions.setCardSize}
          />
        ) : null}
      </SettingsSection>
    </>
  );
};
