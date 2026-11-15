// Worker distinct du chatbot IA. Bindings requis : DB (D1), ADMIN_TOKEN (secret).
const ORIGIN = "https://nohabougherara01-afk.github.io";
const INITIAL = {name:"Garage Dupont",phone:"03 89 00 00 00",hours:"Lun–Ven : 8h–18h",services:["Vidange","Pneus","Freinage"]};
const json=(data,status=200,headers={})=>new Response(JSON.stringify(data),{status,headers:{"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store",...headers}});
function safeEqual(a,b){const enc=new TextEncoder();const x=enc.encode(a),y=enc.encode(b);let diff=x.length^y.length;for(let i=0;i<Math.max(x.length,y.length);i++)diff|=(x[i]||0)^(y[i]||0);return diff===0}
export default {async fetch(request,env){
 const url=new URL(request.url),origin=request.headers.get("Origin")||"";
 const cors=origin===ORIGIN?{"Access-Control-Allow-Origin":ORIGIN,"Access-Control-Allow-Methods":"GET, PUT, OPTIONS","Access-Control-Allow-Headers":"Content-Type, Authorization","Vary":"Origin"}:{};
 if(request.method==="OPTIONS")return origin===ORIGIN?new Response(null,{status:204,headers:cors}):json({error:"Forbidden"},403);
 if(url.pathname!=="/config")return json({error:"Not found"},404,cors);
 if(!env.DB)return json({error:"D1 non configuré"},503,cors);
 if(request.method==="GET"){
  const record=await env.DB.prepare("SELECT value FROM settings WHERE key = ?").bind("garage").first();
  return json(record?JSON.parse(record.value):INITIAL,200,cors);
 }
 if(request.method!=="PUT")return json({error:"Method not allowed"},405,cors);
 if(origin!==ORIGIN)return json({error:"Forbidden"},403,cors);
 const auth=request.headers.get("Authorization")||"";
 if(!env.ADMIN_TOKEN||env.ADMIN_TOKEN.length<32||!auth.startsWith("Bearer ")||!safeEqual(auth.slice(7),env.ADMIN_TOKEN))return json({error:"Unauthorized"},401,cors);
 if(Number(request.headers.get("Content-Length")||0)>5000)return json({error:"Too large"},413,cors);
 let body;try{body=await request.json()}catch{return json({error:"Invalid JSON"},400,cors)}
 if(!body||typeof body!=="object"||!["name","phone","hours"].every(k=>typeof body[k]==="string"&&body[k].trim().length>0)||body.name.length>100||body.phone.length>35||body.hours.length>500||!Array.isArray(body.services)||body.services.length>30||body.services.some(s=>typeof s!=="string"||!s.trim()||s.length>80))return json({error:"Invalid fields"},400,cors);
 const data={name:body.name.trim(),phone:body.phone.trim(),hours:body.hours.trim(),services:body.services.map(s=>s.trim())};
 await env.DB.prepare("INSERT INTO settings (key,value) VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value").bind("garage",JSON.stringify(data)).run();
 return json({ok:true},200,cors);
}};
