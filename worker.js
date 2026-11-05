const cors = (origin, allowed) => ({
  "Access-Control-Allow-Origin": allowed === "*" ? "*" : (origin === allowed ? origin : allowed),
  "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type,Authorization",
  "Vary": "Origin"
});
const json = (data,status=200,headers={}) => new Response(JSON.stringify(data),{status,headers:{"Content-Type":"application/json; charset=utf-8",...headers}});
const enc = new TextEncoder();
function b64url(bytes){return btoa(String.fromCharCode(...new Uint8Array(bytes))).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"")}
async function sign(payload,secret){const key=await crypto.subtle.importKey("raw",enc.encode(secret),{name:"HMAC",hash:"SHA-256"},false,["sign"]);return b64url(await crypto.subtle.sign("HMAC",key,enc.encode(payload)))}
async function makeToken(secret){const p=b64url(enc.encode(JSON.stringify({exp:Date.now()+7*86400000})));return p+"."+await sign(p,secret)}
async function validToken(token,secret){try{const [p,s]=token.split(".");if(!p||!s||await sign(p,secret)!==s)return false;const obj=JSON.parse(atob(p.replace(/-/g,"+").replace(/_/g,"/")));return obj.exp>Date.now()}catch{return false}}
function uid(){return crypto.randomUUID()}
export default {
 async fetch(req,env){
  const origin=req.headers.get("Origin")||"";
  const allowed=env.ALLOWED_ORIGIN||"*";
  const headers=cors(origin,allowed);
  if(req.method==="OPTIONS")return new Response(null,{headers});
  const url=new URL(req.url);
  try{
   if(url.pathname==="/api/login"&&req.method==="POST"){
    const {password}=await req.json();
    if(!env.APP_PASSWORD||password!==env.APP_PASSWORD)return json({error:"Password salah."},401,headers);
    return json({token:await makeToken(env.SESSION_SECRET)},200,headers);
   }
   if(!url.pathname.startsWith("/api/"))return json({error:"Not found"},404,headers);
   const auth=(req.headers.get("Authorization")||"").replace(/^Bearer\s+/i,"");
   if(!await validToken(auth,env.SESSION_SECRET))return json({error:"Sesi berakhir. Silakan masuk kembali."},401,headers);
   if(url.pathname==="/api/items"&&req.method==="GET"){
    const {results}=await env.DB.prepare("SELECT * FROM items ORDER BY date IS NULL, date, time, updated_at DESC").all();
    return json({items:results.map(r=>({...r,done:!!r.done,reminder_minutes:r.reminder_minutes===null?null:Number(r.reminder_minutes),repeat:r.repeat_rule||'none'}))},200,headers);
   }
   if(url.pathname==="/api/items"&&req.method==="POST"){
    const x=await req.json();if(!x.title||!["event","task","note"].includes(x.type))return json({error:"Judul dan jenis item wajib diisi."},400,headers);
    const id=uid(),now=new Date().toISOString();
    await env.DB.prepare(`INSERT INTO items(id,title,type,date,time,description,done,reminder_minutes,repeat_rule,created_at,updated_at)
      VALUES(?,?,?,?,?,?,?,?,?,?,?)`).bind(id,x.title,x.type,x.date||null,x.time||null,x.description||"",x.done?1:0,x.reminder_minutes??null,x.repeat||"none",now,now).run();
    return json({id},201,headers);
   }
   const match=url.pathname.match(/^\/api\/items\/([a-f0-9-]+)$/i);
   if(match&&req.method==="PUT"){
    const x=await req.json();const now=new Date().toISOString();
    const result=await env.DB.prepare(`UPDATE items SET title=?,type=?,date=?,time=?,description=?,done=?,reminder_minutes=?,repeat_rule=?,updated_at=? WHERE id=?`)
      .bind(x.title,x.type,x.date||null,x.time||null,x.description||"",x.done?1:0,x.reminder_minutes??null,x.repeat||"none",now,match[1]).run();
    return result.meta.changes?json({ok:true},200,headers):json({error:"Item tidak ditemukan."},404,headers);
   }
   if(match&&req.method==="DELETE"){
    const result=await env.DB.prepare("DELETE FROM items WHERE id=?").bind(match[1]).run();
    return result.meta.changes?new Response(null,{status:204,headers}):json({error:"Item tidak ditemukan."},404,headers);
   }
   return json({error:"Not found"},404,headers);
  }catch(e){return json({error:"Server error",detail:env.ENVIRONMENT==="development"?e.message:undefined},500,headers)}
 }
};