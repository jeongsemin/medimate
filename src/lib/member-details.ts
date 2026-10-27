// ISO 3166-1 alpha-2 codes. Names come from Intl.DisplayNames in the viewer's language.
export const COUNTRY_CODES = (
  "AD AE AF AG AI AL AM AO AQ AR AS AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS BT BV BW BY BZ " +
  "CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ DE DJ DK DM DO DZ EC EE EG EH ER ES ET FI FJ FK FM FO FR " +
  "GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GS GT GU GW GY HK HM HN HR HT HU ID IE IL IM IN IO IQ IR IS IT JE JM JO JP " +
  "KE KG KH KI KM KN KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MF MG MH MK ML MM MN MO MP MQ MR MS MT MU " +
  "MV MW MX MY MZ NA NC NE NF NG NI NL NO NP NR NU NZ OM PA PE PF PG PH PK PL PM PN PR PS PT PW PY QA RE RO RS RU RW " +
  "SA SB SC SD SE SG SH SI SJ SK SL SM SN SO SR SS ST SV SX SY SZ TC TD TF TG TH TJ TK TL TM TN TO TR TT TV TW TZ " +
  "UA UG UM US UY UZ VA VC VE VG VI VN VU WF WS YE YT ZA ZM ZW"
).split(" ");

export const AGE_GROUPS = ["10s", "20s", "30s", "40s", "50s", "60plus"] as const;
export const GENDERS = ["female", "male", "other", "undisclosed"] as const;

export type AgeGroup = (typeof AGE_GROUPS)[number];
export type Gender = (typeof GENDERS)[number];

const COUNTRY_SET = new Set(COUNTRY_CODES);

export const isCountry = (v: unknown): v is string => typeof v === "string" && COUNTRY_SET.has(v);
export const isAgeGroup = (v: unknown): v is AgeGroup => (AGE_GROUPS as readonly unknown[]).includes(v);
export const isGender = (v: unknown): v is Gender => (GENDERS as readonly unknown[]).includes(v);

export type MemberDetails = { country: string | null; age_group: AgeGroup | null; gender: Gender | null };

/**
 * Reads the optional demographics fields. An empty value means "not provided" (null);
 * a value that isn't in the allowed set makes the whole input invalid (null result).
 */
export function parseMemberDetails(get: (key: string) => string | null): MemberDetails | null {
  const country = (get("country") ?? "").trim().toUpperCase();
  const age = (get("age_group") ?? "").trim();
  const gender = (get("gender") ?? "").trim();
  if (country && !isCountry(country)) return null;
  if (age && !isAgeGroup(age)) return null;
  if (gender && !isGender(gender)) return null;
  return { country: country || null, age_group: (age as AgeGroup) || null, gender: (gender as Gender) || null };
}
