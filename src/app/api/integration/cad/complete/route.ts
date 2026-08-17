import { NextResponse } from "next/server";
import { signedPost } from "../../../../../lib/integration-security";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    if (!payload.radioIdentifier || !payload.callNumber) {
      return NextResponse.json({ok:false,error:"Unit and call number are required"},{status:400});
    }
    const base=process.env.APOLLO_MDT_BASE_URL;
    if(!base)return NextResponse.json({ok:false,error:"APOLLO_MDT_BASE_URL is not configured"},{status:500});
    const result=await signedPost(`${base.replace(/\/$/,"")}/api/integration/cad/complete`,"ssc-cad-simulator",process.env.APOLLO_INTEGRATION_SECRET??"",payload);
    return NextResponse.json({ok:true,result});
  } catch(error) {
    return NextResponse.json({ok:false,error:error instanceof Error?error.message:"Completion delivery failed"},{status:502});
  }
}
