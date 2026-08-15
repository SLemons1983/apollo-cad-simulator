import { NextResponse } from "next/server";
import { signedPost } from "../../../../../lib/integration-security";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const session = await request.json();
    if (!session?.radioIdentifier || !session?.physicalVehicle || !session?.status) {
      return NextResponse.json(
        { ok: false, error: "Invalid unit-status payload" },
        { status: 400 }
      );
    }

    if (session.status === "Out of Service" && !session.outOfServiceReason?.trim()) {
      return NextResponse.json(
        { ok: false, error: "Out-of-service reason is required" },
        { status: 400 }
      );
    }

    const base = process.env.APOLLO_MDT_BASE_URL;
    const secret = process.env.APOLLO_INTEGRATION_SECRET ?? "";
    if (!base) {
      return NextResponse.json(
        { ok: false, error: "APOLLO_MDT_BASE_URL is not configured" },
        { status: 500 }
      );
    }

    const payload = {
      eventType: "UNIT_STATUS_CHANGED",
      radioIdentifier: session.radioIdentifier,
      physicalVehicle: session.physicalVehicle,
      status: session.status,
      outOfServiceReason: session.outOfServiceReason ?? "",
      source: "CAD",
      cadTimestamp: new Date().toISOString()
    };

    const result = await signedPost(
      `${base.replace(/\/$/, "")}/api/integration/cad/unit-status`,
      "ssc-cad-simulator",
      secret,
      payload
    );
    return NextResponse.json({ ok: true, result });
  } catch (error) {
    console.error("[Apollo CAD] outbound unit-status error", error);
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Outbound unit-status failed"
      },
      { status: 502 }
    );
  }
}
