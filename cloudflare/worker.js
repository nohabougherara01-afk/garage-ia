export default {
 async fetch(request, env) {
  const origin = request.headers.get("Origin") || "";
  const allowed = "https://nohabougherara01-afk.github.io";
  const headers = {"Access-Control-Allow-Origin":allowed,"Access-Control-Allow-Methods":"POST, OPTIONS","Access-Control-Allow-Headers":"Content-Type","Content-Type":"application/json","Cache-Control":"no-store"};
  if(request.method==="OPTIONS") return new Response(null,{status:204,headers});
  if(request.method!=="POST" || origin!==allowed) return new Response(JSON.stringify({error:"Accès refusé"}),{status:403,headers});
  const length=Number(request.headers.get("Content-Length")||0);
  if(length>12000)return new Response(JSON.stringify({error:"Message trop long"}),{status:413,headers});
  try{
   const body=await request.json();
   const messages=Array.isArray(body.messages)?body.messages.slice(-8):[];
   if(!messages.length || messages.some(m=>!["user","assistant"].includes(m.role)||typeof m.content!=="string"||m.content.length>600))throw Error("Messages invalides");
   const system="Tu es l'assistant de démonstration de Garage Horizon, garage FICTIF à Mulhouse. Réponds en français, brièvement et avec courtoisie. Prestations fictives : vidange, pneus, freins, diagnostic, révision. Horaires fictifs : lundi-vendredi 8h-12h et 14h-18h. Ne prétends jamais que le garage existe réellement, ne confirme aucun rendez-vous et n'invente ni tarif, ni disponibilité, ni adresse, ni diagnostic certain. Pour un devis ou rendez-vous, indique qu'il faut contacter un vrai garage. Ne demande pas de données personnelles dans le chat. Pour une question de sécurité automobile, conseille une inspection professionnelle.";
   const result=await env.AI.run("@cf/meta/llama-3.1-8b-instruct-fp8-fast",{messages:[{role:"system",content:system},...messages],max_tokens:250,temperature:0.3});
   return new Response(JSON.stringify({reply:result.response||"Je ne peux pas répondre pour le moment."}),{headers});
  }catch(e){return new Response(JSON.stringify({error:"Service indisponible ou requête invalide."}),{status:400,headers})}
 }
};