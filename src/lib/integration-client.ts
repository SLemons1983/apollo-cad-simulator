import type { ActiveUnitSession, CadCall } from "./cad-demo";
export async function sendCallToMdt(call: CadCall) {
  if (!call.assignedUnit) return {ok:false,error:"unassigned"};
  const response = await fetch("/api/integration/cad/send", {
    method:"POST", headers:{"content-type":"application/json"}, body:JSON.stringify(call)
  });
  const data = await response.json().catch(()=>({ok:false,error:"Invalid integration response"}));
  if (!response.ok || !data.ok) {
    console.warn("[Apollo CAD] MDT call delivery is currently unavailable", data);
  }
  return data;
}

export async function sendUnitStatusToMdt(session: ActiveUnitSession) {
  const response = await fetch("/api/integration/cad/unit-status", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(session)
  });
  const data = await response.json().catch(() => ({
    ok: false,
    error: "Invalid integration response"
  }));
  if (!response.ok || !data.ok) {
    console.warn("[Apollo CAD] MDT unit-status delivery is currently unavailable", data);
  }
  return data;
}
