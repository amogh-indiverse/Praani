(()=>{
'use strict';
const $=s=>document.querySelector(s);
const state={cards:[],index:0,busy:false};
const species=()=>state.cards[state.index]||null;
const show=(selector,value)=>{const el=$(selector);if(el)el.hidden=!value};
const text=(selector,value)=>{const el=$(selector);if(el)el.textContent=value};

const languages=['Kannada','Hindi','Tamil','Telugu','Malayalam','Marathi','Bengali','Gujarati','Punjabi','Odia','Assamese','Konkani','Tulu','Kodava','Urdu','Sanskrit','Nepali','Manipuri','Bodo','Santali','Khasi','Mizo','Sindhi','Kashmiri','Dogri','Maithili','Ladakhi','Marwari','Rajasthani','Tibetan','Other'];
const select=$('#simple-language');
for(const lang of languages){const option=document.createElement('option');option.value=lang;option.textContent=lang;select.appendChild(option)}
function view(which){
 document.body.dataset.view=which;
 text('#view-switch',which==='simple'?'Explore archive':'Back to Name Hunt');
 if(which==='simple')window.scrollTo(0,0);
 else window.scrollTo(0,0);
}
$('#view-switch').addEventListener('click',()=>view(document.body.dataset.view==='simple'?'archive':'simple'));
$('#home-logo').addEventListener('click',e=>{e.preventDefault();view('simple')});
function reset(){
 show('#simple-actions',true);
 show('#simple-form',false);
 show('#simple-step-one',true);
 show('#simple-step-two',false);
 show('#simple-success',false);
 show('#simple-ask-panel',false);
 $('#simple-form').reset();
 text('#simple-message','');
 state.busy=false;
 $('#simple-submit').disabled=false;
}
function render(){
 const c=species();
 reset();
 if(!c)return;
 text('#simple-species',c.common||c.scientific);
 text('#simple-scientific',c.scientific);
 text('#simple-kind',(c.type||'WILDLIFE').toUpperCase());
 text('#simple-index',String(state.index+1).padStart(2,'0')+' / '+String(state.cards.length).padStart(2,'0'));
}
async function load(){
 $('#simple-know').disabled=true;
 try{
  const response=await fetch('/api/hunt?language=Kannada',{cache:'no-store'});
  if(!response.ok)throw Error('Could not load wildlife names');
  const data=await response.json();
  if(!Array.isArray(data.cards)||!data.cards.length)throw Error('No wildlife species available');
  state.cards=data.cards;
  state.index=0;
  render();
 }catch(err){text('#simple-species','Temporarily unavailable');text('#simple-message',err.message)}
 finally{$('#simple-know').disabled=false}
}
$('#simple-next').addEventListener('click',()=>{if(!state.cards.length)return;state.index=(state.index+1)%state.cards.length;render()});
$('#simple-know').addEventListener('click',()=>{
 if(!species())return;
 show('#simple-actions',false);show('#simple-ask-panel',false);
 show('#simple-form',true);show('#simple-step-one',true);show('#simple-step-two',false);
 $('#simple-name').focus();text('#simple-message','');
});
$('#simple-cancel').addEventListener('click',reset);
$('#simple-continue').addEventListener('click',()=>{
 const name=$('#simple-name');
 if(!name.value.trim()||!name.checkValidity()){name.reportValidity();return}
 show('#simple-step-one',false);show('#simple-step-two',true);
 text('#simple-name-review',name.value.trim());
 $('#simple-language').focus();
});
$('#simple-back').addEventListener('click',()=>{show('#simple-step-two',false);show('#simple-step-one',true);$('#simple-name').focus()});
$('#simple-form').addEventListener('submit',async e=>{
 e.preventDefault();
 if(state.busy||!species())return;
 const language=$('#simple-language'),source=$('#simple-source');
 if(!language.value){language.reportValidity();return}
 if(!source.value){source.reportValidity();return}
 const c=species();
 const name=$('#simple-name').value.trim();
 const entry={speciesId:c.id,type:c.type,localName:name,language:language.value,region:$('#simple-region').value.trim(),learnedFrom:source.value,context:$('#simple-context').value.trim()};
 state.busy=true;$('#simple-submit').disabled=true;text('#simple-message','Saving…');
 try{
  const response=await fetch('/api/contribute',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(entry)});
  const data=await response.json().catch(()=>({}));
  if(!response.ok)throw Error(data.error||'Could not save this name');
  show('#simple-form',false);show('#simple-success',true);
  text('#simple-success-text','“'+name+'” was received for '+(c.common||c.scientific)+'. This is a preview submission awaiting review.');
  text('#simple-message','');
 }catch(err){text('#simple-message',err.message)}
 finally{state.busy=false;$('#simple-submit').disabled=false}
});
$('#simple-success-next').addEventListener('click',()=>{if(!state.cards.length)return;state.index=(state.index+1)%state.cards.length;render()});
$('#simple-ask').addEventListener('click',()=>{
 const c=species();if(!c)return;
 const name=c.common||c.scientific;
 $('#simple-ask-text').value='Do you know what people call the '+name+' ('+c.scientific+') in your village, family or community? What language is the name in, and where is it used? I am helping document wildlife names in Praani.';
 show('#simple-ask-panel',true);
 text('#simple-message','');
});
$('#simple-ask-close').addEventListener('click',()=>show('#simple-ask-panel',false));
$('#simple-copy').addEventListener('click',async()=>{
 const field=$('#simple-ask-text');
 try{await navigator.clipboard.writeText(field.value);text('#simple-message','Question copied. Nothing was sent automatically.')}
 catch{field.focus();field.select();text('#simple-message','Select and copy the question to share it.')}
});
load();
})();