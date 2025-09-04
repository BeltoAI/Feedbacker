import { NextRequest, NextResponse } from "next/server";
import { readabilityMetrics, originalitySignals, styleSignals, scoreComposite, splitSentences, words } from "@/lib/analysis";
import { checkPlagiarism } from "@/lib/plagiarism";
import { studyResources } from "@/lib/resources";

type Issue = { type:string; text:string; fix?:string };

async function llmJSON_direct(prompt:string){
  const base = process.env.LLM_URL;
  const model = process.env.LLM_MODEL || "local";
  if (!base) return null;
  try{
    const r = await fetch(`${base}/v1/completions`, {
      method:"POST",
      headers:{ "Content-Type":"application/json" },
      body: JSON.stringify({ model, prompt, max_tokens: 900, temperature: 0.2 })
    });
    if(!r.ok) return null;
    const data = await r.json();
    const text = data?.choices?.[0]?.text ?? "";
    const m = text.match(/\{[\s\S]*\}/);
    const raw = m? m[0] : text;
    return JSON.parse(raw);
  }catch{ return null; }
}

function aiReasons(text:string){
  const sents = splitSentences(text);
  const ws = words(text);
  const lens = sents.map(s=>words(s).length);
  const mean = lens.reduce((a,b)=>a+b,0)/(lens.length||1);
  const varc = lens.reduce((a,b)=>a+(b-mean)*(b-mean),0)/(lens.length||1);
  const burst = Math.sqrt(varc);
  const reasons:string[] = [];
  if (ws.length > 200 && burst < 6) reasons.push("Highly uniform sentence lengths (machine-like cadence).");
  if ((text.match(/As an AI language model/gi)||[]).length) reasons.push("Contains AI system self-disclosure phrase.");
  if ((text.match(/\[\d{4}\]/g)||[]).length >= 3 && !(text.match(/https?:\/\//)||[]).length) reasons.push("Citation-like brackets without real links.");
  if ((text.match(/Firstly|Secondly|Thirdly|In conclusion/gi)||[]).length >= 3) reasons.push("Template transitions overused.");
  return reasons;
}

function improvementPlan(read:any, counts:{paragraphs:number}, flags:{links:number}, aiPercent:number){
  const plan:string[] = [];
  if (read.fkGrade > 12) plan.push("Reduce grade level to ~10: shorter sentences and simpler wording.");
  if (counts.paragraphs < Math.max(3, Math.ceil((read.wc||0)/200))) plan.push("Add more paragraphs; one main idea per paragraph.");
  if (flags.links === 0) plan.push("Add 2–3 credible sources with links or DOIs.");
  if (aiPercent >= 50) plan.push("Add personal examples or primary data to lower AI suspicion.");
  if (plan.length === 0) plan.push("Light polish only: tighten sentences and verify any claims.");
  return plan.slice(0,5);
}

function heuristicFallback(text:string){
  const rs = readabilityMetrics(text);
  const sents = splitSentences(text);
  const grammar: Issue[] = [];
  sents.forEach((s, i) => {
    const wc = words(s).length;
    if (wc > 35) grammar.push({ type:"grammar", text:`Sentence ${i+1} is very long (${wc} words).`, fix:"Split into 2–3 shorter sentences with one idea each."});
  });
  const clarity: Issue[] = [];
  if (rs.fkGrade > 14) clarity.push({ type:"clarity", text:`Readability grade ~${rs.fkGrade.toFixed(1)} (dense).`, fix:"Shorten sentences, use simpler words, define terms."});
  const evidence: Issue[] = [];
  if ((text.match(/https?:\/\/|www\./gi)||[]).length === 0) evidence.push({ type:"evidence", text:"No citations or links to sources."});
  if (text.length > 500 && (text.match(/“|”|\"/g)||[]).length === 0) evidence.push({ type:"evidence", text:"No quotations or data points to support claims."});
  return { grammar: grammar.slice(0,8), clarity: clarity.slice(0,8), evidence: evidence.slice(0,5) };
}

export async function POST(req: NextRequest){
  try {
    const { text } = await req.json();
    if (!text || typeof text !== "string" || text.trim().length < 20){
      return NextResponse.json({ error: "Provide at least 20 characters." }, { status: 400 });
    }

    const paras = text.split(/\n\s*\n/).filter(p=>p.trim().length>0);
    const read = readabilityMetrics(text);
    const orig = originalitySignals(text);
    const style = styleSignals(text);

    const sys = `Return strict JSON only with keys: grammar(array of {text,fix}), clarity(array of {text,fix}), evidence(array of {text}), improved(string). Rules: Preserve meaning; never invent sources; keep existing quotes/citations; target grade 8–11; shorten if verbose.`;
    const user = `Text:\n${text}\n\nFind up to 8 grammar issues, 8 clarity issues, 5 evidence gaps. Provide an improved version that keeps citations/quotes.`;
    const llm = await llmJSON_direct(`${sys}\n${user}`);

    const fallback = heuristicFallback(text);
    const grammarArr:Issue[] = (Array.isArray(llm?.grammar) ? llm!.grammar : fallback.grammar).slice(0,8);
    const clarityArr:Issue[] = (Array.isArray(llm?.clarity) ? llm!.clarity : fallback.clarity).slice(0,8);
    const evidenceArr:Issue[] = (Array.isArray(llm?.evidence) ? llm!.evidence : fallback.evidence).slice(0,5);
    const improved: string | undefined = typeof llm?.improved === "string" ? llm!.improved : undefined;

    const plag = await checkPlagiarism(text);
    const reasons = aiReasons(text);

    const llmHints = {
      grammarPenalty: Math.min(15, grammarArr.length),
      clarityPenalty: Math.min(15, clarityArr.length),
      evidenceBonus: Math.min(30, evidenceArr.length*5)
    };

    const composite = scoreComposite(
      orig,
      { flesch: read.flesch, fkGrade: read.fkGrade },
      style,
      { wc: read.wc, sc: read.sc, paragraphs: paras.length },
      llmHints
    );

    // ---- AI % calculation (simple & transparent) ----
    // Base on aiRisk (0..100), add +10 if multiple explicit reasons, clamp 0..100
    const base = composite.aiRisk;
    const bonus = reasons.length >= 2 ? 10 : reasons.length === 1 ? 5 : 0;
    const aiPercent = Math.max(0, Math.min(100, Math.round(base + bonus)));

    const plan = improvementPlan(read as any, { paragraphs: paras.length }, { links: (text.match(/https?:\/\/|www\./gi)||[]).length }, aiPercent);
    const resources = await studyResources(text);

    return NextResponse.json({
      bls: composite.bls,
      aiRisk: composite.aiRisk,
      aiPercent,                 // <-- NEW (e.g., 30)
      aiReasons: reasons,
      verdict: aiPercent >= 70 ? "HIGH" : aiPercent >= 40 ? "MEDIUM" : "LOW",
      breakdown: composite.breakdown,
      readability: {
        flesch: read.flesch, fkGrade: read.fkGrade, gunning: read.gunning,
        smog: read.smog, lix: read.lix, ari: read.ari, coleman: read.coleman
      },
      counts: { words: read.wc, sentences: read.sc, paragraphs: paras.length, unique: (new Set((text.toLowerCase().match(/[a-z']+/gi) ?? []))).size },
      flags: { quotesRatio: orig.quotesRatio, links: orig.links, passiveHits: style.passiveHits, weaselHits: style.weaselHits },
      plagiarism: plag,
      suggestions: { grammar: grammarArr, clarity: clarityArr, evidence: evidenceArr },
      improved,
      improvementPlan: plan,     // <-- NEW
      resources,                 // <-- NEW
      notes: [
        plag.enabled ? `Plagiarism search checked ${plag.checked} shingles; matches: ${plag.matched}.` : "Plagiarism search disabled (missing SERPER_API_KEY).",
        "AI risk is an indicator; use with judgment.",
        "BLS weights: Originality 35, Clarity 25, Evidence 15, Structure 10, Voice 10, Mechanics 5."
      ]
    });
  } catch (e:any) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
