import { NextRequest, NextResponse } from "next/server";

function strip(html:string){
  return html
    .replace(/<script[\s\S]*?<\/script>/gi," ")
    .replace(/<style[\s\S]*?<\/style>/gi," ")
    .replace(/<[^>]+>/g," ")
    .replace(/\s+/g," ")
    .trim();
}
function tokens(t:string){ return (t.toLowerCase().match(/[a-z0-9’']+/g) ?? []); }

function topKeywords(text:string, k=12){
  const ws = tokens(text).filter(w=>w.length>4);
  const c:Record<string,number> = {};
  ws.forEach(w=>c[w]=(c[w]||0)+1);
  return Object.entries(c).sort((a,b)=>b[1]-a[1]).slice(0,k).map(([w])=>w);
}

function scoreTFIDF(doc:string, kws:string[]){
  const ws = tokens(doc);
  if(ws.length===0) return 0;
  const cnt:Record<string,number> = {};
  ws.forEach(w=>cnt[w]=(cnt[w]||0)+1);
  let score = 0;
  for (const k of kws){
    const tf = (cnt[k]||0)/ws.length;
    // crude idf proxy: reward longer keywords
    const idf = Math.log(1 + (10 / (k.length-3)));
    score += tf*idf;
  }
  return score*1000;
}

export async function POST(req:NextRequest){
  const { text, urls } = await req.json();
  const list = Array.isArray(urls) ? urls.slice(0,20) : [];
  const kw = topKeywords(String(text||""), 12);
  const out:any[] = [];
  for (const u of list){
    try {
      const r = await fetch(u, { redirect:"follow" as any, headers:{ "User-Agent":"FeedbackerBot/1.0" }});
      if(!r.ok) { out.push({ link:u, ok:false, status:r.status }); continue; }
      const body = await r.text();
      const clean = strip(body);
      const titleMatch = body.match(/<title>([\s\S]*?)<\/title>/i);
      const title = titleMatch ? strip(titleMatch[1]).slice(0,120) : u;
      const s = scoreTFIDF(clean, kw);
      // snippet near first keyword
      let pos = -1;
      for(const k of kw){ const i = clean.toLowerCase().indexOf(k.toLowerCase()); if(i>=0){ pos=i; break; } }
      let snippet = "";
      if(pos>=0){ const start = Math.max(0, pos-160), end = Math.min(clean.length, pos+160); snippet = clean.slice(start,end); }
      out.push({ ok:true, title, link:u, score: Math.round(s), snippet: snippet || clean.slice(0,160) });
    } catch(e:any){
      out.push({ link:u, ok:false, error:String(e) });
    }
  }
  out.sort((a,b)=> (b.ok?b.score: -1) - (a.ok?a.score:-1));
  return NextResponse.json({ items: out.slice(0,6) });
}
