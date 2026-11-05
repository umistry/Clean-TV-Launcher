import type { MessageKey } from "../../shared/i18n/catalogues";

export type Mood = "great" | "okay" | "tired";
export const MOODS = [
  { mood: "great", key: "reply:great", label: "greeting.replyGreat" },
  { mood: "okay", key: "reply:okay", label: "greeting.replyOkay" },
  { mood: "tired", key: "reply:tired", label: "greeting.replyTired" },
] as const;
export const REPLY_KEYS: readonly string[] = MOODS.map(({ key }) => key);

const PARTS_OF_DAY = [
  { until: 5, salutation: "greeting.night", questions: ["greeting.askNight"] },
  { until: 12, salutation: "greeting.morning", questions: ["greeting.askFeeling", "greeting.askSlept"] },
  { until: 17, salutation: "greeting.afternoon", questions: ["greeting.askFeeling", "greeting.askDay"] },
  { until: 22, salutation: "greeting.evening", questions: ["greeting.askEvening", "greeting.askFeeling"] },
  { until: 24, salutation: "greeting.night", questions: ["greeting.askNight"] },
] as const;

// `turn` moves on each time the TV turns on, so the question isn't always the same.
export const greetingFor = (hour: number, turn: number): { question: MessageKey; salutation: MessageKey } => {
  const part = PARTS_OF_DAY.find(({ until }) => hour < until) || PARTS_OF_DAY[0];
  return { salutation: part.salutation, question: part.questions[turn % part.questions.length] };
};

const ANSWERS: Record<Mood, readonly MessageKey[]> = {
  great: ["greeting.answerGreat1", "greeting.answerGreat2"],
  okay: ["greeting.answerOkay1", "greeting.answerOkay2"],
  tired: ["greeting.answerTired1", "greeting.answerTired2"],
};
export const answerFor = (mood: Mood, turn: number) => ANSWERS[mood][turn % ANSWERS[mood].length];
