import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {gunzipSync} from 'node:zlib';
import postgres from 'postgres';
import {importVerifiedNames} from '../scripts/name-import.mjs';
const connection=new URL(process.env.DATABASE_URL);
if(!['localhost','127.0.0.1'].includes(connection.hostname)||connection.pathname!=='/praani_ember_ci')throw Error('This fixture only runs against the isolated CI database');
const sql=postgres(connection.toString());
try{
const source=readFileSync('index.ts','utf8');const code=source.match(/const statements=(\[[\s\S]*?\n\]);/)[1];const schema=runInNewContext(code);for(const s of schema)await sql.unsafe(s);
const catalog=JSON.parse(readFileSync('preview/catalog.json','utf8'));for(const s of catalog)await sql.unsafe('INSERT INTO species_catalog(id,species_kind,scientific,common,family,alternative_names,subgroup) VALUES($1,$2,$3,$4,$5,$6,$7)',[s.id,s.type,s.scientific,s.common,s.family,JSON.stringify(s.alternativeNames),s.group||'']);
const data=JSON.parse(gunzipSync(readFileSync('data/verified-local-names.json.gz')));await importVerifiedNames(sql,data,{apply:true});console.log('Seeded isolated CI database');
}finally{await sql.end()}
