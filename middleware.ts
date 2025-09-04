import { NextResponse } from "next/server";

const buckets = new Map<string,{ t:number, tokens:number }>();
const CAP=30, REFILL_MS=60000; // 30 requests/minute per IP (serverless instance local)

export function middleware(req:Request) {
  const url = new URL(req.url);
  if(!url.pathname.startsWith("/api/")) return NextResponse.next();

  const ip = (req.headers.get("x-forwarded-for") || "local").split(",")[0].trim();
  const now = Date.now();
  const b = buckets.get(ip) || { t:now, tokens:CAP };
  const elapsed = now - b.t;
  if(elapsed > REFILL_MS){ b.tokens = CAP; b.t = now; }
  if(b.tokens <= 0){
    return new NextResponse(JSON.stringify({ error:"rate_limited" }), { status:429, headers:{ "Content-Type":"application/json" } });
  }
  b.tokens -= 1; buckets.set(ip,b);
  return NextResponse.next();
}
export const config = { matcher: ['/api/:path*'] };
