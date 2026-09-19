import { getApp } from '../../lib/runtime.mjs';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export function GET(request){return getApp().dispatch(request);}
