"use client";
import { useState, useMemo } from "react";
import Card from "@/app/(ui)/components/Card";
import { Bar } from "@/app/(ui)/components/Progress";
import { StatTile, ReadabilityPills, Badge, Icons } from "@/app/(ui)/components/Stats";

type Issue = { type:string; text:string; fix?:string };
type Hit = { title:string; link:string; snippet?:string };
type Plag = {
  enabled:boolean; checked:number; matched:number; score:number;
  matches:Array<{query:string; hit:Hit; snippetOverlap:number}>;
  sources:Array<{domain:string; count:number}>;
};
type Breakdown = { originality:number; clarity:number; evidence:number; structure:number; voice:number; mechanics:number };
type Readability = { flesch:number; fkGrade:number; gunning:number; smog:number; lix:number; ari:number; coleman:number };
type Report = {
  bls:number;
  aiRisk:number;
  aiPercent:number;
  aiReasons:string[];
  verdict:"LOW"|"MEDIUM"|"HIGH";
  breakdown:Breakdown;
  readability:Readability;
  counts:{ words:number; sentences:number; paragraphs:number; unique:number };
  flags:{ quotesRatio:number; links:number; passiveHits:number; weaselHits:number };
  plagiarism: Plag;
  suggestions:{ grammar: Issue[]; clarity: Issue[]; evidence: Issue[]; };
  improved?: string;
  improvementPlan: string[];
  resources: { enabled:boolean; items: Hit[] };
  notes: string[];
};

