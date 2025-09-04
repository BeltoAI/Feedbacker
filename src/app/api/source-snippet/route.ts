import { NextRequest, NextResponse } from "next/server";

function strip(html:string){
  return html
    .replace(/<script[\s\S]*?<\/script>/gi," ")
    .replace(/<style[\s\S]*?<\/style>/gi," ")
    .replace(/<[^>]+>/g," ")
    .replace(/\s+/g," ")
    .trim();
}

export async function POST(req:NextRequest){
  const { url, query } = await req.json();
  if(!url || !query) return NextResponse.json({ error:"url and query required" },{status:400});
  try{
    const r = await fetch(url, { redirect:"follow" as any });
    if(!r.ok){ return NextResponse.json({ error:`fetch ${r.status}` },{status:502}); }
    const raw = await r.text();
    const txt = strip(raw).toLowerCase();
    const q = query.toLowerCase().slice(0,240);
    const i = txt.indexOf(q.split(" ").slice(0,8).join(" "));
    let excerpt = "";
    if(i>=0){
      const start = Math.max(0, i-240), end = Math.min(txt.length, i+240);
      excerpt = txt.slice(start,end);
    }
    return NextResponse.json({ excerpt });
  }catch(e:any){
    return NextResponse.json({ error:String(e) }, {status:500});
  }
}
