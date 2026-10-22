import { readFileSync } from "node:fs";
import assert from "node:assert/strict";
import test from "node:test";
const source = readFileSync(new URL("../index.ts", import.meta.url), "utf8");
const buttons = [...source.matchAll(/<button\b[^>]*>([^<]*)<\/button>/g)].map(x=>x[1]);
test("all static button labels are ASCII", () => {
  assert.ok(buttons.length >= 6);
  for (const label of buttons) assert.match(label, /^[\x00-\x7F]*$/);
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

test("client JavaScript compiles without syntax errors", async () => {
  const { Script } = await import("node:vm");
  const match = source.match(/const CLIENT=String\.raw`([\s\S]*?)`;/);
  assert.ok(match, "Client script must be present");
  assert.doesNotThrow(() => new Script(match[1]));
});
test("one controlled suggestion list without competing browser datalist", () => {
  assert.ok(!source.includes('list="species-options"'));
  assert.ok(!source.includes('id="species-options"'));
  assert.ok(source.includes('id="results" class="results"'));
  assert.ok(source.includes('search.oninput=showResults'));
  assert.ok(source.includes('scored.slice(0,10)'));
});
test("autocomplete ranks relevant tiger names and excludes unrelated families", async () => {
  const { runInNewContext } = await import("node:vm");
  const start = source.indexOf("function findSpecies(q,items){");
  const end = source.indexOf("\nfunction showResults(){",start);
  assert.ok(start>=0&&end>start);
  const fn=runInNewContext(source.slice(start,end)+";findSpecies",{norm:x=>String(x||"").normalize("NFKC").toLowerCase().trim()});
  const items=[
    {common:"Bengal Tiger",scientific:"Panthera tigris",family:"Felidae",alternativeNames:["Royal Bengal Tiger"]},
    {common:"Tiger Shark",scientific:"Galeocerdo cuvier",family:"Carcharhinidae",alternativeNames:[]},
    {common:"Unrelated Bird",scientific:"Randomus birdus",family:"Tigeridae",alternativeNames:[]}
  ];
  const results=fn("tiger",items);
  assert.equal(results[0].common,"Tiger Shark");
  assert.equal(results[1].common,"Bengal Tiger");
  assert.equal(results.length,2);
});
test("autocomplete finds common, scientific and alternative names from first character", async () => {
  const { runInNewContext } = await import("node:vm");
  const start = source.indexOf("function findSpecies(q,items){");
  const end = source.indexOf("\nfunction showResults(){", start);
  assert.ok(start >= 0 && end > start);
  const code = source.slice(start,end);
  const findSpecies = runInNewContext(code + "; findSpecies", {
    norm: x => String(x || "").normalize("NFKC").toLowerCase().trim()
  });
  const data = [
    {common:"Bengal Tiger",scientific:"Panthera tigris",family:"Felidae",alternativeNames:["Royal Bengal Tiger"]},
    {common:"Indian Peafowl",scientific:"Pavo cristatus",family:"Phasianidae",alternativeNames:["Peacock"]}
  ];
  assert.equal(findSpecies("b",data)[0].common,"Bengal Tiger");
  assert.equal(findSpecies("panthera",data)[0].common,"Bengal Tiger");
  assert.equal(findSpecies("peacock",data)[0].common,"Indian Peafowl");
  assert.equal(findSpecies("nonesuch",data).length,0);
});

test("Live Render title and health diagnostic", async () => {
  const response=await fetch("https://praani-web.onrender.com/");
  const html=await response.text();
  const title=html.split("<title>")[1]?.split("</title>")[0];
  console.log("LIVE_TITLE",title,"HTML_BYTES",html.length);
  assert.ok(response.ok);
});

test("server template decoder removes literal Unicode escape sequences", async () => {
  const { runInNewContext } = await import("node:vm");
  const start=source.indexOf("const decodeStaticUnicode=");
  const end=source.indexOf(";\nBun.serve",start);
  assert.ok(start>=0 && end>start);
  const fn=runInNewContext(source.slice(start,end)+";decodeStaticUnicode");
  assert.equal(fn(String.raw`Praani \\u2014 wildlife`),"Praani — wildlife");
  assert.equal(fn(String.raw`Bird \\u2022 Snake`),"Bird • Snake");
});
test("all static pages decode Unicode before serving", () => {
  for(const value of ["decodeStaticUnicode(HTML)","decodeStaticUnicode(CSS)","decodeStaticUnicode(CLIENT)","decodeStaticUnicode(ADMIN_HTML)"])assert.ok(source.includes(value),value);
  assert.ok(source.includes('decodeStaticUnicode(HTML).replace("__PRAANI_SPECIES_JSON__",json)'));
});
test("cohesive editorial stylesheet and mobile layout", () => {
  const css=source.split("const CSS=String.raw`")[1]?.split("`;\nconst CLIENT=")[0];
  assert.ok(css && css.length>6000);
  assert.ok(css.includes("@media(max-width:720px)"));
  assert.ok(!css.includes("::first-letter"));
  for(const color of ["#FF714B","#D6A4E8","#E8C77E"])assert.ok(css.includes(color));
});

test("corrupted snake common names are rejected, genuine names preserved",async()=>{
 const {runInNewContext}=await import("node:vm");
 const start=source.indexOf("const safeSnakeName=x=>");
 const end=source.indexOf(";\nconst getCatalog",start);
 assert.ok(start>=0&&end>start,"snake sanitization function");
 const fn=runInNewContext(source.slice(start+"const safeSnakeName=".length,end));
 assert.equal(fn("King Cobra"),"King Cobra");
 assert.equal(fn("Indian Rock Python"),"Indian Rock Python");
 assert.equal(fn("English common name not availableG: ZügelnatterChinese: 南峰锦蛇 SynonymSpilotes hodgsonii GÜNTHER 1860: 156Compsosoma hodgsonii"),null);
 assert.equal(fn("A very long unstructured "+ "Synonym".repeat(50)),null);
});
test("server templates have Unicode decoding before response",()=>{
 assert.ok(source.includes("decodeStaticUnicode(HTML)"));
 assert.ok(source.includes("decodeStaticUnicode(CLIENT)"));
 assert.ok(source.includes("decodeStaticUnicode(ADMIN_HTML)"));
});
