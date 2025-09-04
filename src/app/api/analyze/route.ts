import { NextRequest, NextResponse } from "next/server";
import { readabilityMetrics, originalitySignals, styleSignals, scoreComposite, splitSentences, words } from "@/lib/analysis";
import { checkLocalPlag } from "@/lib/localPlag";
import { autoResources } from "@/lib/resourcesAuto";
import { featureValues, aiExplain } from "@/lib/explain";

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

    const sys = `Return strict JSON only with keys: grammar(array of {text,fix}), clarity(array of {text,fix}), evidence(array of {text}), improved(string). Rules: Preserve meaning; never invent sources; target grade 8–11; shorten if verbose.`;
    const user = `Text:\n${text}\n\nFind up to 8 grammar issues, 8 clarity issues, 5 evidence gaps. Provide an improved version that keeps citations/quotes.`;
    const llm = await llmJSON_direct(`${sys}\n${user}`);
    const fb = heuristicFallback(text);

    const grammarArr:Issue[]   = (Array.isArray(llm?.grammar) ? llm!.grammar   : fb.grammar).slice(0,8);
    const clarityArr:Issue[]   = (Array.isArray(llm?.clarity) ? llm!.clarity   : fb.clarity).slice(0,8);
    const evidenceArr:Issue[]  = (Array.isArray(llm?.evidence)? llm!.evidence  : fb.evidence).slice(0,5);
    const improved: string|undefined = typeof llm?.improved === "string" ? llm!.improved : undefined;

    // local overlap (kept server-side; UI may or may not show it)
    let localPlag:any;
    try { localPlag = await checkLocalPlag(text); } catch { localPlag = { enabled:false, checked:0, matched:0, score:0, results:[] }; }

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

    // features + explained AI%
    const feats = featureValues(
      text,
      { repetition: orig.repetition, links: orig.links },
      { burstiness: style.burstiness, passiveHits: style.passiveHits, entropy: style.entropy, stopRatio: style.stopRatio }
    );
    const explain = aiExplain(feats);

    const resources = await autoResources(text);

    // ---- Confidence & short-sample gating ----
    const wc = read.wc, sc = read.sc, paragraphs = paras.length;
    const tooShort = wc < 120 || sc < 5; // stricter gate
    const qualityConfidence = Math.round(
      100 * Math.min(1,
        0.65*Math.min(1, wc/300) +
        0.25*Math.min(1, sc/10) +
        0.10*Math.min(1, paragraphs/4)
      )
    );
    const aiConfidence = Math.round(
      100 * Math.min(1,
        0.7*Math.min(1, wc/350) + 0.3*Math.min(1, sc/10)
      )
    );
    let blsFinal = composite.bls;
    if (tooShort) blsFinal = Math.min(composite.bls, 25); // cap on tiny samples

    return NextResponse.json({
      bls: blsFinal,
      aiRisk: composite.aiRisk,
      aiPercent: explain.aiPercent,
      aiExplain: explain,
      features: feats,
      verdict: explain.aiPercent >= 70 ? "HIGH" : explain.aiPercent >= 40 ? "MEDIUM" : "LOW",
      breakdown: composite.breakdown,
      readability: {
        flesch: read.flesch, fkGrade: read.fkGrade, gunning: read.gunning,
        smog: read.smog, lix: read.lix, ari: read.ari, coleman: read.coleman
      },
      counts: { words: read.wc, sentences: read.sc, paragraphs: paras.length, unique: (new Set((text.toLowerCase().match(/[a-z']+/gi) ?? []))).size },
      flags: { quotesRatio: orig.quotesRatio, links: orig.links, passiveHits: style.passiveHits, weaselHits: style.weaselHits },
      plagiarism: localPlag,
      suggestions: { grammar: grammarArr, clarity: clarityArr, evidence: evidenceArr },
      improved,
      improvementPlan: [
        ...(read.fkGrade > 12 ? ["Reduce grade level to ~10: shorter sentences and simpler wording."] : []),
        ...(paras.length < Math.max(3, Math.ceil((read.wc||0)/200)) ? ["Add more paragraphs; one main idea per paragraph."] : []),
        ...((text.match(/https?:\/\/|www\./gi)||[]).length===0 ? ["Add 2–3 credible sources with links or DOIs."] : []),
        ...(explain.aiPercent >= 50 ? ["Add personal examples or primary data to lower AI suspicion."] : []),
        "Light polish: tighten sentences and verify any claims."
      ],
      resources,
      confidence: { quality: qualityConfidence, ai: aiConfidence, tooShort },
      notes: [
        "AI % = weighted sum of feature contributions (see 'Why this AI %').",
        "BLS weights: Originality 35, Clarity 25, Evidence 15, Structure 10, Voice 10, Mechanics 5.",
        ...(tooShort ? ["Short sample: metrics are capped and less reliable. Add more text for stable readings."] : [])
      ]
    });
  } catch (e:any) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
