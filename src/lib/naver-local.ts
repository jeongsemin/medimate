// Parsing of the Naver Local Search API (openapi.naver.com/v1/search/local.json).
// Pure helpers only; the network call lives in the route handler.
import { createHash } from "node:crypto";

export type NaverLocalItem = {
  title: string;
  link: string;
  category: string;
  telephone: string;
  address: string;
  roadAddress: string;
  mapx: string; // longitude * 1e7
  mapy: string; // latitude * 1e7
};

export type HospitalCandidate = {
  external_id: string;
  name: string;
  category: string | null;
  address: string | null;
  road_address: string | null;
  phone: string | null;
  lat: number | null;
  lng: number | null;
  naver_link: string | null;
};

const stripTags = (s: string) =>
  s
    .replace(/<[^>]*>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .trim();

/** Naver has no stable place id in this API, so derive one from name + address. */
export function externalId(name: string, roadAddress: string, address: string): string {
  return createHash("sha1")
    .update(`${name}|${roadAddress || address}`.replace(/\s+/g, ""))
    .digest("hex");
}

function coord(raw: string, divisor: number): number | null {
  const n = Number(raw);
  return Number.isFinite(n) && n !== 0 ? n / divisor : null;
}

export function toCandidate(item: NaverLocalItem): HospitalCandidate {
  const name = stripTags(item.title);
  return {
    external_id: externalId(name, item.roadAddress, item.address),
    name,
    category: item.category || null,
    address: item.address || null,
    road_address: item.roadAddress || null,
    phone: item.telephone || null,
    lat: coord(item.mapy, 1e7),
    lng: coord(item.mapx, 1e7),
    naver_link: item.link || null,
  };
}

const MEDICAL = /(병원|의원|피부|성형|클리닉|한의원|치과|의료|메디컬|medical|clinic|hospital)/i;

/** Keep results that look like medical facilities. */
export function isMedical(item: NaverLocalItem): boolean {
  return MEDICAL.test(item.category) || MEDICAL.test(stripTags(item.title));
}
