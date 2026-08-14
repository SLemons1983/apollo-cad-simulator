import { NextResponse } from "next/server";
import { verifySignedRequest } from "../../../../../lib/integration-security";
import { cadIntegrationStore } from "../../../../../lib/integration-store";
export const runtime = "nodejs";
export async function POST(request: Request) {
  const raw = await request.text();
  const verified = verifySignedRequest(request, raw, "apollo-mdt", process.env.APOLLO_INTEGRATION_SECRET ?? "");
  if (!verified.ok) return NextResponse.json({ok:false,error:verified.error},{status:verified.status});
  const event = JSON.parse(raw);
  if (!event.radioIdentifier || typeof event.latitude!=="number" || typeof event.longitude!=="number") return NextResponse.json({ok:false,error:"Invalid location payload"},{status:400});
  cadIntegrationStore.locationByUnit.set(event.radioIdentifier,event);
  return NextResponse.json({ok:true});
}
