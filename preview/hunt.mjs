(()=>{
'use strict';
const $=s=>document.querySelector(s);
const $$=s=>[...document.querySelectorAll(s)];
const state={cards:[],index:0,language:'Kannada',region:''};
const storageKey='praani-hunt-fieldbook-v2';
const readSaved=()=>{try{const v=JSON.parse(localStorage.getItem(storageKey)||'[]');return Array.isArray(v)?v.filter(x=>x&&typeof x.id==='string').slice(0,100):[]}catch{return []}};
const writeSaved=items=>{try{localStorage.setItem(storageKey,JSON.stringify(items.slice(0,100)))}catch{}updateCount()};
const current=()=>state.cards[state.index]||null;
const text=(selector,value)=>{const el=$(selector);if(el)el.textContent=value};
function updateCount(){const n=readSaved().length;text('#fieldbook-count',n?'('+n+')':'')}
function setView(view,scroll=true){if(!['hunt','archive','fieldbook'].includes(view))view='hunt';document.body.dataset.view=view;$$('[data-view-tab]').forEach(b=>{if(b.dataset.viewTab===view)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current')});if(view==='fieldbook')renderFieldbook();if(scroll)window.scrollTo({top:0,behavior:'instant'})}
$$('[data-view-tab]').forEach(b=>b.addEventListener('click',()=>setView(b.dataset.viewTab)));
$$('[data-open-archive]').forEach(b=>b.addEventListener('click',()=>setView('archive')));
$$('[data-open-fieldbook]').forEach(b=>b.addEventListener('click',()=>setView('fieldbook')));
$$('[data-open-hunt]').forEach(b=>b.addEventListener('click',()=>setView('hunt')));
const photo=$('#hunt-photo'),fallback=$('#hunt-photo-fallback'),credit=$('#hunt-photo-credit');
function renderCard(){
 const c=current();if(!c)return;
 text('#hunt-progress',String(state.index+1).padStart(2,'0')+' / '+String(state.cards.length).padStart(2,'0'));
 $$('.hunt-bars span').forEach((bar,i)=>bar.classList.toggle('active',i===state.index));
 text('#hunt-animal',c.common||c.scientific);
 text('#hunt-scientific',c.scientific);
 text('#hunt-gap',c.hasLanguageName?'Another local name may still be missing':'No '+state.language+' name recorded in Praani');
 text('#hunt-question',c.hasLanguageName?'Does your family, village or community use a different '+state.language+' name for this animal?':'Have you heard a '+state.language+' name for this animal that people actually use?');
 $('#hunt-message').textContent='';
 $('#hunt-share').hidden=true;
 const saved=readSaved().some(x=>x.id===c.id&&x.language===state.language);
 $('#hunt-save').classList.toggle('saved',saved);
 text('#hunt-save',saved?'Saved to Fieldbook':'Save for later');
 photo.hidden=true;photo.removeAttribute('src');credit.hidden=true;fallback.hidden=false;
 if(c.media&&c.media.image&&c.media.source&&c.media.licenseUrl){
  const src=$('#hunt-source-link'),lic=$('#hunt-license-link');
  src.href=c.media.source;src.textContent=c.media.creator;
  lic.href=c.media.licenseUrl;lic.textContent=c.media.license;
  fallback.querySelector('small').textContent='LOADING RIGHTS-CLEARED PHOTOGRAPH';
  photo.onload=()=>{if(current()?.id!==c.id)return;photo.hidden=false;fallback.hidden=true;credit.hidden=false};
  photo.onerror=()=>{if(current()?.id!==c.id)return;photo.hidden=true;fallback.hidden=false;credit.hidden=true;fallback.querySelector('small').textContent='PHOTOGRAPH UNAVAILABLE · SPECIES ID VERIFIED'};
  photo.alt=c.common+' ('+c.scientific+'). Photo: '+c.media.creator;
  photo.src=c.media.image;
 }else{fallback.querySelector('small').textContent='NO VERIFIED IMAGE FOR THIS SPECIES'}
}
async function loadCards(){
 state.language=$('#hunt-language').value;
 text('#hunt-message','Loading the '+state.language+' name hunt…');
 ['#hunt-know','#hunt-ask','#hunt-save','#hunt-next'].forEach(s=>$(s).disabled=true);
 try{
  const r=await fetch('/api/hunt?language='+encodeURIComponent(state.language),{cache:'no-store'});
  if(!r.ok)throw Error('Name hunt unavailable');
  const data=await r.json();
  if($('#hunt-language').value!==state.language)return;
  if(!Array.isArray(data.cards)||!data.cards.length)throw Error('No featured species available');
  state.cards=data.cards;state.index=0;renderCard();
 }catch(e){state.cards=[];text('#hunt-animal','Name Hunt temporarily unavailable');text('#hunt-gap','Archive still available');text('#hunt-message',e.message)}
 finally{const enabled=state.cards.length>0;['#hunt-know','#hunt-ask','#hunt-save','#hunt-next'].forEach(s=>$(s).disabled=!enabled)}
}
$('#hunt-language').addEventListener('change',loadCards);
$('#hunt-region').addEventListener('change',()=>{state.region=$('#hunt-region').value});
$('#hunt-next').addEventListener('click',()=>{if(!state.cards.length)return;state.index=(state.index+1)%state.cards.length;renderCard()});
$('#hunt-know').addEventListener('click',()=>{
 const c=current();if(!c)return;
 setView('archive',false);
 const ok=window.PraaniUI?.selectSpeciesById?.(c.id,state.language,state.region);
 if(!ok){text('#hunt-message','Could not open this species. Search it in the original archive.');$('#contribute').scrollIntoView({behavior:'smooth'})}
});
function saveCurrent(status){
 const c=current();if(!c)return;
 const items=readSaved().filter(x=>!(x.id===c.id&&x.language===state.language));
 items.unshift({id:c.id,scientific:c.scientific,common:c.common||c.scientific,language:state.language,region:state.region,status,at:new Date().toISOString()});
 writeSaved(items);renderCard();
}
$('#hunt-save').addEventListener('click',()=>{const c=current();if(!c)return;saveCurrent('saved');text('#hunt-message','Saved to My Fieldbook on this device. No account needed.')});
$('#hunt-ask').addEventListener('click',()=>{
 const c=current();if(!c)return;
 saveCurrent('ask');
 const place=state.region?' in '+state.region:' where you live';
 const question='Do you know what people call the '+(c.common||c.scientific)+' ('+c.scientific+') in '+state.language+place+'? Please tell me the word in its original language, the place it is used and who uses it. I am helping document local wildlife names in Praani.';
 $('#hunt-share-text').value=question;$('#hunt-share').hidden=false;
 text('#hunt-message','Question prepared. Share it with someone who knows. Nothing was sent automatically.');
});
$('#hunt-copy').addEventListener('click',async()=>{
 const area=$('#hunt-share-text');try{await navigator.clipboard.writeText(area.value);text('#hunt-message','Question copied. Ask someone locally and return with their answer.')}catch{area.focus();area.select();text('#hunt-message','Select and copy the question to share it.')}
});
function renderFieldbook(){
 const root=$('#fieldbook-items');root.replaceChildren();
 const items=readSaved();$('#fieldbook-empty').hidden=items.length>0;
 for(const item of items){
  const card=document.createElement('article');card.className='fieldbook-card';
  const label=document.createElement('span');label.className='hunt-eyebrow';label.textContent=item.status==='ask'?'ASK SOMEONE':'SAVED FOR LATER';card.appendChild(label);
  const title=document.createElement('h3');title.textContent=item.common;card.appendChild(title);
  const details=document.createElement('p');details.textContent=item.scientific+' · '+item.language+(item.region?' · '+item.region:'');card.appendChild(details);
  const revisit=document.createElement('button');revisit.type='button';revisit.textContent='Continue this hunt →';revisit.onclick=async()=>{if($('#hunt-language').querySelector('option[value="'+item.language+'"]'))$('#hunt-language').value=item.language;else $('#hunt-language').value='Other';await loadCards();const index=state.cards.findIndex(c=>c.id===item.id);if(index>=0)state.index=index;renderCard();setView('hunt');$('#hunt-play').scrollIntoView({behavior:'smooth'})};card.appendChild(revisit);
  const remove=document.createElement('button');remove.type='button';remove.textContent='Remove';remove.onclick=()=>{writeSaved(readSaved().filter(x=>!(x.id===item.id&&x.language===item.language)));renderFieldbook()};card.appendChild(remove);
  root.appendChild(card);
 }
}
updateCount();
loadCards();
})();