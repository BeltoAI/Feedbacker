import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { prompt, max_tokens = 256, temperature = 0.2 } = await req.json();
    const base = process.env.LLM_URL;
    const model = process.env.LLM_MODEL || "local";
    if (!base) return NextResponse.json({ error: "LLM_URL not set" }, { status: 500 });

    const r = await fetch(`${base}/v1/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model, prompt, max_tokens, temperature })
    });

    if (!r.ok) {
      const t = await r.text();
      return NextResponse.json({ error: `LLM error: ${t}` }, { status: 502 });
    }
    const data = await r.json();
    const text = data?.choices?.[0]?.text ?? "";
    return NextResponse.json({ text });
  } catch (e:any) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
