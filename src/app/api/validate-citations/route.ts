import { NextRequest, NextResponse } from "next/server";

export async function POST(req:NextRequest){
  const { text } = await req.json();
  const urls = Array.from(new Set((text.match(/https?:\/\/[^\s)]+/gi) ?? []))).slice(0,15);
  const out:any[] = [];
  for(const u of urls){
    try{
      const r = await fetch(u, { redirect: "follow" as any });
      out.push({ url:u, ok:r.ok, status:r.status });
    }catch(e:any){
      out.push({ url:u, ok:false, error:String(e) });
    }
  }
  return NextResponse.json({ items: out });
}
