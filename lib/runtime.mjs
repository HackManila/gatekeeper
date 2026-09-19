import { Store } from './store.mjs';
import { readConfig } from './config.mjs';
import { createApp } from './app.mjs';
export function getApp(){const key=Symbol.for('hackmanila.gatekeeper.app');if(!globalThis[key]){const config=readConfig();globalThis[key]=createApp({config,store:new Store(config.dataFile)});}return globalThis[key];}
