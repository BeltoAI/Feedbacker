"use client";
import { useMemo, useState } from "react";
import Card from "@/app/(ui)/components/Card";
import ProgressRing from "@/app/(ui)/components/ProgressRing";
import { StatTile, ReadabilityPills, Badge, Icons } from "@/app/(ui)/components/Stats";
import ContribBar from "@/app/(ui)/components/ContribBar";
import FeatureRow from "@/app/(ui)/components/FeatureRow";
import BLSRings from "@/app/(ui)/components/BLSRings";
import Info from "@/app/(ui)/components/Info";

type Issue = { type:string; text:string; fix?:string };
type Hit = { title:string; link:string; snippet?:string; score?:number };
type Breakdown = { originality:number; clarity:number; evidence:number; structure:number; voice:number; mechanics:number };
type Readability = { flesch:number; fkGrade:number; gunning:number; smog:number; lix:number; ari:number; coleman:number };
type Explain = { aiPercent:number; contributions: Array<{ label:string; weight:number; score:number; contribution:number }> };
type Features = { entropy:number; burstiness:number; repetition:number; passiveHits:number; templateTransitions:number; linkCount:number; stopRatio:number; genericOpeners:number; sentences:number; words:number };
type Report = {
  bls:number; aiRisk:number; aiPercent:number; verdict:"LOW"|"MEDIUM"|"HIGH";
  breakdown:Breakdown; readability:Readability;
  counts:{ words:number; sentences:number; paragraphs:number; unique:number };
  flags:{ quotesRatio:number; links:number; passiveHits:number; weaselHits:number };
  features: Features;
  suggestions:{ grammar: Issue[]; clarity: Issue[]; evidence: Issue[]; };
  improved?: string; improvementPlan: string[];
  resources: { enabled:boolean; items: Hit[] };
  aiExplain: Explain;
  notes: string[];
};
type HL = { start:number; end:number; long:boolean; templ:boolean; passive:boolean; wc:number; text:string };

