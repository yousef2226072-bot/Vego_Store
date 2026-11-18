// VEGO STORE backend — zero dependencies (Node 18+). Run: node server.js
const http=require('http'),fs=require('fs'),path=require('path'),crypto=require('crypto');
try{fs.readFileSync(path.join(__dirname,'.env'),'utf8').split(/\r?\n/).forEach(l=>{const m=l.match(/^\s*([A-Z_]+)\s*=\s*(.*?)\s*$/);if(m&&!(m[1] in process.env))process.env[m[1]]=m[2]})}catch{}
const {OWNER_USER,OWNER_SALT,OWNER_HASH}=process.env,PORT=process.env.PORT||3000,SHIP=50;
if(!OWNER_USER||!OWNER_SALT||!OWNER_HASH){console.error('Set OWNER_USER, OWNER_SALT, OWNER_HASH (see README)');process.exit(1)}
const DB=path.join(__dirname,'data','db.json'),PUB=path.join(__dirname,'public');
let db=JSON.parse(fs.readFileSync(DB,'utf8'));
const save=()=>{fs.writeFileSync(DB+'.tmp',JSON.stringify(db));fs.renameSync(DB+'.tmp',DB)};
const sessions=new Map(),fails=new Map();
function checkLogin(u,p){
  const h=crypto.scryptSync(String(p),OWNER_SALT,64),want=Buffer.from(OWNER_HASH,'hex');
  const a=Buffer.from(String(u)),b=Buffer.from(OWNER_USER);
  const okU=a.length===b.length&&crypto.timingSafeEqual(a,b);
  return crypto.timingSafeEqual(h,want)&&okU;
}
const owner=req=>{const sid=((req.headers.cookie||'').match(/(?:^|;\s*)sid=([a-f0-9]+)/)||[])[1];return !!sid&&(sessions.get(sid)||0)>Date.now()};
const send=(res,code,obj,h={})=>{res.writeHead(code,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store',...h});res.end(JSON.stringify(obj))};
const body=(req,max)=>new Promise((ok,no)=>{let n=0,c=[];req.on('data',d=>{n+=d.length;if(n>max){no(new Error('big'));req.destroy()}else c.push(d)});req.on('end',()=>{try{ok(JSON.parse(Buffer.concat(c).toString()||'{}'))}catch(e){no(e)}});req.on('error',no)});
const str=(v,n)=>String(v??'').trim().slice(0,n);
const MIME={'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml','.webp':'image/webp','.txt':'text/plain; charset=utf-8','.xml':'application/xml','.json':'application/json','.woff2':'font/woff2','.ico':'image/x-icon'};
http.createServer(async(req,res)=>{
  res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','same-origin');
  const url=new URL(req.url,'http://x'),p=url.pathname;
  try{
    if(p==='/api/me')return send(res,200,{owner:owner(req)});
    if(p==='/api/products'&&req.method==='GET')return send(res,200,db.products);
    if(p==='/api/products'&&req.method==='PUT'){
      if(!owner(req))return send(res,401,{error:'unauthorized'});
      const list=await body(req,30e6);if(!Array.isArray(list)||list.length>500)return send(res,400,{error:'bad'});
      db.products=list.map(x=>({id:x.id,n:str(x.n,120),c:str(x.c,60),p:Math.max(0,Number(x.p)||0),k:str(x.k,20)||'#888',s:(Array.isArray(x.s)?x.s:[]).map(z=>str(z,20)).filter(Boolean).slice(0,20),
        ...(x.img&&String(x.img).startsWith('data:image/')?{img:String(x.img)}:{}),
        ...(Array.isArray(x.cl)&&x.cl.length?{cl:x.cl.slice(0,20).map(c=>({n:str(c.n,40),h:/^#[0-9a-f]{6}$/i.test(c.h)?c.h:'#888888',...(c.img&&String(c.img).startsWith('data:image/')?{img:String(c.img)}:{})}))}:{})}));
      save();return send(res,200,{ok:true});
    }
    if(p==='/api/login'&&req.method==='POST'){
      const ip=req.socket.remoteAddress,f=fails.get(ip)||{n:0,t:Date.now()};
      if(Date.now()-f.t>9e5){f.n=0;f.t=Date.now()}
      if(f.n>=5)return send(res,429,{error:'too many attempts'});
      const b=await body(req,1e4);
      if(!checkLogin(b.username,b.password)){f.n++;fails.set(ip,f);return send(res,401,{error:'invalid'})}
      fails.delete(ip);const sid=crypto.randomBytes(32).toString('hex');sessions.set(sid,Date.now()+12*36e5);
      const sec=req.headers['x-forwarded-proto']==='https'?'; Secure':'';
      return send(res,200,{ok:true},{'Set-Cookie':`sid=${sid}; HttpOnly; SameSite=Strict; Path=/; Max-Age=43200${sec}`});
    }
    if(p==='/api/logout'&&req.method==='POST'){const sid=((req.headers.cookie||'').match(/sid=([a-f0-9]+)/)||[])[1];sessions.delete(sid);return send(res,200,{ok:true},{'Set-Cookie':'sid=; Max-Age=0; Path=/'})}
    if(p==='/api/orders'&&req.method==='POST'){
      const b=await body(req,1e5),c=b.customer||{};
      const cust={name:str(c.name,100),phone:str(c.phone,20),email:str(c.email,120),city:str(c.city,60),address:str(c.address,300)};
      if(!cust.name||!/^[0-9+\s]{8,15}$/.test(cust.phone)||!cust.city||!cust.address)return send(res,400,{error:'bad customer'});
      const items=[];let sub=0;
      for(const i of (Array.isArray(b.items)?b.items:[]).slice(0,50)){
        const pr=db.products.find(x=>x.n===i.name),q=Number(i.qty);
        if(!pr||!Number.isInteger(q)||q<1||q>50)continue;
        items.push({name:pr.n,size:str(i.size,20),color:str(i.color,40),qty:q,price:pr.p});sub+=pr.p*q;
      }
      if(!items.length)return send(res,400,{error:'empty'});
      const id='o'+Date.now()+crypto.randomBytes(2).toString('hex'),date=new Date().toISOString();
      db.orders.push({id,customer:cust,note:str(b.note,500),items,subtotal:sub,shipping:SHIP,total:sub+SHIP,date,status:'جديد'});
      const key=cust.phone.replace(/\D/g,''),old=db.customers.findIndex(x=>x.key===key),rec={key,...cust,last:date};
      if(old>-1)db.customers[old]=rec;else db.customers.push(rec);
      save();return send(res,200,{ok:true,id});
    }
    if(p==='/api/orders'&&req.method==='GET'){if(!owner(req))return send(res,401,{error:'unauthorized'});return send(res,200,db.orders.slice().reverse())}
    if(p==='/api/customers'&&req.method==='GET'){if(!owner(req))return send(res,401,{error:'unauthorized'});return send(res,200,db.customers)}
    if(p.startsWith('/api/'))return send(res,404,{error:'not found'});
    let f=path.normalize(path.join(PUB,p==='/'?'index.html':p));
    if(!f.startsWith(PUB)||!fs.existsSync(f)||fs.statSync(f).isDirectory())f=path.join(PUB,'index.html');
    res.writeHead(200,{'Content-Type':MIME[path.extname(f)]||'application/octet-stream'});fs.createReadStream(f).pipe(res);
  }catch(e){send(res,e.message==='big'?413:400,{error:'bad request'})}
}).listen(PORT,()=>console.log('VEGO STORE running on http://localhost:'+PORT));
