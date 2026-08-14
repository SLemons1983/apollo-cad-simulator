import { NextResponse } from "next/server";
import { cadIntegrationStore } from "../../../../../lib/integration-store";
export const runtime = "nodejs";
export async function GET() {
  return NextResponse.json({
    ok:true,
    statuses:Array.from(cadIntegrationStore.statusByUnit.values()),
    emergencies:Array.from(cadIntegrationStore.emergencyByUnit.values()),
    locations:Array.from(cadIntegrationStore.locationByUnit.values()),
  });
}
