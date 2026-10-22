import {gunzipSync} from "node:zlib";
import fs from 'node:fs/promises';
import postgres from 'postgres';
import {isImportTarget,importVerifiedNames} from './name-import.mjs';
if(!isImportTarget(process.env.DATABASE_URL))throw Error('Importer is restricted to the Praani Render test database internal URL');
const dataset=JSON.parse(gunzipSync(await fs.readFile(new URL('../data/verified-local-names.json.gz',import.meta.url))).toString('utf8'));
const sql=postgres(process.env.DATABASE_URL,{max:1,connect_timeout:12});
try{console.log(JSON.stringify(await importVerifiedNames(sql,dataset,{apply:process.argv.includes('--apply')})))}finally{await sql.end()}
