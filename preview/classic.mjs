(()=>{
'use strict';
const $=selector=>document.querySelector(selector);
const catalog=JSON.parse($('#species-json').textContent);
const curated=[
 {scientific:'Panthera tigris',native:'ಹುಲಿ',roman:'Huli',language:'Kannada',lang:'kn'},
 {scientific:'Pavo cristatus',native:'ನವಿಲು',roman:'Navilu',language:'Kannada',lang:'kn'},
 {scientific:'Elephas maximus',native:'ಆನೆ',roman:'Aane',language:'Kannada',lang:'kn'}
];
const dateKey=new Date().toISOString().slice(0,10);
const offset=Math.floor(Date.parse(dateKey+'T00:00:00Z')/86400000);
const item=curated[((offset%curated.length)+curated.length)%curated.length];
const species=catalog.find(s=>s.scientific===item.scientific);
if(species){
 $('.aotd-middle h2').textContent=species.common||species.scientific;
 $('.aotd-latin i').textContent=species.scientific;
 $('.aotd-name strong').textContent=item.native;
 $('.aotd-name strong').lang=item.lang;
 $('.aotd-name em').textContent=item.roman;
 $('.aotd-name span').textContent='IN '+item.language.toUpperCase();
}
$('#aotd-add').addEventListener('click',()=>{
 if(!species)return;
 const bridge=window.PraaniUI;
 if(bridge?.selectSpeciesById){
  bridge.selectSpeciesById(species.id,item.language,'');
  return;
 }
 $('#species-search').value=species.common||species.scientific;
 $('#species-search').dispatchEvent(new Event('input',{bubbles:true}));
 $('#contribute').scrollIntoView({behavior:'smooth'});
});
})();