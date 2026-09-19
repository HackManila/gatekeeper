/** This is the teaching boundary. The model can request, but never sets authority. */
export function applyGateAction(team, mode, action) {
  if(!action || action.name!=='open_gate' || !action.arguments || Array.isArray(action.arguments) ||
     typeof action.arguments!=='object' || Object.keys(action.arguments).length!==0)
    return {allowed:false,changed:false,reason:'Invalid or unknown action; gate unchanged.'};
  if(mode==='enforced' && team.hasPass!==true)
    return {allowed:false,changed:false,reason:'Denied by server: this player does not have a pass.'};
  if(team.gateOpen)return {allowed:true,changed:false,reason:'Gate was already open; no second award.'};
  team.gateOpen=true;
  return {allowed:true,changed:true,reason:mode==='enforced'?'Server verified the pass. Gate opened.':'Prompt-only application trusted the model request. Gate opened.'};
}
