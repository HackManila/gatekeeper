import http from 'node:http';
import { Readable } from 'node:stream';
import { existsSync } from 'node:fs';
if(existsSync('.env.local'))process.loadEnvFile('.env.local');
const {getApp}=await import('./lib/runtime.mjs');
const app=getApp();
const server=http.createServer(async(req,res)=>{
  try{
    const headers=new Headers();for(const[k,v]of Object.entries(req.headers)){if(v)headers.set(k,Array.isArray(v)?v.join(', '):v);}
    const request=new Request(new URL(req.url||'/',process.env.APP_ORIGIN||'http://localhost:3000'),{method:req.method,headers,...(!['GET','HEAD'].includes(req.method)?{body:Readable.toWeb(req),duplex:'half'}:{})});
    const response=await app.dispatch(request);res.writeHead(response.status,Object.fromEntries(response.headers.entries()));res.end(Buffer.from(await response.arrayBuffer()));
  }catch{if(!res.headersSent)res.writeHead(500,{'Content-Type':'application/json'});res.end('{"error":"Request failed."}');}
});
server.requestTimeout=60000;server.headersTimeout=15000;
server.listen(Number(process.env.PORT||3000),process.env.HOST||'0.0.0.0',()=>console.log('Gatekeeper listening. MODE='+ (process.env.MODEL_PROVIDER||'mock') +'; no credentials logged.'));
