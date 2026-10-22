import {createHash} from 'node:crypto';
export const normalizeName=value=>String(value||'').normalize('NFKC').trim().replace(/\s+/gu,' ').toLocaleLowerCase('und');
export const nameKey=r=>[r.species_id,normalizeName(r.name),r.language,normalizeName(r.region)].join('|');
export const sourceKey=(r,e)=>createHash('sha256').update(nameKey(r)+'|'+e.source_id+'|'+e.locator+'|'+e.raw_name).digest('hex');
export function validateDataset(dataset,catalogue){
 if(!dataset.version||dataset.record_count!==dataset.records?.length)throw Error('Dataset count/version mismatch');
 const index=new Map(catalogue.map(s=>[s.id,s]));
 const keys=new Set();
 for(const r of dataset.records){
  const sp=index.get(r.species_id);
  if(!sp||sp.scientific!==r.scientific||sp.type!==r.species_kind)throw Error('Taxon mismatch: '+r.scientific);
  if(typeof r.name!=='string'||r.name.trim().length<2||r.name.length>100||/\\u[0-9a-f]{4}|[<>]/i.test(r.name))throw Error('Invalid name: '+r.name);
  if(typeof r.region!=='string'||r.region.length>90)throw Error('Invalid region');
  if(typeof r.language!=='string'||!r.language.trim()||r.language==='Other'||r.language.length>40)throw Error('Language must be explicit');
  if(r.status==='held'||!Array.isArray(r.sources)||!r.sources.length)throw Error('Unverified record');
  if(keys.has(nameKey(r)))throw Error('Duplicate name record');
  keys.add(nameKey(r));
  for(const e of r.sources){
   const s=dataset.sources[e.source_id];
   if(!s?.name||!s.url||new URL(s.url).protocol!=='https:'||!e.locator||!e.method||!e.source_scientific||!e.raw_name)throw Error('Missing source evidence');
  }
 }
 return {names:keys.size,species:new Set(dataset.records.map(r=>r.species_id)).size,languages:new Set(dataset.records.map(r=>r.language)).size};
}
