import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { clinicDescription, languageAlternates, pageMetadata, siteUrl } from "../src/lib/seo.ts";

describe("languageAlternates", () => {
  it("lists every locale with BCP-47 codes plus x-default", () => {
    assert.deepEqual(languageAlternates("/search"), {
      en: "/en/search",
      ja: "/ja/search",
      "zh-CN": "/zh/search",
      ko: "/ko/search",
      "x-default": "/en/search",
    });
  });
  it("works for the locale root", () => {
    assert.equal(languageAlternates().ko, "/ko");
  });
});

describe("pageMetadata", () => {
  it("builds canonical, alternates and Open Graph for the current locale", () => {
    const m = pageMetadata({ lang: "ja", path: "/search", title: "検索", description: "説明" });
    assert.equal(m.title, "検索");
    assert.equal(m.alternates?.canonical, "/ja/search");
    assert.equal((m.openGraph as { locale: string }).locale, "ja_JP");
    assert.deepEqual((m.openGraph as { alternateLocale: string[] }).alternateLocale.sort(), ["en_US", "ko_KR", "zh_CN"]);
    assert.equal((m.openGraph as { title: string }).title, "検索 | MediMate");
    assert.equal(m.robots, undefined);
  });
  it("omits title and description fields when not given", () => {
    const m = pageMetadata({ lang: "en" });
    assert.equal("title" in m, false);
    assert.equal("description" in m, false);
    assert.equal("title" in (m.openGraph as object), false);
  });
  it("uses socialTitle for Open Graph when the page has no title of its own", () => {
    const m = pageMetadata({ lang: "ko", socialTitle: "MediMate – 홈" });
    assert.equal("title" in m, false);
    assert.equal((m.openGraph as { title: string }).title, "MediMate – 홈");
    assert.equal((m.twitter as { title: string }).title, "MediMate – 홈");
  });
  it("marks private pages noindex, optionally following links", () => {
    assert.deepEqual(pageMetadata({ lang: "en", noindex: true }).robots, { index: false, follow: false });
    assert.deepEqual(pageMetadata({ lang: "en", noindex: true, follow: true }).robots, { index: false, follow: true });
  });
});

describe("clinicDescription", () => {
  it("adds the rating only when there are reviews", () => {
    assert.equal(clinicDescription({ name: "온유 피부과", address: "서울 강남구" }), "온유 피부과 – 서울 강남구");
    assert.equal(
      clinicDescription({ name: "온유 피부과", address: "서울 강남구", reviewCount: 3, avgRating: 4.75 }),
      "온유 피부과 – 서울 강남구 · ★4.8 (3)",
    );
    assert.equal(clinicDescription({ name: "X" }), "X");
  });
});

describe("siteUrl", () => {
  it("falls back to localhost and strips trailing slashes", () => {
    const old = process.env.NEXT_PUBLIC_SITE_URL;
    delete process.env.NEXT_PUBLIC_SITE_URL;
    assert.equal(siteUrl(), "http://localhost:3000");
    process.env.NEXT_PUBLIC_SITE_URL = "https://medimate.example///";
    assert.equal(siteUrl(), "https://medimate.example");
    if (old === undefined) delete process.env.NEXT_PUBLIC_SITE_URL;
    else process.env.NEXT_PUBLIC_SITE_URL = old;
  });
});
