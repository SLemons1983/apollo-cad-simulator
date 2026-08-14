import { NextResponse } from "next/server";
import { signedPost } from "../../../../../lib/integration-security";

export const runtime = "nodejs";
export async function POST(request: Request) {
  try {
    const call = await request.json();
    if (!call?.assignedUnit) return NextResponse.json({ ok:false, error:"Call is not assigned" }, { status:400 });
    const base = process.env.APOLLO_MDT_BASE_URL;
    const secret = process.env.APOLLO_INTEGRATION_SECRET ?? "";
    if (!base) return NextResponse.json({ ok:false, error:"APOLLO_MDT_BASE_URL is not configured" }, { status:500 });
    const payload = {
      eventType: "CALL_ASSIGNED",
      radioIdentifier: call.assignedUnit,
      callNumber: call.cadCallNumber,
      emsNumber: call.emsNumber,
      priority: call.priority,
      zone: call.zone,
      nature: call.problem,
      facility: call.facility,
      address: call.address,
      city: call.city,
      state: call.state,
      zip: call.zip,
      suite: call.suite,
      holdBackRequired: Boolean(call.holdBackRequired),
      dispatchComments: call.dispatchComments ?? "",
      premiseNotes: call.premiseNotes ?? "",
      cautionNotes: call.cautionNotes ?? "",
      status: call.status,
      cadTimestamp: new Date().toISOString(),
    };
    const result = await signedPost(`${base.replace(/\/$/,"")}/api/integration/cad/call`, "ssc-cad-simulator", secret, payload);
    return NextResponse.json({ ok:true, result });
  } catch (error) {
    console.error("[Apollo CAD] outbound integration error", error);
    return NextResponse.json({ ok:false, error:error instanceof Error ? error.message : "Outbound integration failed" }, { status:502 });
  }
}
