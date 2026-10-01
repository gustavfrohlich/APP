// Az alkalmazás adatmodellje. Ez a modul tiszta TypeScript: nincs benne React vagy böngésző-API.

/** 'YYYY-MM-DD' alakú, időzóna nélküli naptári nap. */
export type ISODate = string;

export type Location = 'budapest' | 'home_sk' | 'other';
export type BloatingWhen = 'none' | 'breakfast' | 'lunch' | 'dinner' | 'allday';
export type DietAdherence = 'yes' | 'partial' | 'no';
export type Exercise = 'none' | 'light' | 'moderate' | 'intense';
export type DeviceSource = 'manual' | 'import' | 'shortcut';
export type WeekResult = 'pass' | 'reaction' | 'unsure';

export interface DayEntry {
  /** Kulcs. Az éjszakai mezők az ébredés napjához tartoznak. */
  date: ISODate;
  // éjszaka (reggeli check-in)
  location?: Location;
  partnerStayed?: boolean;
  /** 1–10 */
  sleepQuality?: number;
  /** Az óra „Sleep” száma, az ébren töltött percekkel együtt. */
  sleepMin?: number;
  awakeMin?: number;
  deepMin?: number;
  remMin?: number;
  hrvNight?: number;
  rhrNight?: number;
  // nap (esti check-in), 0–10
  nose?: number;
  fatigue?: number;
  postMealFatigue?: number;
  bloating?: number;
  bloatingWhen?: BloatingWhen;
  diet?: DietAdherence;
  dietSlip?: string[];
  dietSlipNote?: string;
  caffeine?: number;
  alcohol?: number;
  exercise?: Exercise;
  stress?: number;
  rhrDay?: number;
  hrvDay?: number;
  tags?: string[];
  note?: string;
  morningDoneAt?: string;
  eveningDoneAt?: string;
  updatedAt: string;
  /** Az óraadatok (alvásidő … pulzus) forrása: kézi, fájlimport vagy okos beillesztés. */
  deviceSource?: DeviceSource;
}

export type PlanWeekKind = 'base' | 'test' | 'reserve' | 'washout';

export interface PlanWeek {
  week: number;
  food: string;
  eat: string;
  tip: string;
  kind?: PlanWeekKind;
  result?: WeekResult;
  resultNote?: string;
  closedAt?: string;
}

export interface SubjectiveBaseline {
  sleepQuality?: number;
  nose?: number;
  fatigue?: number;
  postMealFatigue?: number;
  bloating?: number;
}

export type ThemePref = 'light' | 'dark' | 'system';

export interface Settings {
  startDate: ISODate;
  subjectiveBaseline: SubjectiveBaseline;
  reminders: { morning: string; evening: string };
  theme: ThemePref;
  demo: boolean;
  schemaVersion: number;
  /** Az első indítás varázslója lefutott (vagy átugrották). */
  onboardedAt?: string;
  /** Saját címkék a beépítettek mellett. */
  customTags?: string[];
  /** Automatikus mentés állapota. */
  autosave?: { lastWrittenAt?: string; lastOfferedAt?: string; folderName?: string };
}

/** Az óra éjszakai exportjának egy sora (baseline). */
export interface BaselineNight {
  date: ISODate;
  sleepMin?: number;
  awakeMin?: number;
  remMin?: number;
  coreMin?: number;
  deepMin?: number;
  hrv?: number;
  rhr?: number;
  readinessSleepH?: number;
}

/** A nappali export egy sora (baseline). */
export interface BaselineDay {
  date: ISODate;
  rhrDay?: number;
  hrvDay?: number;
}

/** Az egész adatállomány (mentés, demó, export). */
export interface AppData {
  settings: Settings;
  plan: PlanWeek[];
  days: DayEntry[];
  baselineNights: BaselineNight[];
  baselineDays: BaselineDay[];
}
