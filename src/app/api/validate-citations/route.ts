export const runtime = "nodejs";
import { NextRequest, NextResponse } from "next/server";

/** Normalize raw values into https/http URLs */
function normalizeUrls(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const out: string[] = [];
  for (const r of raw) {
    if (typeof r !== "string") continue;
    try {
      const hasProto = /^https?:\/\//i.test(r);
      const u = new URL(hasProto ? r : `https://${r}`);
      if (u.protocol === "http:" || u.protocol === "https:") out.push(u.toString());
    } catch { /* ignore bad values */ }
  }
  return Array.from(new Set(out)).slice(0, 20); // cap to 20
}

function withTimeout(ms: number) {
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), ms);
  const cancel = () => clearTimeout(t);
  return { signal: ac.signal, cancel };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const urls = normalizeUrls((body as any).urls);

    if (!urls.length) {
      return NextResponse.json({ items: [], note: "No valid http(s) URLs provided." });
    }

    const items = await Promise.all(urls.map(async (u) => {
      const { signal, cancel } = withTimeout(4500);
      try {
        const r = await fetch(u, { redirect: "follow", signal });
        cancel();
        return { url: u, ok: r.ok, status: r.status };
      } catch (e: any) {
        cancel();
        return { url: u, ok: false, error: String(e) };
      }
    }));

    return NextResponse.json({ items });
  } catch (e:any) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
