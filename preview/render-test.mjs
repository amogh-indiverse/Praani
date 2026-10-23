import assert from 'node:assert/strict';
import {mkdirSync} from 'node:fs';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const base=process.env.PRAANI_TEST_URL||'http://localhost:3000';
const browser=await chromium.launch({headless:true,channel:'chrome'});
const output=process.env.PRAANI_TEST_OUTPUT||'test-results';mkdirSync(output,{recursive:true});
try{
 const page=await browser.newPage({viewport:{width:1440,height:1000}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(base,{waitUntil:'networkidle'});
 assert.equal((await page.request.get(base+'/api/health').then(r=>r.json())).database,'connected');
 await page.locator('.mission-card').first().waitFor();assert.equal(await page.locator('.mission-card').count(),3);
 await page.screenshot({path:output+'/praani-desktop.png',fullPage:true});
 await page.locator('#mission-language').selectOption('Tulu');await page.waitForFunction(()=>document.querySelector('.mission-card p')?.textContent.includes('Tulu'));
 const missionName=await page.locator('.mission-card h3').first().textContent();await page.locator('.mission-card button').first().click();assert.equal(await page.locator('#species-search').inputValue(),missionName);assert.equal(await page.locator('#language').inputValue(),'Tulu');
 await page.locator('#species-search').fill('tiger');await page.locator('#results .result').first().waitFor();const matches=await page.locator('#results .result strong').allTextContents();assert.ok(matches.some(n=>/tiger/i.test(n)));assert.ok(matches.length<=10);
 await page.locator('#species-search').press('ArrowDown');assert.equal(await page.locator('#results [aria-selected=true]').count(),1);await page.locator('#species-search').press('Enter');assert.equal(await page.locator('#selected').isVisible(),true);
 await page.locator('#species-search').fill('Panthera tigris');await page.locator('#results .result').first().click();
 const unicode='ಪರೀಕ್ಷೆ ಹುಲಿ '+Date.now();await page.locator('#local-name').fill(unicode);await page.locator('#language').selectOption('Kannada');await page.locator('#region').fill('ಪರೀಕ್ಷೆ · Preview test');
 await page.locator('#submit').click();assert.equal(await page.locator('#success').isVisible(),false,'source required');
 await page.locator('#learned-from').selectOption('Used in my family or community');await page.locator('#context').fill('Automated sandbox test, not a real documented wildlife name. <script>alert(1)</script>');await page.locator('#submit').click();await page.locator('#success').waitFor({state:'visible'});assert.ok((await page.locator('#success-summary').textContent()).includes(unicode));await page.locator('#cards .card').first().waitFor();assert.ok((await page.locator('#cards').textContent()).includes(unicode));assert.equal(await page.locator('#cards script').count(),0);
 const entry={speciesId:await page.evaluate(()=>JSON.parse(document.querySelector('#species-json').textContent).find(s=>s.scientific==='Panthera tigris').id),type:'Mammal',localName:unicode,language:'Kannada',region:'ಪರೀಕ್ಷೆ · Preview test',learnedFrom:'Used in my family or community',context:'test'};
 assert.equal((await page.request.post(base+'/api/contribute',{data:entry,headers:{origin:base}})).status(),409);
 assert.equal((await page.request.post(base+'/api/contribute',{data:entry,headers:{origin:'https://example.org'}})).status(),403);
 assert.equal((await page.request.post(base+'/api/contribute',{data:{...entry,speciesId:'invalid'},headers:{origin:base}})).status(),400);
 await page.reload({waitUntil:'networkidle'});assert.ok((await page.locator('#cards').textContent()).includes(unicode),'submission survives reload');
 await page.locator('#species-search').fill('nothingmatches987');assert.ok((await page.locator('#results').textContent()).includes('No match'));await page.locator('#species-search').press('Escape');assert.equal(await page.locator('#results').isVisible(),false);
 for(const width of [320,390,768]){await page.setViewportSize({width,height:844});await page.goto(base,{waitUntil:'networkidle'});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'no horizontal overflow at '+width);assert.equal(await page.locator('#details').isVisible(),true);await page.locator('#species-search').fill('peacock');await page.locator('#results .result').first().waitFor();await page.locator('#results .result').first().click();assert.ok((await page.locator('#species-search').inputValue()).length>0);if(width===390){await page.goto(base,{waitUntil:'networkidle'});await page.screenshot({path:output+'/praani-mobile.png',fullPage:true})}}
 assert.deepEqual(errors,[]);console.log('PASS: missions, language choice, autocomplete, scientific/alias search, keyboard selection, Unicode round trip, required source, successful submission, duplicate and origin rejection, reload persistence, escaped content, mobile 320/390/768, no browser errors.');
}finally{await browser.close()}
