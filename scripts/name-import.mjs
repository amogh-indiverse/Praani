import {randomUUID} from 'node:crypto';
import {validateDataset,normalizeName,sourceKey} from './verified-names.mjs';
export function isImportTarget(connection){
 try{const u=new URL(connection);return u.hostname==='dpg-dbcubci9lscs73f4sbr0-a'&&u.pathname==='/praani_postgres_test'}catch{return false}
}
export async function importVerifiedNames(sql,dataset,{apply=false}={}){
 const catalogue=await sql.unsafe('SELECT id,scientific,species_kind AS type FROM species_catalog');
 const counts=validateDataset(dataset,catalogue);
 if(!apply)return {applied:false,version:dataset.version,...counts};
 else{
  const result=await sql.begin(async t=>{
   await t.unsafe('SELECT pg_advisory_xact_lock(304788121)');
   await t.unsafe('CREATE TABLE IF NOT EXISTS local_name_import_runs(version TEXT PRIMARY KEY,result JSONB NOT NULL,completed_at BIGINT NOT NULL)');
   const prior=await t.unsafe('SELECT result FROM local_name_import_runs WHERE version=$1',[dataset.version]);
   if(prior.length)return {...prior[0].result,alreadyApplied:true};
   await t.unsafe('CREATE TABLE IF NOT EXISTS local_name_sources(source_key TEXT PRIMARY KEY,local_name_id UUID NOT NULL REFERENCES local_names(id) ON DELETE CASCADE,source_name TEXT NOT NULL,source_url TEXT NOT NULL,source_locator TEXT NOT NULL,source_payload JSONB NOT NULL,import_version TEXT NOT NULL,imported_at BIGINT NOT NULL)');
   await t.unsafe('CREATE INDEX IF NOT EXISTS idx_name_sources_local ON local_name_sources(local_name_id)');
   let inserted=0,evidenceAdded=0,confirmed=0;
   for(let offset=0;offset<dataset.records.length;offset+=200){
    const batch=dataset.records.slice(offset,offset+200).map(r=>({...r,id:randomUUID(),name_key:normalizeName(r.name),region_key:normalizeName(r.region),created_at:Math.floor(Date.now()/1000)}));
    const names=await t.unsafe('INSERT INTO local_names(id,species_id,species_kind,name,name_key,language,region,region_key,created_at) SELECT x.id,x.species_id,x.species_kind,x.name,x.name_key,x.language,x.region,x.region_key,x.created_at FROM jsonb_to_recordset($1::jsonb) AS x(id uuid,species_id text,species_kind text,name text,name_key text,language text,region text,region_key text,created_at bigint) ON CONFLICT(species_id,name_key,language,region_key) DO NOTHING RETURNING id',[JSON.stringify(batch)]);
    inserted+=names.length;
    const evidence=batch.flatMap(r=>r.sources.map(e=>({species_id:r.species_id,name_key:r.name_key,language:r.language,region_key:r.region_key,source_key:sourceKey(r,e),source_name:dataset.sources[e.source_id].name,source_url:dataset.sources[e.source_id].url,source_locator:e.locator,source_payload:{...e,source:dataset.sources[e.source_id]},import_version:dataset.version,imported_at:r.created_at})));
    const refs=await t.unsafe('INSERT INTO local_name_sources(source_key,local_name_id,source_name,source_url,source_locator,source_payload,import_version,imported_at) SELECT x.source_key,l.id,x.source_name,x.source_url,x.source_locator,x.source_payload,x.import_version,x.imported_at FROM jsonb_to_recordset($1::jsonb) AS x(species_id text,name_key text,language text,region_key text,source_key text,source_name text,source_url text,source_locator text,source_payload jsonb,import_version text,imported_at bigint) JOIN local_names l ON l.species_id=x.species_id AND l.name_key=x.name_key AND l.language=x.language AND l.region_key=x.region_key ON CONFLICT(source_key) DO NOTHING RETURNING source_key',[JSON.stringify(evidence)]);
    evidenceAdded+=refs.length;
    const checked=await t.unsafe('SELECT COUNT(*)::int AS n FROM jsonb_to_recordset($1::jsonb) AS x(species_id text,name_key text,language text,region_key text) JOIN local_names l ON l.species_id=x.species_id AND l.name_key=x.name_key AND l.language=x.language AND l.region_key=x.region_key',[JSON.stringify(batch)]);
    confirmed+=checked[0].n;
   }
   if(confirmed!==dataset.record_count)throw Error('Import count mismatch; transaction rolled back');
   const result={inserted,evidenceAdded,confirmed};
   await t.unsafe('INSERT INTO local_name_import_runs(version,result,completed_at) VALUES($1,$2::jsonb,$3)',[dataset.version,JSON.stringify(result),Math.floor(Date.now()/1000)]);
   return result;
  });
  return {applied:true,version:dataset.version,...counts,...result};
 }
}
