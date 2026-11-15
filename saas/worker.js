// SaaS API (separate Worker; do not overwrite existing garage-admin-api).
// Bind D1 as DB; set STRIPE_WEBHOOK_SECRET and STRIPE_PRICE_ASSISTANT / STRIPE_PRICE_PREMIUM.
// Provisioning deliberately requires a separate secure invitation system before customer access.
const cors={"Access-Control-Allow-Origin":"https://nohabougherara01-afk.github.io","Access-Control-Allow-Headers":"Authorization, Content-Type","Access-Control-Allow-Methods":"GET, PUT, POST, OPTIONS","Vary":"Origin"};
const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{"Content-Type":"application/json; charset=utf-8",...cors,"Cache-Control":"no-store"}});
const hex=bytes=>[...new Uint8Array(bytes)].map(x=>x.toString(16).padStart(2,"0")).join("");
async function hashToken(token){return hex(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(token)))}
async function authorized(request,env){const match=/^Bearer ([A-Za-z0-9_-]{32,256})$/.exec(request.headers.get("Authorization")||"");if(!match)return null;const hash=await hashToken(match[1]);return env.DB.prepare("SELECT g.id,g.name,g.plan,g.subscription_status FROM garage_access a JOIN saas_garages g ON g.id=a.garage_id WHERE a.token_hash=?").bind(hash).first()}
function validTime(t){return typeof t==="string"&&/^([01]\d|2[0-3]):[0-5]\d$/.test(t)}
const mins=t=>Number(t.slice(0,2))*60+Number(t.slice(3,5));
function validDate(s){if(typeof s!=="string"||!/^\d{4}-\d{2}-\d{2}$/.test(s))return false;const d=new Date(s+"T12:00:00Z");return !Number.isNaN(d.valueOf())&&d.toISOString().slice(0,10)===s}
async function stripeSignature(raw,header,secret){const fields=Object.fromEntries((header||"").split(",").map(x=>x.split("=",2)));const t=Number(fields.t);if(!Number.isSafeInteger(t)||Math.abs(Date.now()/1000-t)>300)return false;const signatures=(header||"").split(",").filter(x=>x.startsWith("v1=")).map(x=>x.slice(3));if(!signatures.length)return false;const key=await crypto.subtle.importKey("raw",new TextEncoder().encode(secret),{name:"HMAC",hash:"SHA-256"},false,["sign"]);const digest=hex(await crypto.subtle.sign("HMAC",key,new TextEncoder().encode(t+"."+raw)));return signatures.some(s=>s.length===digest.length&&s===digest)}
export default {async fetch(request,env){
 const url=new URL(request.url),path=url.pathname;
 if(request.method==="OPTIONS")return new Response(null,{status:204,headers:cors});
 if(path==="/health"&&request.method==="GET")return json({ok:true});
 if(path==="/stripe/webhook"&&request.method==="POST"){
  if(!env.STRIPE_WEBHOOK_SECRET)return json({error:"Webhook non configuré"},503);
  const raw=await request.text();if(!(await stripeSignature(raw,request.headers.get("Stripe-Signature"),env.STRIPE_WEBHOOK_SECRET)))return json({error:"Signature invalide"},400);
  let event;try{event=JSON.parse(raw)}catch{return json({error:"JSON invalide"},400)}
  if(typeof event.id!=="string")return json({error:"Événement invalide"},400);
  if(await env.DB.prepare("SELECT id FROM stripe_events WHERE id=?").bind(event.id).first())return json({received:true,duplicate:true});
  const obj=event.data?.object||{};
  // Never activate from a browser redirect. Only verified subscription events may update an existing garage.
  if(["customer.subscription.created","customer.subscription.updated","customer.subscription.deleted"].includes(event.type)){
   const subscriptionId=obj.id,customerId=typeof obj.customer==="string"?obj.customer:obj.customer?.id;
   if(typeof subscriptionId==="string"&&typeof customerId==="string"){
    const priceIds=(obj.items?.data||[]).map(i=>i.price?.id);
    const plan=priceIds.includes(env.STRIPE_PRICE_PREMIUM)?"premium":priceIds.includes(env.STRIPE_PRICE_ASSISTANT)?"assistant":null;
    // Do not auto-create a garage from untrusted metadata; onboarding/invitations must bind customer IDs securely.
    const status=event.type==="customer.subscription.deleted"?"canceled":String(obj.status||"inactive");
    if(plan)await env.DB.prepare("UPDATE saas_garages SET subscription_status=?,plan=?,stripe_subscription_id=? WHERE stripe_customer_id=?").bind(status,plan,subscriptionId,customerId).run();
    else if(event.type==="customer.subscription.deleted")await env.DB.prepare("UPDATE saas_garages SET subscription_status='canceled' WHERE stripe_subscription_id=?").bind(subscriptionId).run();
   }
  }
  await env.DB.prepare("INSERT OR IGNORE INTO stripe_events(id) VALUES(?)").bind(event.id).run();
  return json({received:true});
 }
 if(!path.startsWith("/garage/"))return json({error:"Introuvable"},404);
 const garage=await authorized(request,env);if(!garage)return json({error:"Accès non autorisé"},401);
 if(garage.subscription_status!=="active"&&garage.subscription_status!=="trialing")return json({error:"Abonnement inactif"},403);
 if(path==="/garage/profile"&&request.method==="GET")return json({garage});
 if(path==="/garage/schedule"&&request.method==="GET"){
  const row=await env.DB.prepare("SELECT * FROM garage_schedules WHERE garage_id=?").bind(garage.id).first();
  return json({schedule:row?{days:JSON.parse(row.days_json),start:row.start_time,end:row.end_time,duration:row.slot_minutes}:{days:[0,1,2,3,4],start:"08:00",end:"18:00",duration:60}});
 }
 if(path==="/garage/schedule"&&request.method==="PUT"){
  let body;try{body=await request.json()}catch{return json({error:"JSON invalide"},400)}
  const {days,start,end,duration}=body||{};
  if(!Array.isArray(days)||days.length>7||new Set(days).size!==days.length||!days.every(d=>Number.isInteger(d)&&d>=0&&d<=6)||!validTime(start)||!validTime(end)||mins(start)>=mins(end)||![30,60,90,120].includes(duration))return json({error:"Horaires invalides"},400);
  await env.DB.prepare("INSERT INTO garage_schedules(garage_id,days_json,start_time,end_time,slot_minutes) VALUES(?,?,?,?,?) ON CONFLICT(garage_id) DO UPDATE SET days_json=excluded.days_json,start_time=excluded.start_time,end_time=excluded.end_time,slot_minutes=excluded.slot_minutes").bind(garage.id,JSON.stringify(days),start,end,duration).run();
  return json({saved:true});
 }
 if(path==="/garage/blocks"&&request.method==="GET"){
  const date=url.searchParams.get("date");if(!validDate(date))return json({error:"Date invalide"},400);
  const rows=await env.DB.prepare("SELECT time FROM garage_blocks WHERE garage_id=? AND date=? ORDER BY time").bind(garage.id,date).all();return json({date,blocked:rows.results.map(x=>x.time)});
 }
 if(path==="/garage/blocks"&&request.method==="PUT"){
  let body;try{body=await request.json()}catch{return json({error:"JSON invalide"},400)}
  if(!validDate(body?.date)||!validTime(body?.time)||typeof body?.blocked!=="boolean")return json({error:"Créneau invalide"},400);
  if(body.blocked)await env.DB.prepare("INSERT OR IGNORE INTO garage_blocks(garage_id,date,time) VALUES(?,?,?)").bind(garage.id,body.date,body.time).run();
  else await env.DB.prepare("DELETE FROM garage_blocks WHERE garage_id=? AND date=? AND time=?").bind(garage.id,body.date,body.time).run();
  return json({saved:true});
 }
 return json({error:"Introuvable"},404);
}};