export default function Home() {
  const [text, setText] = useState("");
  const [res, setRes] = useState<Report|null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string|null>(null);

  const avgWordsPerSentence = useMemo(()=>{
    if(!res) return 0;
    return res.counts.sentences ? Math.round((res.counts.words / res.counts.sentences) * 10) / 10 : 0;
  }, [res]);

  async function analyze() {
    setBusy(true); setErr(null);
    try {
      const r = await fetch("/api/analyze", { method:"POST", headers:{ "Content-Type":"application/json" }, body: JSON.stringify({ text }) });
      if(!r.ok){ throw new Error(await r.text()); }
      setRes(await r.json());
    } catch(e:any){ setErr(e.message || "Failed"); }
    finally{ setBusy(false); }
  }
  function printReport(){ window.print(); }

  return (
    <main className="max-w-6xl mx-auto p-6">
      <header className="flex items-center justify-between mb-6">
        <div>
          <div className="text-3xl font-semibold">Feedbacker</div>
          <div className="text-sm text-gray-500">AI %, originality, clarity, sources — in one pass</div>
        </div>
        {res && <button onClick={printReport} className="no-print px-4 py-2 rounded-xl border">Print/PDF</button>}
      </header>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card title="Paste your text">
          <textarea
            value={text}
            onChange={e=>setText(e.target.value)}
            placeholder="Paste assignment text..."
            className="w-full h-[360px] p-4 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-300"
          />
          <div className="flex gap-3 mt-4">
            <button onClick={analyze} disabled={busy || !text.trim()} className="no-print px-4 py-2 rounded-xl bg-black text-white disabled:opacity-40">
              {busy ? "Analyzing..." : "Analyze"}
            </button>
          </div>
          {err && <div className="mt-3 text-red-600">{err}</div>}
        </Card>

        <div className="space-y-6">
          <Card title="AI Suspicion">
            {!res ? <div>Run analysis to see results.</div> :
              <div className="flex items-center gap-4">
                <div className="text-5xl">{res.aiPercent}%</div>
                <Badge level={res.verdict}/>
                <div className="text-sm text-gray-500">AI likelihood</div>
              </div>
            }
            {res && res.aiReasons.length > 0 &&
              <ul className="list-disc pl-5 text-sm mt-3">
                {res.aiReasons.map((x,i)=>(<li key={i}>{x}</li>))}
              </ul>
            }
          </Card>

          <Card title="Belto Learning Score">
            {!res ? <div/> :
              <div>
                <div className="text-5xl mb-2">{Math.round(res.bls)}</div>
                <div className="text-sm text-gray-500">AI Risk (raw): {Math.round(res.aiRisk)} / 100</div>
                <div className="mt-4">
                  <Bar label="Originality" value={res.breakdown.originality}/>
                  <Bar label="Clarity" value={res.breakdown.clarity}/>
                  <Bar label="Evidence" value={res.breakdown.evidence}/>
                  <Bar label="Structure" value={res.breakdown.structure}/>
                  <Bar label="Voice" value={res.breakdown.voice}/>
                  <Bar label="Mechanics" value={res.breakdown.mechanics}/>
                </div>
              </div>}
          </Card>
        </div>
      </div>

      {res &&
      <div className="mt-6 grid lg:grid-cols-3 gap-6 print-pg">
        <Card title="Snapshot">
          <div className="grid grid-cols-2 gap-3">
            <StatTile label="Words" value={res.counts.words} icon={<Icons.Type className="w-5 h-5 text-gray-500" />} />
            <StatTile label="Sentences" value={res.counts.sentences} icon={<Icons.AlignLeft className="w-5 h-5 text-gray-500" />} />
            <StatTile label="Avg words / sentence" value={avgWordsPerSentence} hint={avgWordsPerSentence>20 ? "Long. Aim 14–18." : "Reasonable."} icon={<Icons.AlertTriangle className="w-5 h-5 text-gray-500" />} />
            <StatTile label="Paragraphs" value={res.counts.paragraphs} icon={<Icons.AlignLeft className="w-5 h-5 text-gray-500" />} />
            <StatTile label="Unique words" value={res.counts.unique} icon={<Icons.Sparkles className="w-5 h-5 text-gray-500" />} />
            <StatTile label="Links" value={res.flags.links} icon={<Icons.Link className="w-5 h-5 text-gray-500" />} />
            <StatTile label="Quotes %" value={`${(res.flags.quotesRatio*100).toFixed(1)}%`} icon={<Icons.Quote className="w-5 h-5 text-gray-500" />} />
            <StatTile label="Passive hits" value={res.flags.passiveHits} icon={<Icons.BookOpenCheck className="w-5 h-5 text-gray-500" />} />
          </div>
        </Card>

        <Card title={res.plagiarism.enabled ? `Plagiarism` : "Plagiarism (disabled)"}>
          {!res.plagiarism.enabled ? <div className="text-sm text-gray-500">Set SERPER_API_KEY to enable overlap checks.</div> :
            <div>
              <div className="flex items-center gap-3 mb-3">
                <span className="text-3xl font-semibold">{res.plagiarism.score}</span>
                <span className="text-sm text-gray-500">Overlap score</span>
              </div>
              <div className="text-sm text-gray-600 mb-3">Checked {res.plagiarism.checked} passages; matches {res.plagiarism.matched}.</div>
              <div className="space-y-2">
                {res.plagiarism.sources.slice(0,5).map((s,i)=>(
                  <div key={i} className="flex justify-between text-sm">
                    <a className="truncate underline" href={`https://${s.domain}`} target="_blank" rel="noreferrer">{s.domain}</a>
                    <span>×{s.count}</span>
                  </div>
                ))}
              </div>
            </div>
          }
        </Card>

        <Card title="Readability">
          <div className="text-sm text-gray-600 mb-2">Lower is easier. Aim roughly grade 8–11 for general audiences.</div>
          <ReadabilityPills
            flesch={res.readability.flesch}
            fk={res.readability.fkGrade}
            gunning={res.readability.gunning}
            smog={res.readability.smog}
            lix={res.readability.lix}
            ari={res.readability.ari}
            coleman={res.readability.coleman}
          />
        </Card>
      </div>}

      {res &&
      <div className="mt-6 grid lg:grid-cols-2 gap-6 print-pg">
        <Card title="Grammar & Clarity">
          <div className="grid md:grid-cols-2 gap-6 text-sm">
            <div>
              <div className="font-medium mb-2">Grammar</div>
              <ul className="space-y-2 list-disc pl-5">
                {res.suggestions.grammar.length ? res.suggestions.grammar.map((g,i)=>(<li key={i}>{g.text}{g.fix?` → ${g.fix}`:""}</li>)) : <li>None detected.</li>}
              </ul>
            </div>
            <div>
              <div className="font-medium mb-2">Clarity</div>
              <ul className="space-y-2 list-disc pl-5">
                {res.suggestions.clarity.length ? res.suggestions.clarity.map((g,i)=>(<li key={i}>{g.text}{g.fix?` → ${g.fix}`:""}</li>)) : <li>None detected.</li>}
              </ul>
            </div>
          </div>
        </Card>

        <Card title="Improvement Plan">
          <ul className="list-disc pl-5 text-sm space-y-2">
            {res.improvementPlan.map((n,i)=>(<li key={i}>{n}</li>))}
          </ul>
        </Card>
      </div>}

      {res &&
      <div className="mt-6 grid lg:grid-cols-2 gap-6 print-pg">
        <Card title={res.resources.enabled ? "Study Resources" : "Study Resources (disabled)"}>
          {!res.resources.enabled ? <div className="text-sm text-gray-500">Set SERPER_API_KEY to enable study links.</div> :
            <ul className="list-disc pl-5 text-sm space-y-1">
              {res.resources.items.slice(0,6).map((h,i)=>(
                <li key={i}><a className="underline" href={h.link} target="_blank" rel="noreferrer">{h.title}</a></li>
              ))}
            </ul>
          }
        </Card>

        {res.improved &&
          <Card title="Clean Rewrite (Preview)">
            <pre className="whitespace-pre-wrap text-sm">{res.improved}</pre>
          </Card>
        }
      </div>}
    </main>
  );
}
