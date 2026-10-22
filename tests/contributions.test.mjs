import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import assert from 'node:assert/strict';
import test from 'node:test';
const source=readFileSync(new URL('../index.ts',import.meta.url),'utf8');
function harness(kind,common='Existing common name',duplicate=''){
 const writes=[];
 const sql={unsafe:async(query,values)=>{
  if(query.startsWith('SELECT species_kind'))return [{species_kind:kind,common}];
  if(query.startsWith('SELECT 1 FROM'))return query.includes(duplicate)&&duplicate?[{}]:[];
  if(query.startsWith('INSERT INTO'))writes.push({query,values});
  return [];
 }};
 sql.begin=async fn=>fn(sql);
 const from=source.indexOf('async function contribute(r){');
 const to=source.indexOf('\nasync function vote(r)',from);
 const contribute=runInNewContext(source.slice(from,to)+';contribute',{
  sql,kinds:['Bird','Mammal','Snake'],langs:['Kannada','Hindi'],
  validateOrigin:()=>{},body:async r=>r,throttle:async()=>{},
  clean:(x,max=100)=>typeof x==='string'?x.trim().replace(/\s+/gu,' ').slice(0,max):'',
  norm:x=>String(x||'').normalize('NFKC').trim().toLowerCase(),
  randomUUID:()=> 'test-uuid',now:()=>123,
  Err:class extends Error{constructor(message,status=400){super(message);this.status=status}},
  response:(body,status)=>({body,status})
 });
 return {writes,contribute};
}
const proposal={speciesId:'verified',language:'Kannada',commonName:'Forest guardian',why:'Inspired by its forest habitat'};
for(const type of ['Bird','Mammal','Snake'])for(const common of ['Existing name',null]){
 test(`${type} accepts a standalone suggestion, catalogue name ${common?'present':'absent'}`,async()=>{
  const {writes,contribute}=harness(type,common);
  assert.equal((await contribute({...proposal,type})).status,201);
  assert.equal(writes.length,1);
  assert.match(writes[0].query,/INSERT INTO common_suggestions/);
  assert.equal(writes[0].values[2],type);
  assert.equal(writes[0].values[3],proposal.commonName);
 });
}
test('existing local name flow still saves only the local name',async()=>{
 const {writes,contribute}=harness('Mammal');
 await contribute({speciesId:'verified',type:'Mammal',language:'Kannada',localName:'Huli'});
 assert.equal(writes.length,1);assert.match(writes[0].query,/INSERT INTO local_names/);
});
test('both names save together with the correct species kind',async()=>{
 const {writes,contribute}=harness('Bird');
 await contribute({...proposal,type:'Bird',localName:'Navilu'});
 assert.equal(writes.length,2);assert.equal(writes[1].values[2],'Bird');
});
for(const [label,change] of [
 ['empty names',{commonName:''}],['short suggestion',{commonName:'A'}],
 ['missing reason',{why:''}],['short reason',{why:'short'}],
 ['invalid language',{language:'Invalid'}],['invalid species type',{type:'Fish'}],
 ['incorrect catalogue species kind',{type:'Snake'}],['short local name',{localName:'A'}]
])test(`rejects ${label} without writing`,async()=>{
 const {writes,contribute}=harness('Bird');
 await assert.rejects(contribute({...proposal,type:'Bird',...change}));
 assert.equal(writes.length,0);
});
test('duplicate proposals remain blocked',async()=>{
 const {writes,contribute}=harness('Mammal','Tiger','common_suggestions');
 await assert.rejects(contribute({...proposal,type:'Mammal'}),e=>e.status===409);
 assert.equal(writes.length,0);
});
