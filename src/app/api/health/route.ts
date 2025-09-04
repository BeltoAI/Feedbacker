import { NextResponse } from "next/server";
export async function GET() {
  const out:any = { env: {}, checks: {} };
  out.env.LLM_URL = !!process.env.LLM_URL;
  out.env.LLM_MODEL = !!process.env.LLM_MODEL;
  out.env.LOCAL_CORPUS = true;
  try {
    if (process.env.LLM_URL) {
      const r = await fetch(`${process.env.LLM_URL}/v1/completions`, {
        method:"POST", headers:{ "Content-Type":"application/json" },
        body: JSON.stringify({ model: process.env.LLM_MODEL || "local", prompt: "ping", max_tokens: 8, temperature: 0 })
      });
      out.checks.llm = { ok: r.ok, status: r.status };
    } else out.checks.llm = { ok:false, status: 0 };
  } catch(e:any){ out.checks.llm = { ok:false, error: String(e) }; }
  out.checks.search = { ok:true, mode:"local-only" };
  return NextResponse.json(out);
}
