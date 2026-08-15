import { NextResponse } from "next/server";
import { cadIntegrationStore } from "../../../../../lib/integration-store";
import { signedPost } from "../../../../../lib/integration-security";
export const runtime = "nodejs";
export async function GET() {
  let sessions: unknown[] = [];
  let sessionSync = false;
  const base = process.env.APOLLO_MDT_BASE_URL;
  const secret = process.env.APOLLO_INTEGRATION_SECRET ?? "";
  if (base && secret) {
    try {
      const result = await signedPost(
        `${base.replace(/\/$/, "")}/api/integration/cad/unit-sessions`,
        "ssc-cad-simulator",
        secret,
        { eventType: "UNIT_STATE_REQUEST", requestedAt: new Date().toISOString() }
      ) as { ok?: boolean; sessions?: unknown[] };
      sessions = result.sessions ?? [];
      sessionSync = Boolean(result.ok);
    } catch {}
  }
  return NextResponse.json({
    ok:true,
    sessions,
    sessionSync,
    statuses:Array.from(cadIntegrationStore.statusByUnit.values()),
    emergencies:Array.from(cadIntegrationStore.emergencyByUnit.values()),
    locations:Array.from(cadIntegrationStore.locationByUnit.values()),
  });
}