export default function Home() {
  const [text, setText] = useState("");
  const [res, setRes] = useState<Report|null>(null);
  const [hl, setHl] = useState<HL[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string|null>(null);

  const avgWordsPerSentence = useMemo(()=>{
    if(!res) return 0;
    return res.counts.sentences ? Math.round((res.counts.words / res.counts.sentences) * 10) / 10 : 0;
  }, [res]);

  async function analyze() {
    setBusy(true); setErr(null); setHl([]);
    try {
      const r = await fetch("/api/analyze", { method:"POST", headers:{ "Content-Type":"application/json" }, body: JSON.stringify({ text }) });
      if(!r.ok){ throw new Error(await r.text()); }
      const data = await r.json();
      setRes(data);
      const h = await fetch("/api/highlights", { method:"POST", headers:{ "Content-Type":"application/json" }, body: JSON.stringify({ text }) });
      setHl((await h.json()).ranges || []);
    } catch(e:any){ setErr(e.message || "Failed"); }
    finally{ setBusy(false); }
  }

  async function transform(action:string){
    const r = await fetch("/api/transform", { method:"POST", headers:{ "Content-Type":"application/json" }, body: JSON.stringify({ text, action }) });
    const j = await r.json();
    setText(j.text);
  }
  function printReport(){ window.print(); }

  return (
    <main className="max-w-6xl mx-auto p-6">
      <header className="mb-6 rounded-2xl bg-gradient-to-r from-black via-gray-800 to-black text-white p-6 overflow-hidden">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-3xl font-semibold">Feedbacker</div>
            <div className="text-sm opacity-80">Explainable AI %, beautiful BLS, curated sources</div>
          </div>
          {res && <button onClick={printReport} className="no-print px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20">Print/PDF</button>}
        </div>
      </header>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card title="Paste your text">
          <textarea
            value={text}
            onChange={e=>setText(e.target.value)}
            placeholder="Paste assignment text..."
            className="w-full h-[300px] p-4 rounded-2xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-300 break-words"
          />
          <div className="flex flex-wrap gap-3 mt-4">
            <button onClick={analyze} disabled={busy || !text.trim()} className="no-print px-4 py-2 rounded-xl bg-black text-white disabled:opacity-40">
              {busy ? "Analyzing..." : "Analyze"}
            </button>
            <button onClick={()=>transform("split")} className="no-print px-3 py-2 rounded-xl border">Split long sentences</button>
            <button onClick={()=>transform("paragraphs")} className="no-print px-3 py-2 rounded-xl border">Add paragraph breaks</button>
            <button onClick={()=>transform("simplify")} className="no-print px-3 py-2 rounded-xl border">Simplify wording</button>
            <button onClick={()=>transform("rewrite")} className="no-print px-3 py-2 rounded-xl border">Generate improved draft</button>
          </div>
          {err && <div className="mt-3 text-red-600">{err}</div>}
        </Card>

        <div className="space-y-6">
          <Card title="Verdicts">
            {!res ? <div>Run analysis to see results.</div> :
              <div>
                <div className="grid sm:grid-cols-2 gap-6">
                  <div className="flex items-center gap-4">
                    <div className="text-green-600"><ProgressRing value={res.aiExplain.aiPercent} label="AI likelihood (%)" /></div>
                    <Badge level={res.verdict}/>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-blue-600"><ProgressRing value={res.bls} label="Belto Learning Score" /></div>
                  </div>
                </div>
                <div className="mt-4">
                  <div className="font-medium mb-2">Why this AI % (feature contributions) <Info text="Eight stylometric features; hover each bar to see contribution number."/></div>
                  {res.aiExplain?.contributions?.length
                    ? res.aiExplain.contributions.map((c,i)=>(
                        <div key={i} title={`Score ${c.score} → +${c.contribution}`}>
                          <ContribBar label={c.label} score={c.score} contribution={c.contribution}/>
                        </div>
                      ))
                    : <div className="text-sm text-gray-500">No contributions available.</div>}
                </div>
              </div>
            }
          </Card>

          <Card title="AI Signals (raw)">
            {!res ? <div className="text-sm text-gray-500">Analyze to populate.</div> :
              <div>
                <div className="text-xs text-gray-600 mb-2 flex items-center gap-2">
                  <span>Higher entropy/burstiness = more human-like variation.</span>
                  <Info text="Entropy≈distribution diversity; Burstiness≈sentence length variance; Repetition≈reused 4-grams; Template transitions≈‘Firstly/In conclusion’; Stop-word ratio far from ~0.47 can look synthetic."/>
                </div>
                <FeatureRow label="Entropy (↑ more human)" value={res.features.entropy.toFixed(2)} bar={(res.features.entropy/8)*100}/>
                <FeatureRow label="Burstiness (↑ varied cadence)" value={res.features.burstiness.toFixed(2)} bar={(res.features.burstiness/14)*100}/>
                <FeatureRow label="Repetition (0..1)" value={res.features.repetition.toFixed(3)} bar={res.features.repetition*100}/>
                <FeatureRow label="Passive voice (count)" value={res.features.passiveHits} bar={(res.features.passiveHits/10)*100}/>
                <FeatureRow label="Template transitions" value={res.features.templateTransitions} bar={(res.features.templateTransitions/10)*100}/>
                <FeatureRow label="Link count" value={res.features.linkCount} bar={(Math.min(res.features.linkCount,6)/6)*100}/>
                <FeatureRow label="Stop-word ratio" value={res.features.stopRatio.toFixed(2)} bar={Math.min(100, Math.abs(res.features.stopRatio-0.47)/0.47*100)}/>
                <FeatureRow label="Generic sentence openers" value={res.features.genericOpeners} bar={(res.features.sentences? (res.features.genericOpeners/res.features.sentences):0)*100}/>
              </div>
            }
          </Card>
        </div>
      </div>

      {res &&
      <div className="mt-6 grid lg:grid-cols-2 gap-6 print-pg">
        <Card title="BLS Breakdown (beautiful rings)">
          <BLSRings breakdown={res.breakdown}/>
        </Card>

        <Card title="Readability">
          <div className="text-sm text-gray-600 mb-2 flex items-center gap-2">
            <span>Grade-level metrics: lower is easier. Flesch (0–100): higher is easier.</span>
            <Info text="Flesch≥60 easy to read. FK/Gunning/SMOG/ARI/Coleman are U.S. grade estimates (target 8–11). LIX ≈ European complexity scale (lower is easier)."/>
          </div>
          <ReadabilityPills
            flesch={res.readability.flesch}
            fk={res.readability.fkGrade}
            gunning={res.readability.gunning}
            smog={res.readability.smog}
            lix={res.readability.lix}
            ari={res.readability.ari}
            coleman={res.readability.coleman}
          />
          <ul className="mt-3 text-xs text-gray-600 space-y-1">
            <li><b>Flesch:</b> 100 easy / 0 very hard.</li>
            <li><b>FK Grade, Gunning, SMOG, ARI, Coleman:</b> estimated U.S. grade; aim ~8–11 for broad audiences.</li>
            <li><b>LIX:</b> <span className="font-mono">20–30</span> very easy, <span className="font-mono">50–60</span> hard.</li>
          </ul>
        </Card>
      </div>}

      {res &&
      <div className="mt-6 grid lg:grid-cols-2 gap-6 print-pg">
        <Card title="Suggested Sources (auto)">
          <ul className="space-y-2 text-sm">
            {res.resources.items.map((h,i)=>(
              <li key={i} className="border rounded-lg p-2 break-words">
                <a className="underline font-medium" href={h.link} target="_blank" rel="noreferrer">{h.title}</a>
                <div className="text-xs text-gray-600 break-words">{h.link}</div>
              </li>
            ))}
          </ul>
        </Card>

        <Card title="Improvement Plan">
          <ul className="list-disc pl-5 text-sm space-y-2">
            {res.improvementPlan.map((n,i)=>(<li key={i}>{n}</li>))}
          </ul>
          <div className="flex flex-wrap gap-2 mt-3 no-print">
            <button onClick={()=>transform("split")} className="px-3 py-2 rounded-xl border">Split long sentences</button>
            <button onClick={()=>transform("paragraphs")} className="px-3 py-2 rounded-xl border">Add paragraph breaks</button>
            <button onClick={()=>transform("simplify")} className="px-3 py-2 rounded-xl border">Simplify wording</button>
            <button onClick={()=>transform("rewrite")} className="px-3 py-2 rounded-xl border">Generate improved draft</button>
          </div>
        </Card>
      </div>}

      {res?.improved &&
        <div className="mt-6 print-pg">
          <Card title="Clean Rewrite (Preview)">
            <pre className="whitespace-pre-wrap text-sm break-words">{res.improved}</pre>
          </Card>
        </div>
      }

      <div className="mt-6 print-pg">
        <Card title="How it works">
          <ol className="list-decimal pl-5 text-sm space-y-2">
            <li>AI % = weighted sum of eight feature contributions. See bars and raw signals above.</li>
            <li>BLS measures quality only (six rings), independent of AI %.</li>
            <li>Suggested Sources are topic-matched; extend via <code>/public/resources.json</code>.</li>
          </ol>
        </Card>
      </div>
    </main>
  );
}
