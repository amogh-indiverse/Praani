import { readFileSync } from "node:fs";
import assert from "node:assert/strict";
import test from "node:test";
const source = readFileSync(new URL("../index.ts", import.meta.url), "utf8");
const buttons = [...source.matchAll(/<button\\b[^>]*>([^<]*)<\\/button>/g)].map(x=>x[1]);
test("all static button labels are ASCII", () => {
  assert.ok(buttons.length >= 6);
  for (const label of buttons) assert.match(label, /^[\\x00-\\x7F]*$/);
});
test("submission and confirmation buttons are visible and plain text", () => {
  assert.ok(source.includes('id="submit" class="primary" type="submit">Add this name</button>'));
  assert.ok(source.includes('id="success-another">Add another name</button>'));
  assert.ok(source.includes('<div id="details" class="details">'));
});
test("dynamic labels do not insert Unicode glyphs", () => {
  assert.ok(source.includes("button.textContent='Add this name'"));
  assert.ok(source.includes("mode==='dark'?'Light':'Dark'"));
  assert.ok(source.includes("'Vote'"));
});
test("catalogue parsing and Unicode decoding remain enabled", () => {
  assert.ok(source.includes("JSON.parse($('#species-json').textContent)"));
  assert.ok(source.includes("decodeEscapedUnicode"));
});
test("palette retains all three accent colours", () => {
  for (const color of ["#FF714B", "#D6A4E8", "#E8C77E"]) assert.ok(source.includes(color));
});
test("PostgreSQL schema and contribution API remain present", () => {
  assert.ok(source.includes("CREATE TABLE IF NOT EXISTS species_catalog"));
  assert.ok(source.includes('path==="/api/contribute"'));
});
