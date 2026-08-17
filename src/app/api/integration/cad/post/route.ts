import { NextResponse } from "next/server";
import { signedPost } from "../../../../../lib/integration-security";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const {session,post}=await request.json();
    if(!session?.radioIdentifier||!post?.address)return NextResponse.json({ok:false,error:"Unit and post are required"},{status:400});
    const base=process.env.APOLLO_MDT_BASE_URL;
    if(!base)return NextResponse.json({ok:false,error:"APOLLO_MDT_BASE_URL is not configured"},{status:500});
    const stamp=Date.now();
    const payload={
      eventType:"POST_ASSIGNED",radioIdentifier:session.radioIdentifier,
      callNumber:`POST-${session.radioIdentifier}-${stamp}`,emsNumber:"POST",priority:"—",
      nature:`${post.name} Post · ${post.coverage}`,address:post.address,
      city:post.name,state:"CA",holdBackRequired:false,status:"Unit Available",
      postId:post.id,postName:post.name,postCoverage:post.coverage,cadTimestamp:new Date().toISOString()
    };
    const result=await signedPost(`${base.replace(/\/$/,"")}/api/integration/cad/call`,"ssc-cad-simulator",process.env.APOLLO_INTEGRATION_SECRET??"",payload);
    return NextResponse.json({ok:true,payload,result});
  }catch(error){
    return NextResponse.json({ok:false,error:error instanceof Error?error.message:"Post delivery failed"},{status:502});
  }
}
