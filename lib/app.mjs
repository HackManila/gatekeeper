import { randomBytes, randomUUID, createHash, timingSafeEqual } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { applyGateAction } from './policy.mjs';
import { buildModelInput, callModel } from './model.mjs';
const hash=v=>createHash('sha256').update(v).digest('hex');
const safeEqual=(a,b)=>{const x=Buffer.from(a),y=Buffer.from(b);return x.length===y.length&&timingSafeEqual(x,y);};
const fail=(code,message)=>{const e=Error(message);e.status=code;throw e;};
const staticFiles={'/':['index.html','text/html; charset=utf-8'],'/facilitator':['admin.html','text/html; charset=utf-8'],'/ui.css':['ui.css','text/css; charset=utf-8'],'/client.js':['client.js','text/javascript; charset=utf-8'],'/admin.js':['admin.js','text/javascript; charset=utf-8']};
const headers={'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','X-Frame-Options':'DENY','Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src 'self' data:; frame-ancestors 'none'; base-uri 'none'; form-action 'self'"};
const json=(v,status=200,extra={})=>new Response(JSON.stringify(v),{status,headers:{...headers,'Content-Type':'application/json',...extra}});
function exact(obj,keys){if(!obj||typeof obj!=='object'||Array.isArray(obj)||Object.keys(obj).some(k=>!keys.includes(k)))fail(400,'Unexpected request fields.');}
async function body(req){
  if(!(req.headers.get('content-type')||'').startsWith('application/json'))fail(415,'Use application/json.');
  const reader=req.body?.getReader();let chunks=[],size=0;
  if(reader){while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>8192){await reader.cancel();fail(413,'Request too large.');}chunks.push(value);}}
  try{return JSON.parse(Buffer.concat(chunks).toString('utf8'));}catch{fail(400,'Invalid JSON.');}
}
function log(state,event){state.events.push({id:randomUUID(),at:new Date().toISOString(),...event});state.events=state.events.slice(-800);}
export function createApp({config,store,model=callModel}){
  function authorized(req){const value=req.headers.get('authorization')||'';if(!safeEqual(value,'Bearer '+config.adminToken))fail(401,'Facilitator authorization required.');}
  function origin(req){if(req.headers.get('origin')!==config.origin)fail(403,'Origin rejected. Check APP_ORIGIN.');}
  function teamFor(req){const raw=(req.headers.get('cookie')||'').split(';').map(x=>x.trim()).find(x=>x.startsWith('hm_session='))?.slice(11)||'';if(!/^[A-Za-z0-9_-]{43}$/.test(raw))return null;const t=store.read().teams.find(t=>t.tokenHash===hash(raw));return t&&Date.now()-t.createdAt<config.sessionMs?t:null;}
  function view(team){const s=store.read();return {joined:!!team,provider:config.provider,model:config.provider==='openai'?config.model:'SIMULATED / mock',mode:s.mode,enabled:s.enabled,epoch:s.epoch,maxTurns:config.maxTurns,...(team?{team:team.label,teamId:team.id,gateOpen:team.gateOpen,hasPass:team.hasPass,turns:team.turns,busy:team.busyUntil>Date.now(),messages:team.messages}:{} )};}
  function expire(s){const now=Date.now();for(const [id,p]of Object.entries(s.pending)){if(p.until<now){s.held=Math.max(0,s.held-p.reserve);s.spent+=p.reserve;const t=s.teams.find(t=>t.id===p.teamId);if(t)t.busyUntil=0;delete s.pending[id];}}}
  function adminView(){const s=store.read();return {provider:config.provider,model:config.model,mode:s.mode,enabled:s.enabled,epoch:s.epoch,calls:s.calls,maxCalls:config.maxCalls,spent:s.spent,held:s.held,budget:config.budget,pending:Object.keys(s.pending).length,teams:s.teams.map(t=>({id:t.id,label:t.label,joined:!!t.tokenHash,hasPass:t.hasPass,gateOpen:t.gateOpen,turns:t.turns})),events:s.events.slice(-80).reverse()};}
  async function dispatch(req){try{
    const url=new URL(req.url),path=url.pathname;
    if(req.method==='GET'&&staticFiles[path]){const [name,type]=staticFiles[path];return new Response(readFileSync(fileURLToPath(new URL('../public/'+name,import.meta.url))),{headers:{...headers,'Content-Type':type}});}
    if(req.method==='GET'&&path==='/api/health')return json({ok:true,provider:config.provider});
    if(req.method==='GET'&&path==='/api/session')return json(view(teamFor(req)));
    if(req.method==='GET'&&path==='/api/admin'){authorized(req);return json(adminView());}
    if(req.method!=='POST')return json({error:'Not found.'},404);
    origin(req);
    if(path==='/api/admin'){
      authorized(req);const data=await body(req);exact(data,['action','count','mode','enabled','teamId','hasPass','confirm']);
      let codes;
      store.tx(s=>{
        expire(s);
        if(data.action==='create'){
          const count=Number(data.count);if(!Number.isInteger(count)||count<1||count>60||s.teams.length+count>200)fail(400,'Create 1–60 teams, up to 200 total.');
          codes=[];for(let i=0;i<count;i++){const code=randomBytes(16).toString('base64url'),t={id:randomUUID(),label:'Team '+String(s.teams.length+1).padStart(2,'0'),codeHash:hash(code),tokenHash:null,createdAt:Date.now(),hasPass:false,gateOpen:false,turns:0,busyUntil:0,messages:[]};s.teams.push(t);codes.push({team:t.label,code});}
        }else if(data.action==='round'){
          if(!['prompt','enforced'].includes(data.mode))fail(400,'Unknown round.');s.mode=data.mode;s.epoch++;s.enabled=false;
          for(const t of s.teams){t.gateOpen=false;t.hasPass=false;t.turns=0;t.messages=[];}
          log(s,{source:'admin',kind:'round',text:'Changed round; paused, gates closed, passes cleared. In-flight results will not apply.'});
        }else if(data.action==='enable'){
          if(typeof data.enabled!=='boolean')fail(400,'enabled must be boolean.');s.enabled=data.enabled;if(!s.enabled)s.epoch++;
          log(s,{source:'admin',kind:'control',text:s.enabled?'Round started.':'Round paused; in-flight results cannot change a gate.'});
        }else if(data.action==='grant'){
          const t=s.teams.find(t=>t.id===data.teamId);if(!t||typeof data.hasPass!=='boolean')fail(400,'Select a team and pass state.');t.hasPass=data.hasPass;t.gateOpen=false;
          log(s,{source:'admin',kind:'entitlement',team:t.label,text:'Server pass set to '+data.hasPass+'; gate reset.'});
        }else if(data.action==='probe'){
          const t=s.teams.find(t=>t.id===data.teamId);if(!t)fail(400,'Select a team.');if(t.busyUntil>Date.now())fail(409,'Wait for this team request to finish.');
          const outcome=applyGateAction(t,s.mode,{name:'open_gate',arguments:{}});t.messages.push({kind:'application',text:'SIMULATED TOOL REQUEST (no model call): '+outcome.reason});
          log(s,{source:'simulation',kind:'probe',team:t.label,mode:s.mode,outcome,text:'SIMULATED tool request; this is not a live jailbreak.'});
        }else if(data.action==='purge'){
          if(s.enabled||Object.keys(s.pending).length||data.confirm!=='PURGE')fail(409,'Pause, wait for active calls, and confirm PURGE.');s.teams=[];s.events=[];s.epoch++;
          // Spend and call counts deliberately survive a purge.
        }else fail(400,'Unknown action.');
      });return json({...adminView(),...(codes?{codes}:{} )});
    }
    if(path==='/api/join'){
      const data=await body(req);exact(data,['code']);if(typeof data.code!=='string'||data.code.length>80)fail(400,'Enter your team code.');
      const raw=randomBytes(32).toString('base64url');let id;
      // Enrollment throttle is global, not a low per-IP cap that blocks venue Wi-Fi.
      const joinAllowed=store.tx(s=>{const window=Math.floor(Date.now()/60000);if(s.joinWindow!==window){s.joinWindow=window;s.joinCount=0;}s.joinCount++;return s.joinCount<=120;});
      if(!joinAllowed)fail(429,'Enrollment busy; ask the host and try shortly.');
      store.tx(s=>{const t=s.teams.find(t=>t.codeHash===hash(data.code.trim()));if(!t||t.tokenHash||Date.now()-t.createdAt>=config.sessionMs)fail(401,'Code invalid, already used, or expired. Ask the host.');t.tokenHash=hash(raw);id=t.id;});
      const cookie=`hm_session=${raw}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${Math.floor(config.sessionMs/1000)}${config.origin.startsWith('https:')?'; Secure':''}`;
      return json(view(store.read().teams.find(t=>t.id===id)),200,{'Set-Cookie':cookie});
    }
    if(path==='/api/chat'){
      const team=teamFor(req);if(!team)fail(401,'Join with your team code first.');
      const data=await body(req);exact(data,['message']);if(typeof data.message!=='string'||!data.message.trim()||data.message.length>config.maxMessage)fail(400,`Send 1–${config.maxMessage} characters.`);
      const message=data.message.trim(),id=randomUUID();let snapshot,input;
      store.tx(s=>{
        expire(s);const t=s.teams.find(t=>t.id===team.id);
        if(!s.enabled)fail(409,'The host has paused this round.');
        if(t.busyUntil>Date.now())fail(409,'One message at a time per team.');
        if(t.turns>=config.maxTurns)fail(429,'Team attempt limit reached for this round.');
        if(s.calls>=config.maxCalls)fail(429,'Workshop model-call limit reached.');
        if(Object.keys(s.pending).length>=config.maxConcurrent)fail(429,'All model slots are busy. Try again shortly.');
        snapshot=structuredClone(t);input=buildModelInput(snapshot,message,config);
        // Conservative estimate, not a promise about provider billing/tokenization.
        const reserve=config.provider==='mock'?0:((Buffer.byteLength(JSON.stringify(input))+2000)*config.inputPrice+config.maxOutput*config.outputPrice)/1e6;
        if(s.spent+s.held+reserve>config.budget)fail(429,'Workshop estimated budget limit reached.');
        t.turns++;t.busyUntil=Date.now()+config.timeoutMs+5000;s.calls++;s.held+=reserve;
        s.pending[id]={teamId:t.id,epoch:s.epoch,until:t.busyUntil,reserve};
      });
      let result,error;
      try{result=await model({team:snapshot,message,input,config});}catch(e){error=e.message==='MODEL_RATE_LIMIT'?'Provider is rate-limiting. Ask the host; this attempt is not automatically retried.':'Model call did not complete. Gate unchanged. Ask the host.';}
      store.tx(s=>{
        const p=s.pending[id];if(!p)return;delete s.pending[id];s.held=Math.max(0,s.held-p.reserve);
        const usage=result?.usage;const cost=usage&&Number.isFinite(usage.input_tokens)&&Number.isFinite(usage.output_tokens)?(Math.max(0,usage.input_tokens)*config.inputPrice+Math.max(0,usage.output_tokens)*config.outputPrice)/1e6:p.reserve;
        s.spent+=config.provider==='mock'?0:cost;
        const t=s.teams.find(t=>t.id===p.teamId);if(!t)return;t.busyUntil=0;
        if(s.epoch!==p.epoch||!s.enabled){log(s,{team:t.label,source:result?.source||'error',kind:'discarded',text:'In-flight result discarded after pause/round change; request may still be billable.'});return;}
        t.messages.push({kind:'player',text:message});
        if(error){t.messages.push({kind:'application',text:error});log(s,{team:t.label,source:'error',kind:'error',text:error});return;}
        t.messages.push({kind:'npc',text:result.text});
        const outcome=result.action?applyGateAction(t,s.mode,result.action):{allowed:false,changed:false,reason:'No action requested. Gate unchanged.'};
        t.messages.push({kind:'application',text:outcome.reason});t.messages=t.messages.slice(-36);
        log(s,{team:t.label,mode:s.mode,source:result.source,kind:'turn',prompt:message,reply:result.text,action:result.action?.name||null,outcome});
      });return json({...view(store.read().teams.find(t=>t.id===team.id)),...(error?{warning:error}:{} )});
    }
    return json({error:'Not found.'},404);
  }catch(e){return json({error:e.status?e.message:'Server error. Ask the host; no details exposed.'},e.status||500);}}
  return {dispatch,adminView};
}
