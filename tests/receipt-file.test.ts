import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { MAX_RECEIPT_BYTES, isAcceptableSize, sniffImage } from "../src/lib/receipt-file.ts";

const bytes = (...b: number[]) => new Uint8Array(b);
const PNG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

describe("sniffImage", () => {
  it("recognises JPEG and PNG by their signatures", () => {
    assert.equal(sniffImage(bytes(0xff, 0xd8, 0xff, 0xe0, 0x00)), "jpg");
    assert.equal(sniffImage(bytes(0xff, 0xd8, 0xff)), "jpg"); // exactly the signature
    assert.equal(sniffImage(bytes(...PNG, 0x00, 0x00)), "png");
    assert.equal(sniffImage(bytes(...PNG)), "png"); // exactly the signature
  });
  it("rejects other formats, even when they look like images", () => {
    assert.equal(sniffImage(bytes(0x47, 0x49, 0x46, 0x38, 0x39, 0x61)), null); // GIF
    assert.equal(sniffImage(bytes(0x25, 0x50, 0x44, 0x46, 0x2d)), null); // PDF
    assert.equal(sniffImage(new TextEncoder().encode("<svg xmlns='http://www.w3.org/2000/svg'></svg>")), null);
    assert.equal(sniffImage(new TextEncoder().encode("<html><script>alert(1)</script></html>")), null);
  });
  it("rejects empty, truncated and near-miss signatures", () => {
    assert.equal(sniffImage(bytes()), null);
    assert.equal(sniffImage(bytes(0xff, 0xd8)), null);
    assert.equal(sniffImage(bytes(0x89, 0x50, 0x4e, 0x47)), null);
    assert.equal(sniffImage(bytes(...PNG.slice(0, 7), 0x0b)), null);
  });
  it("works on Node Buffers too, as the upload route passes them", () => {
    assert.equal(sniffImage(Buffer.from([0xff, 0xd8, 0xff, 0xdb])), "jpg");
  });
});

describe("isAcceptableSize", () => {
  it("accepts 1 byte up to the 10 MB limit", () => {
    assert.equal(isAcceptableSize(1), true);
    assert.equal(isAcceptableSize(MAX_RECEIPT_BYTES), true);
  });
  it("rejects empty and oversized files", () => {
    assert.equal(isAcceptableSize(0), false);
    assert.equal(isAcceptableSize(MAX_RECEIPT_BYTES + 1), false);
    assert.equal(isAcceptableSize(-5), false);
  });
});
