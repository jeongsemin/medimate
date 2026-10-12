import "server-only";
import type { Locale } from "./config";
import type en from "./dictionaries/en.json";

export type Dictionary = typeof en;

const dictionaries: Record<Locale, () => Promise<Dictionary>> = {
  en: () => import("./dictionaries/en.json").then((m) => m.default),
  ja: () => import("./dictionaries/ja.json").then((m) => m.default),
  zh: () => import("./dictionaries/zh.json").then((m) => m.default),
  ko: () => import("./dictionaries/ko.json").then((m) => m.default),
};

export const getDictionary = (locale: Locale) => dictionaries[locale]();
