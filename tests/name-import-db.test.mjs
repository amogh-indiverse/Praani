import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {importVerifiedNames} from '../scripts/name-import.mjs';
import {normalizeName} from '../scripts/verified-names.mjs';
const connection=process.env.PRAANI_TEST_DATABASE_URL;
test('PostgreSQL import is atomic, preserves contributions and is applied only once', {skip:!connection},async()=>{
 const {default:postgres}=await import('postgres');
 const sql=postgres(connection,{max:1});
 try{
  const source=readFileSync(new URL('../index.ts',import.meta.url),'utf8');
  for(const query of [...source.matchAll(/^"(CREATE TABLE IF NOT EXISTS (?:species_catalog|local_names)\(.*)"[,]?$/gm)].map(m=>JSON.parse('"'+m[1]+'"')))await sql.unsafe(query);
  const catalogue=JSON.parse(readFileSync(new URL('../data/catalogue-reference.json',import.meta.url),'utf8'));
  await sql.unsafe('INSERT INTO species_catalog(id,species_kind,scientific) SELECT id,type,scientific FROM jsonb_to_recordset($1::jsonb) AS x(id text,type text,scientific text)',[catalogue]);
  const dataset=JSON.parse(gunzipSync(readFileSync(new URL('../data/verified-local-names.json.gz',import.meta.url))).toString('utf8'));
  dataset.records=dataset.records.slice(0,401);dataset.record_count=401;dataset.version='test-atomic-401';
  let batches=0;
  const failing={unsafe:sql.unsafe.bind(sql),begin:fn=>sql.begin(t=>fn({unsafe:async(query,params)=>{
   if(query.startsWith('INSERT INTO local_names(')&&++batches===2)throw Error('Injected interrupted import');
   return t.unsafe(query,params);
  }}))};
  await assert.rejects(importVerifiedNames(failing,dataset,{apply:true}),/Injected interrupted/);
  assert.equal((await sql.unsafe('SELECT count(*)::int AS n FROM local_names'))[0].n,0,'failed batch must roll back earlier names');
  const first=dataset.records[0];
  await sql.unsafe('INSERT INTO local_names(id,species_id,species_kind,name,name_key,language,region,region_key,created_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,123)',['00000000-0000-4000-8000-000000000001',first.species_id,first.species_kind,first.name,normalizeName(first.name),first.language,first.region,normalizeName(first.region)]);
  const result=await importVerifiedNames(sql,dataset,{apply:true});
  assert.equal(result.inserted,400);assert.equal(result.confirmed,401);
  assert.equal((await sql.unsafe("SELECT created_at::int AS n FROM local_names WHERE id='00000000-0000-4000-8000-000000000001'"))[0].n,123,'existing contribution must remain intact');
  assert.equal((await sql.unsafe('SELECT count(DISTINCT local_name_id)::int AS n FROM local_name_sources'))[0].n,401);
  const evidence=(await sql.unsafe('SELECT count(*)::int AS n FROM local_name_sources'))[0].n;
  assert.equal(evidence,new Set(dataset.records.flatMap(r=>r.sources.map(e=>[r.species_id,r.name,r.language,r.region,e.source_id,e.locator,e.raw_name].join('|')))).size);
  const again=await importVerifiedNames(sql,dataset,{apply:true});
  assert.equal(again.alreadyApplied,true);
  assert.equal((await sql.unsafe('SELECT count(*)::int AS n FROM local_name_sources'))[0].n,evidence);
  await sql.unsafe("DELETE FROM local_names WHERE id='00000000-0000-4000-8000-000000000001'");
  await importVerifiedNames(sql,dataset,{apply:true});
  assert.equal((await sql.unsafe('SELECT count(*)::int AS n FROM local_names'))[0].n,400,'an administrator deletion must not be recreated on restart');
 }finally{await sql.end()}
});
