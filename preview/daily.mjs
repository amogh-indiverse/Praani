// Curated, attributed photographs. Displayed crops retain the source image licence.
export const featuredAnimals=[
 {scientific:'Ratufa indica',image:'https://upload.wikimedia.org/wikipedia/commons/6/62/Ratufa_indica.jpg',credit:'Renjusplace',source:'https://commons.wikimedia.org/wiki/File:Ratufa_indica.jpg',licence:'CC BY-SA 3.0',licenceUrl:'https://creativecommons.org/licenses/by-sa/3.0/'},
 {scientific:'Buceros bicornis',image:'https://upload.wikimedia.org/wikipedia/commons/d/d1/Great_hornbill_%2C_Buceros_bicornis.jpg',credit:'Shino jacob koottanad',source:'https://commons.wikimedia.org/wiki/File:Great_hornbill_,_Buceros_bicornis.jpg',licence:'CC BY-SA 4.0',licenceUrl:'https://creativecommons.org/licenses/by-sa/4.0/'},
 {scientific:'Panthera tigris',image:'https://upload.wikimedia.org/wikipedia/commons/e/e1/Tiger_panthera_tigris.jpg',credit:'John and Karen Hollingsworth / USFWS',source:'https://commons.wikimedia.org/wiki/File:Tiger_panthera_tigris.jpg',licence:'Public domain',licenceUrl:'https://commons.wikimedia.org/wiki/File:Tiger_panthera_tigris.jpg'}
];
export function indiaDay(date=new Date()){return new Date(date.getTime()+19800000).toISOString().slice(0,10)}
export function dailyAnimal(catalog,date=new Date()){
 const day=indiaDay(date);const available=featuredAnimals.map(p=>{const s=catalog.find(s=>s.scientific===p.scientific);return s?{...s,...p}:null}).filter(Boolean);
 if(!available.length)return {day,species:null};
 const offset=Math.floor((Date.parse(day+'T00:00:00Z')-Date.parse('2026-10-24T00:00:00Z'))/86400000);
 return {day,species:available[((offset%available.length)+available.length)%available.length]};
}
export function nameKey(s){return String(s||'').normalize('NFKC').trim().replace(/\s+/gu,' ').toLocaleLowerCase('und')}
export function knownNameResult(records,speciesId,language,name=''){
 const names=[...new Set(records.filter(n=>(n.species_id||n.speciesId)===speciesId&&n.language===language).map(n=>n.name))];
 return {knownNames:names,exists:!!nameKey(name)&&names.some(n=>nameKey(n)===nameKey(name)),scope:'Praani community records and imported source references'};
}
