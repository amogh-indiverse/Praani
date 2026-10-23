(()=>{
'use strict';
const $=s=>document.querySelector(s);
const catalog=JSON.parse($('#species-json').textContent);
const langs=['Kannada','Hindi','Tamil','Telugu','Malayalam','Marathi','Bengali','Gujarati','Punjabi','Odia','Assamese','Konkani','Tulu','Kodava','Urdu','Sanskrit','Nepali','Manipuri','Bodo','Santali','Khasi','Mizo','Sindhi','Kashmiri','Dogri','Maithili','Ladakhi','Marwari','Rajasthani','Tibetan','Other'];
const state={selected:null,busy:false,active:-1,matches:[]};
const norm=x=>String(x||'').normalize('NFKC').toLocaleLowerCase('und').trim().replace(/\s+/gu,' ');
const clean=x=>String(x||'').trim();
const results=$('#simple-results'),search=$('#simple-search'),name=$('#simple-name'),form=$('#simple-form');
const msg=x=>{$('#simple-message').textContent=x};
for(const language of langs){const option=document.createElement('option');option.value=language;option.textContent=language;$('#simple-language').append(option)}
function view(which){
 document.body.dataset.view=which;
 $('#view-switch').textContent=which==='simple'?'Explore archive':'Back to homepage';
 window.scrollTo(0,0);
}
$('#view-switch').addEventListener('click',()=>view(document.body.dataset.view==='simple'?'archive':'simple'));
$('#home-logo').addEventListener('click',e=>{e.preventDefault();view('simple')});
const aotd=[
 {common:'Tiger',scientific:'Panthera tigris',native:'ಹುಲಿ',roman:'Huli',language:'Kannada',lang:'kn'},
 {common:'Indian peafowl',scientific:'Pavo cristatus',native:'ನವಿಲು',roman:'Navilu',language:'Kannada',lang:'kn'},
 {common:'Asian elephant',scientific:'Elephas maximus',native:'ಆನೆ',roman:'Aane',language:'Kannada',lang:'kn'}
];
const featured=aotd[Math.floor(Date.now()/86400000)%aotd.length];
$('#aotd-species').textContent=featured.common;
$('#aotd-scientific').textContent=featured.scientific;
$('#aotd-native').textContent=featured.native;
$('#aotd-native').lang=featured.lang;
$('#aotd-roman').textContent=featured.roman;
$('#aotd-language').textContent='IN '+featured.language.toUpperCase();
function findSpecies(q){
 const scored=[];
 for(const s of catalog){
  const primary=norm(s.common||s.scientific),scientific=norm(s.scientific),aliases=(Array.isArray(s.alternativeNames)?s.alternativeNames:[]).map(norm);
  let rank=99;
  if(primary===q)rank=0;
  else if(primary.startsWith(q))rank=1;
  else if(primary.split(' ').some(w=>w.startsWith(q)))rank=2;
  else if(scientific.startsWith(q))rank=3;
  else if(aliases.some(a=>a.startsWith(q)))rank=4;
  else if(primary.includes(q)||scientific.includes(q)||aliases.some(a=>a.includes(q)))rank=5;
  if(rank<99)scored.push({s,rank});
 }
 scored.sort((a,b)=>a.rank-b.rank||(a.s.common||a.s.scientific).localeCompare(b.s.common||b.s.scientific));
 return scored.slice(0,8).map(x=>x.s);
}
function hideResults(){results.hidden=true;search.setAttribute('aria-expanded','false');state.active=-1}
function renderResults(){
 const q=norm(search.value);
 results.replaceChildren();state.active=-1;
 if(!q){hideResults();return}
 state.matches=findSpecies(q);
 if(!state.matches.length){const p=document.createElement('p');p.className='quick-empty';p.textContent='No match found. Try the scientific name or use the full archive.';results.append(p)}
 for(let i=0;i<state.matches.length;i++){
  const s=state.matches[i];
  const button=document.createElement('button');button.type='button';button.className='quick-result';button.role='option';button.id='quick-result-'+i;button.setAttribute('aria-selected','false');
  const left=document.createElement('span');const strong=document.createElement('strong');strong.textContent=s.common||s.scientific;const small=document.createElement('small');small.textContent=s.scientific;left.append(strong,small);
  const right=document.createElement('span');right.className='quick-kind';right.textContent=s.type||'Wildlife';
  button.append(left,right);button.addEventListener('mousedown',e=>e.preventDefault());button.addEventListener('click',()=>choose(s));results.append(button);
 }
 results.hidden=false;search.setAttribute('aria-expanded','true');
}
function choose(s){
 state.selected=s;search.value=s.common||s.scientific;
 $('#simple-selected').textContent=(s.type||'Wildlife')+' · '+s.scientific;$('#simple-selected').hidden=false;
 hideResults();msg('');updateExtra();
 name.focus({preventScroll:true});
}
function updateExtra(){
 const ready=Boolean(state.selected&&clean(name.value).length>=2);
 $('#simple-extra').hidden=!ready;
}
search.addEventListener('input',()=>{state.selected=null;$('#simple-selected').hidden=true;$('#simple-extra').hidden=true;renderResults();msg('')});
search.addEventListener('focus',()=>{if(!state.selected&&clean(search.value))renderResults()});
search.addEventListener('blur',()=>setTimeout(hideResults,130));
search.addEventListener('keydown',e=>{
 if(e.key==='Escape'){hideResults();return}
 if(e.key==='ArrowDown'||e.key==='ArrowUp'){
  if(results.hidden||!state.matches.length)return;
  e.preventDefault();state.active=(state.active+(e.key==='ArrowDown'?1:-1)+state.matches.length)%state.matches.length;
  [...results.querySelectorAll('[role=option]')].forEach((b,i)=>b.setAttribute('aria-selected',String(i===state.active)));
 }else if(e.key==='Enter'&&!results.hidden&&state.matches.length){e.preventDefault();choose(state.matches[state.active>=0?state.active:0])}
});
name.addEventListener('input',()=>{updateExtra();msg('')});
$('#aotd-add').addEventListener('click',()=>{
 const s=catalog.find(s=>s.scientific===featured.scientific);
 if(s){choose(s);$('#simple-language').value=featured.language}
 document.querySelector('#quick-add').scrollIntoView({behavior:'smooth',block:'start'});
});
function resetForm(){
 form.reset();state.selected=null;search.value='';name.value='';$('#simple-selected').hidden=true;$('#simple-extra').hidden=true;hideResults();msg('');
 $('#simple-success').hidden=true;form.hidden=false;state.busy=false;$('#simple-submit').disabled=false;
}
form.addEventListener('submit',async e=>{
 e.preventDefault();if(state.busy)return;
 if(!state.selected){msg('Select an animal from the suggestions first.');search.focus();return}
 if(clean(name.value).length<2){msg('Enter the local name people use.');name.focus();return}
 updateExtra();
 const language=$('#simple-language'),source=$('#simple-source');
 if(!language.value){msg('Choose the language of the name.');language.focus();return}
 if(!source.value){msg('Tell us how you learned this name.');source.focus();return}
 const s=state.selected;
 const payload={speciesId:s.id,type:s.type,localName:clean(name.value),language:language.value,region:clean($('#simple-region').value),learnedFrom:source.value,context:clean($('#simple-context').value)};
 state.busy=true;$('#simple-submit').disabled=true;msg('Checking the archive…');
 try{
  const response=await fetch('/api/contribute',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(payload)});
  const data=await response.json().catch(()=>({}));
  if(!response.ok)throw Error(data.error||'Unable to save the name');
  form.hidden=true;$('#simple-success').hidden=false;
  $('#simple-success-text').textContent='“'+payload.localName+'” for '+(s.common||s.scientific)+' was received. This is a preview contribution awaiting review.';
  msg('');
 }catch(err){msg(err.message)}
 finally{state.busy=false;$('#simple-submit').disabled=false}
});
$('#simple-success-next').addEventListener('click',()=>{resetForm();search.focus()});
$('#quick-ask').addEventListener('click',()=>{
 const s=state.selected;
 const animal=s?(s.common||s.scientific)+' ('+s.scientific+')':'a bird, mammal or snake you know';
 $('#quick-ask-text').value='What do people in your village or family call '+animal+'? What language is the name in, and where is it used? I am helping document local wildlife names in Praani.';
 $('#quick-ask-panel').hidden=!$('#quick-ask-panel').hidden;
});
$('#quick-copy').addEventListener('click',async()=>{
 const el=$('#quick-ask-text');
 try{await navigator.clipboard.writeText(el.value);msg('Question copied. Nothing was sent automatically.')}
 catch{el.focus();el.select();msg('Select and copy the question to share it.')}
});
})();