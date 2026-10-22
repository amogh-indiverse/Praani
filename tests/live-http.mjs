const base="https://praani-web.onrender.com";
const response=await fetch(base+"/");
const html=await response.text();
console.log("STATUS",response.status);
console.log("TITLE",html.match(/<title>([^<]*)<\/title>/)?.[1]);
console.log("HTML_LENGTH",html.length);
console.log("ESCAPED_UNICODE_COUNT",(html.match(/\\u[0-9a-fA-F]{4}/g)||[]).length);
const health=await fetch(base+"/api/health");
console.log("HEALTH",health.status,(await health.text()).slice(0,200));
