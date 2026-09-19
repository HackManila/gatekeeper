// Exercise the actual Node HTTP server with temporary mock state. No provider calls.
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {randomBytes} from 'node:crypto';
import {createServer} from 'node:net';
import {fileURLToPath} from 'node:url';
const dir=await mkdtemp(join(tmpdir(),'gatekeeper-http-'));
const reserved=createServer();await new Promise(r=>reserved.listen(0,'127.0.0.1',r));
const port=reserved.address().port;await new Promise(r=>reserved.close(r));
const origin=`http://127.0.0.1:${port}`, token=randomBytes(32).toString('hex');
const cwd=fileURLToPath(new URL('..',import.meta.url));
let child;
async function start(){
 child=spawn(process.execPath,['server.mjs'],{cwd,env:{...process.env,PORT:String(port),HOST:'127.0.0.1',APP_ORIGIN:origin,ADMIN_TOKEN:token,MODEL_PROVIDER:'mock',OPENAI_API_KEY:'',DATA_DIR:dir},stdio:['ignore','pipe','pipe']});
 let errors='';child.stderr.on('data',b=>errors+=b.toString());
 for(let i=0;i<100;i++){
  if(child.exitCode!==null)throw Error(`Server exited ${child.exitCode}: ${errors}`);
  try{if((await fetch(origin+'/api/health')).ok)return;}catch{}
  await new Promise(r=>setTimeout(r,50));
 }
 throw Error('Server startup timed out');
}
async function stop(){if(child&&child.exitCode===null){const done=new Promise(r=>child.once('exit',r));child.kill('SIGTERM');await done;}}
async function api(path,data,{admin=false,cookie='',requestOrigin=origin}={}){
 const res=await fetch(origin+path,{method:data?'POST':'GET',headers:{...(data?{'Content-Type':'application/json',Origin:requestOrigin}:{}),...(admin?{Authorization:`Bearer ${token}`}:{ }),...(cookie?{Cookie:cookie}:{})},...(data?{body:JSON.stringify(data)}:{})});
 return {status:res.status,headers:res.headers,body:await res.json()};
}
const host=data=>api('/api/admin',data,{admin:true});
try{
 await start();
 assert.deepEqual((await api('/api/health')).body,{ok:true,provider:'mock'});
 for(const path of ['/','/facilitator','/ui.css','/client.js','/admin.js'])assert.equal((await fetch(origin+path)).status,200,path);
 assert.equal((await api('/api/admin')).status,401);
 assert.equal((await api('/api/join',{code:'invalid'},{requestOrigin:'https://wrong.invalid'})).status,403);
 const created=await host({action:'create',count:8});assert.equal(created.status,200);
 const teams=[];
 for(const c of created.body.codes){const joined=await api('/api/join',{code:c.code});assert.equal(joined.status,200);teams.push({id:joined.body.teamId,cookie:joined.headers.get('set-cookie').split(';')[0]});}
 await host({action:'enable',enabled:true});
 let v=await api('/api/chat',{message:'/open'},teams[0]);assert.equal(v.body.gateOpen,true);
 assert.equal((await api('/api/session',null,teams[1])).body.gateOpen,false);
 const replies=await Promise.all(teams.slice(1).map(t=>api('/api/chat',{message:'hello'},t)));assert.ok(replies.every(x=>x.status===200));
 await host({action:'round',mode:'enforced'});
 assert.equal((await api('/api/chat',{message:'/open'},teams[0])).status,409);
 await host({action:'enable',enabled:true});
 v=await api('/api/chat',{message:'/open'},teams[0]);assert.equal(v.body.gateOpen,false);
 await host({action:'grant',teamId:teams[0].id,hasPass:true});
 v=await api('/api/chat',{message:'/open'},teams[0]);assert.equal(v.body.gateOpen,true);
 const before=(await host({action:'enable',enabled:false})).body;
 await stop();await start();
 const after=(await host()).body;assert.equal(after.calls,before.calls);assert.equal(after.enabled,false);assert.equal(after.teams.length,8);
 assert.equal((await api('/api/session',null,teams[0])).body.gateOpen,true);
 for(const path of ['/.env.local','/data/state.json','/lib/config.mjs'])assert.equal((await fetch(origin+path)).status,404);
 console.log('PASS: HTTP routes, host auth, origin checks, 8 sessions, isolation, both rounds, valid pass, restart persistence. MOCK only.');
}finally{await stop();await rm(dir,{recursive:true,force:true});}
