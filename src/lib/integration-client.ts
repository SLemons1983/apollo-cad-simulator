import type { ActiveUnitSession, CadCall, CadPost } from "./cad-demo";
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

export async function completeCallOnMdt(call: CadCall) {
  const response = await fetch("/api/integration/cad/complete", {
    method:"POST", headers:{"content-type":"application/json"},
    body:JSON.stringify({radioIdentifier:call.assignedUnit,callNumber:call.cadCallNumber})
  });
  return response.json().catch(()=>({ok:false,error:"Invalid integration response"}));
}

export async function sendPostToMdt(session: ActiveUnitSession, post: CadPost) {
  const response = await fetch("/api/integration/cad/post", {
    method:"POST", headers:{"content-type":"application/json"},
    body:JSON.stringify({session,post})
  });
  return response.json().catch(()=>({ok:false,error:"Invalid integration response"}));
}

export async function sendUnitStatusToMdt(session: ActiveUnitSession, active = true) {
  const response = await fetch("/api/integration/cad/unit-status", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ ...session, active })
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

export async function fetchSharedUnitSessions(): Promise<ActiveUnitSession[] | null> {
  try {
    const response = await fetch("/api/integration/mdt/state", { cache: "no-store" });
    const data = await response.json();
    if (!response.ok || !data.ok || !data.sessionSync || !Array.isArray(data.sessions)) return null;
    return data.sessions.map((row: any) => ({
      id: row.id,
      physicalVehicle: row.physical_vehicle,
      radioIdentifier: row.radio_identifier,
      crewMembers: row.crew_members ?? [],
      rideAlongType: row.ride_along_type ?? "None",
      rideAlongName: row.ride_along_name ?? "",
      status: row.status,
      outOfServiceReason: row.out_of_service_reason || undefined,
      activeCallNumber: row.active_call_number || undefined,
      latitude: row.latitude ?? undefined,
      longitude: row.longitude ?? undefined,
      emergencyActive: Boolean(row.emergency_active),
      loggedOnAt: row.logged_on_at,
      updatedAt: row.updated_at
    })) as ActiveUnitSession[];
  } catch {
    return null;
  }
}
