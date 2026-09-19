import { existsSync, mkdirSync, readFileSync, writeFileSync, renameSync, chmodSync } from 'node:fs';
import { dirname } from 'node:path';
import { randomUUID } from 'node:crypto';
export class Store {
  constructor(file) {
    this.file=file;mkdirSync(dirname(file),{recursive:true,mode:0o700});
    this.state=existsSync(file)?JSON.parse(readFileSync(file,'utf8')):{version:1,mode:'prompt',enabled:false,epoch:1,calls:0,spent:0,held:0,teams:[],events:[],pending:{},joinWindow:0,joinCount:0};
    if(this.state.version!==1)throw Error('Unsupported state version');
    // A process restart cannot recover an upstream in-flight call. Keep its reservation charged.
    if(Object.keys(this.state.pending).length){this.state.spent+=this.state.held;this.state.held=0;this.state.pending={};for(const t of this.state.teams)t.busyUntil=0;}
    this.flush();
  }
  flush(){const p=this.file+'.'+randomUUID()+'.tmp';writeFileSync(p,JSON.stringify(this.state),{mode:0o600});renameSync(p,this.file);chmodSync(this.file,0o600);}
  /** Synchronous transactions, single process only. Never pass an async callback. */
  tx(fn){const backup=structuredClone(this.state);try{const out=fn(this.state);if(out?.then)throw Error('Async store transaction not allowed');this.flush();return out;}catch(e){this.state=backup;throw e;}}
  read(){return this.state;}
}
