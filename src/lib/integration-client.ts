import type { CadCall } from "./cad-demo";
export async function sendCallToMdt(call: CadCall) {
  if (!call.assignedUnit) return {ok:false,error:"unassigned"};
  const response = await fetch("/api/integration/cad/send", {
    method:"POST", headers:{"content-type":"application/json"}, body:JSON.stringify(call)
  });
  const data = await response.json().catch(()=>({ok:false,error:"Invalid integration response"}));
  if (!response.ok || !data.ok) console.error("[Apollo CAD] MDT send failed", data);
  return data;
}
