// Curated species matched to the verified catalogue.
export const featuredAnimals=[{scientific:'Ratufa indica'},{scientific:'Buceros bicornis'},{scientific:'Panthera tigris'}];
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

export function renderDailyShell(html,catalog,date=new Date()){
 const feature=dailyAnimal(catalog,date),species=feature.species;
 const escape=value=>String(value||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
 const values={__DAILY_NAME__:species?.common||species?.scientific||'Catalogue syncing',__DAILY_SCIENTIFIC__:species?.scientific||'',__DAILY_KIND__:species?.type?species.type.toUpperCase()+' / TODAY’S NAME HUNT':'TODAY’S NAME HUNT',__DAILY_DAY__:new Date(feature.day+'T00:00:00Z').toLocaleDateString('en-IN',{day:'numeric',month:'long',timeZone:'UTC'})};
 for(const [key,value]of Object.entries(values))html=html.replaceAll(key,escape(value));
 return html.replace('__DAILY_JSON__',JSON.stringify(feature).replace(/</g,'\\u003c').replace(/>/g,'\\u003e').replace(/&/g,'\\u0026'));
}
