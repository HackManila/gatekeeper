import { resolve } from 'node:path';
export function readConfig(env = process.env) {
  const n=(key,fallback,min,max)=>{const v=Number(env[key]??fallback);if(!Number.isFinite(v)||v<min||v>max)throw Error(`Invalid ${key}`);return v;};
  const origin=new URL(env.APP_ORIGIN || 'http://localhost:3000').origin;
  if(!['http:','https:'].includes(new URL(origin).protocol))throw Error('APP_ORIGIN must be HTTP(S)');
  const adminToken=env.ADMIN_TOKEN || '';
  if(adminToken.length<32 || /REPLACE|CHANGE_ME/.test(adminToken))throw Error('Set ADMIN_TOKEN to at least 32 random characters; run npm run setup');
  const provider=env.MODEL_PROVIDER || 'mock';
  if(!['mock','openai'].includes(provider))throw Error('MODEL_PROVIDER must be mock or openai');
  if(provider==='openai'&&!env.OPENAI_API_KEY)throw Error('OPENAI_API_KEY is required for live mode');
  return { origin, adminToken, provider, apiKey:env.OPENAI_API_KEY || '', model:env.OPENAI_MODEL||'gpt-5-mini',
    dataFile:resolve(env.DATA_DIR||'.local-data','state.json'), maxCalls:n('MAX_MODEL_CALLS',400,1,10000),
    maxTurns:n('MAX_TURNS_PER_ROUND',12,1,100), maxConcurrent:n('MAX_CONCURRENT',8,1,50),
    budget:n('APP_BUDGET_USD',5,.01,100), maxOutput:n('MAX_OUTPUT_TOKENS',1024,128,4096),
    maxMessage:1200, maxHistoryBytes:14000, timeoutMs:45000, sessionMs:12*60*60*1000,
    inputPrice:n('INPUT_USD_PER_MILLION',.25,0,100), outputPrice:n('OUTPUT_USD_PER_MILLION',2,0,1000),
    reasoning:env.OPENAI_REASONING_EFFORT || 'minimal' };
}
