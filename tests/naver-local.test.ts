import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { externalId, isMedical, toCandidate } from "../src/lib/naver-local.ts";

const item = {
  title: "<b>서울</b>맑은피부과의원",
  link: "https://example.com",
  category: "의료,건강>피부과",
  telephone: "02-123-4567",
  address: "서울특별시 강남구 역삼동 1",
  roadAddress: "서울특별시 강남구 테헤란로 1",
  mapx: "1270276000",
  mapy: "374979000",
};

describe("naver local search parsing", () => {
  it("strips markup and converts coordinates", () => {
    const c = toCandidate(item);
    assert.equal(c.name, "서울맑은피부과의원");
    assert.equal(c.lng, 127.0276);
    assert.equal(c.lat, 37.4979);
    assert.equal(c.road_address, item.roadAddress);
  });
  it("derives a stable id regardless of whitespace", () => {
    assert.equal(externalId("서울 맑은", "테헤란로 1", ""), externalId("서울맑은", "테헤란로  1", ""));
  });
  it("filters non-medical places", () => {
    assert.equal(isMedical(item), true);
    assert.equal(isMedical({ ...item, title: "맛있는 식당", category: "음식점>한식" }), false);
  });
});
