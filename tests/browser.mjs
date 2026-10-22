import { readFileSync, mkdirSync } from "node:fs";
import { chromium } from "playwright";
import assert from "node:assert/strict";
const source=readFileSync(new URL("../index.ts",import.meta.url),"utf8");
function extract(label){
 const start=source.indexOf("const "+label+"=String.raw"+String.fromCharCode(96));
 assert.ok(start>=0,label+" missing");
 const from=start+("const "+label+"=String.raw"+String.fromCharCode(96)).length;
 const to=source.indexOf(String.fromCharCode(96)+";",from);
 assert.ok(to>from,label+" terminator missing");
 return source.slice(from,to);
}
const { runInNewContext }=await import("node:vm");
const decoderStart=source.indexOf("const decodeStaticUnicode=");
const decoderEnd=source.indexOf(";\nBun.serve",decoderStart);
assert.ok(decoderStart>=0&&decoderEnd>decoderStart,"Template decoder missing");
const decodeStaticUnicode=runInNewContext(source.slice(decoderStart,decoderEnd)+";decodeStaticUnicode");
const browser=await chromium.launch({headless:true});
const samples=[
 {id:"tiger",type:"Mammal",common:"Bengal Tiger",scientific:"Panthera tigris tigris",family:"Felidae",alternativeNames:["Royal Bengal Tiger"]},
 {id:"shark",type:"Fish",common:"Tiger Shark",scientific:"Galeocerdo cuvier",family:"Carcharhinidae",alternativeNames:[]},
 {id:"bird",type:"Bird",common:"Indian Peafowl",scientific:"Pavo cristatus",family:"Phasianidae",alternativeNames:["Peacock"]},
 {id:"unicode",type:"Mammal",common:"Snow "+String.fromCharCode(92)+"u004ceopard",scientific:"Panthera uncia",family:"Felidae",alternativeNames:[]}
];
mkdirSync("test-results",{recursive:true});
try{
 const page=await browser.newPage({viewport:{width:390,height:844}});
 const errors=[];page.on("pageerror",e=>errors.push(e.message));
 const html=decodeStaticUnicode(extract("HTML")).replace("__PRAANI_SPECIES_JSON__",JSON.stringify(samples));
 await page.route("https://praani.test/**",route=>{
   const url=new URL(route.request().url());
   if(url.pathname==="/style.css")return route.fulfill({status:200,contentType:"text/css",body:decodeStaticUnicode(extract("CSS"))});
   if(url.pathname==="/app.js")return route.fulfill({status:200,contentType:"application/javascript",body:decodeStaticUnicode(extract("CLIENT"))});
   if(url.pathname.startsWith("/api/"))return route.fulfill({status:200,contentType:"application/json",body:JSON.stringify(route.request().method()==="POST"?{ok:true}:{cards:[],hasMore:false,total:samples.length})});
   return route.fulfill({status:200,contentType:"text/html",body:html});
 });
 await page.goto("https://praani.test/",{waitUntil:"domcontentloaded"});
 assert.deepEqual(errors,[],"Browser JS errors: "+errors.join("; "));
 assert.ok(!await page.locator("h1").innerText().then(x=>x.includes(String.fromCharCode(92)+"u")),"Title must not show Unicode escape sequences");
 assert.equal(await page.locator("#details").isVisible(),true,"Contribution form must be visible");
 await page.locator("#species-search").fill("tiger");
 await page.waitForTimeout(150);
 const suggestions=await page.locator("#results .result strong").allTextContents();
 console.log("MOCK tiger suggestions",JSON.stringify(suggestions));
 assert.ok(suggestions.includes("Bengal Tiger"),"Bengal Tiger missing");
 assert.ok(suggestions.includes("Tiger Shark"),"Tiger Shark missing");
 assert.ok(suggestions.every(x=>!x.includes(String.fromCharCode(92)+"u")),"Escaped Unicode in suggestions");
 await page.locator("#results .result").filter({hasText:"Bengal Tiger"}).first().click();
 assert.equal(await page.locator("#selected").isVisible(),true,"Species selection missing");
 await page.locator("#species-search").fill("Snow");
 await page.waitForTimeout(100);
 const escaped=await page.locator("#results .result strong").allTextContents();
 console.log("MOCK Unicode suggestions",JSON.stringify(escaped));
 assert.ok(escaped.includes("Snow Leopard"),"Escaped Unicode not decoded");
 await page.locator("#results .result").filter({hasText:"Snow Leopard"}).first().click();
 await page.locator("#local-name").fill("Him Tendua");
 await page.locator("#language").selectOption("Hindi");
 await page.locator("#region").fill("Himalaya");
 await page.locator("#submit").click();
 await page.locator("#success").waitFor({state:"visible",timeout:5000});
 assert.ok((await page.locator("#success-summary").innerText()).includes("Him Tendua"),"Success confirmation missing submitted name");
 const previousTheme=await page.locator("html").getAttribute("data-theme");
 await page.locator("#theme").click();
 assert.notEqual(await page.locator("html").getAttribute("data-theme"),previousTheme,"Theme toggle failed");
 await page.locator("#theme").click();
 assert.equal(await page.locator("html").getAttribute("data-theme"),previousTheme,"Theme reset failed");
 assert.ok(!((await page.locator("body").innerText()).includes(String.fromCharCode(92)+"u")),"Visible page contains escaped Unicode");
 await page.screenshot({path:"test-results/mobile.png",fullPage:true});
 await page.close();
 if(process.env.PRAANI_LIVE_TEST==="1"){
 const live=await browser.newPage({viewport:{width:390,height:844}});
 const liveErrors=[];live.on("pageerror",e=>liveErrors.push(e.message));
 const response=await live.goto("https://praani-web.onrender.com/?e2e="+Date.now(),{waitUntil:"domcontentloaded",timeout:120000});
 console.log("LIVE status",response?.status());
 const embedded=await live.locator("#species-json").textContent();
 let species=[];try{species=JSON.parse(embedded)}catch(e){console.log("LIVE species parse failed",e.message)}
 console.log("LIVE catalogue",species.length,"sample",JSON.stringify(species.filter(s=>/tiger/i.test((s.common||"")+" "+(s.scientific||""))).slice(0,6).map(s=>({common:s.common,scientific:s.scientific}))));
 console.log("LIVE JS STATUS",await live.evaluate(()=>({handler:typeof document.querySelector("#species-search").oninput,expanded:document.querySelector("#species-search").getAttribute("aria-expanded"),script:document.querySelector('script[src^="/app.js"]')?.src,release:document.querySelector('meta[name="praani-release"]')?.content})));
 await live.locator("#species-search").fill("tiger");
 await live.waitForTimeout(250);
 const liveSuggestions=await live.locator("#results .result strong").allTextContents();
 console.log("LIVE suggestions",JSON.stringify(liveSuggestions.slice(0,10)),"expanded",await live.locator("#species-search").getAttribute("aria-expanded"),"results",await live.locator("#results").innerText());
 console.log("LIVE errors",JSON.stringify(liveErrors));
 await live.screenshot({path:"test-results/live-mobile.png",fullPage:true});
 assert.ok(species.length>1000,"Live species JSON unexpectedly empty");
 assert.ok(liveSuggestions.some(s=>/tiger/i.test(s)),"Live autocomplete missing tiger");
 assert.ok(liveSuggestions.every(s=>!s.includes(String.fromCharCode(92)+"u")),"Live autocomplete contains Unicode escapes");
 assert.deepEqual(liveErrors,[],"Live JavaScript errors");
 }
 console.log("BROWSER E2E PASS");
}finally{await browser.close()}
