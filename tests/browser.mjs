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
 await page.route("**/api/**",r=>r.fulfill({status:200,contentType:"application/json",body:JSON.stringify({cards:[],hasMore:false,total:samples.length})}));
 let html=extract("HTML").replace("__PRAANI_SPECIES_JSON__",JSON.stringify(samples)).replace(/<script defer src="\/app\.js[^"]*"><\/script>/,"").replace(/<link rel="stylesheet" href="\/style\.css[^"]*">/,"");
 await page.setContent(html,{waitUntil:"domcontentloaded"});
 await page.addStyleTag({content:extract("CSS")});
 await page.addScriptTag({content:extract("CLIENT")});
 assert.deepEqual(errors,[],"Browser JS errors: "+errors.join("; "));
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
 await page.screenshot({path:"test-results/mobile.png",fullPage:true});
 await page.close();
 const live=await browser.newPage({viewport:{width:390,height:844}});
 const liveErrors=[];live.on("pageerror",e=>liveErrors.push(e.message));
 const response=await live.goto("https://praani-web.onrender.com/?e2e="+Date.now(),{waitUntil:"domcontentloaded",timeout:120000});
 console.log("LIVE status",response?.status());
 const embedded=await live.locator("#species-json").textContent();
 let species=[];try{species=JSON.parse(embedded)}catch(e){console.log("LIVE species parse failed",e.message)}
 console.log("LIVE catalogue",species.length,"sample",JSON.stringify(species.filter(s=>/tiger/i.test((s.common||"")+" "+(s.scientific||""))).slice(0,6).map(s=>({common:s.common,scientific:s.scientific}))));
 await live.locator("#species-search").fill("tiger");
 await live.waitForTimeout(250);
 const liveSuggestions=await live.locator("#results .result strong").allTextContents();
 console.log("LIVE suggestions",JSON.stringify(liveSuggestions.slice(0,10)));
 console.log("LIVE errors",JSON.stringify(liveErrors));
 await live.screenshot({path:"test-results/live-mobile.png",fullPage:true});
 assert.ok(species.length>1000,"Live species JSON unexpectedly empty");
 assert.ok(liveSuggestions.some(s=>/tiger/i.test(s)),"Live autocomplete missing tiger");
 assert.ok(liveSuggestions.every(s=>!s.includes(String.fromCharCode(92)+"u")),"Live autocomplete contains Unicode escapes");
 assert.deepEqual(liveErrors,[],"Live JavaScript errors");
 console.log("BROWSER E2E PASS");
}finally{await browser.close()}
