import { existsSync,writeFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
if(existsSync('.env.local')){console.log('.env.local exists; left unchanged.');process.exit(0);}
const value=`APP_ORIGIN=http://localhost:3000\nADMIN_TOKEN=${randomBytes(32).toString('hex')}\nMODEL_PROVIDER=mock\nOPENAI_API_KEY=\nOPENAI_MODEL=gpt-5-mini\nDATA_DIR=.local-data\nMAX_MODEL_CALLS=400\nMAX_TURNS_PER_ROUND=12\nMAX_CONCURRENT=8\nAPP_BUDGET_USD=5\nMAX_OUTPUT_TOKENS=1024\nINPUT_USD_PER_MILLION=0.25\nOUTPUT_USD_PER_MILLION=2\nOPENAI_REASONING_EFFORT=minimal\n`;
writeFileSync('.env.local',value,{mode:0o600});console.log('Created .env.local with a random facilitator token. Read it privately; do not commit or project it.');
