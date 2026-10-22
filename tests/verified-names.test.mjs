import {gunzipSync} from "node:zlib";
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import test from 'node:test';
import {validateDataset,normalizeName,sourceKey} from '../scripts/verified-names.mjs';
const data=JSON.parse(gunzipSync(readFileSync(new URL('../data/verified-local-names.json.gz',import.meta.url))).toString('utf8'));
const catalogue=JSON.parse(readFileSync(new URL('../data/catalogue-reference.json',import.meta.url),'utf8'));
test('every imported name has explicit language, traceable evidence and a valid record key',()=>{assert.equal(validateDataset(data,catalogue).names,data.record_count)});
for(const [name,mutate] of [
 ['a changed taxon',d=>{d.records[0].scientific='Wrong species'}],
 ['a missing source',d=>{d.records[0].sources[0].source_id='missing'}],
 ['a held record',d=>{d.records[0].status='held'}],
 ['an unspecified language',d=>{d.records[0].language='Other'}],
 ['duplicate records',d=>{d.records.push(d.records[0]);d.record_count++}],
 ['literal Unicode escapes',d=>{d.records[0].name=String.raw`bad\u0041name`}]
])test('import rejects '+name,()=>{const d=structuredClone(data);mutate(d);assert.throws(()=>validateDataset(d,catalogue))});
test('source keys and normalization are stable across retries',()=>{const r=data.records[0],e=r.sources[0];assert.equal(sourceKey(r,e),sourceKey(structuredClone(r),structuredClone(e)));assert.equal(normalizeName(' Huli  '),'huli')});

test('database target guard accepts only the specific Render internal test database',async()=>{
 const {isImportTarget}=await import('../scripts/name-import.mjs');
 assert.equal(isImportTarget('postgres://user:password@dpg-dbcubci9lscs73f4sbr0-a/praani_postgres_test'),true);
 for(const url of ['postgres://u:p@railway.internal/praani_postgres_test','postgres://u:p@dpg-other/praani_postgres_test','postgres://u:p@dpg-dbcubci9lscs73f4sbr0-a/production','postgres://u:p@dpg-dbcubci9lscs73f4sbr0-a.singapore-postgres.render.com/praani_postgres_test','invalid'])assert.equal(isImportTarget(url),false);
});
