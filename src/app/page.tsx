"use client";
import { useEffect, useMemo, useState } from "react";
import Card from "@/app/(ui)/components/Card";
import { Bar } from "@/app/(ui)/components/Progress";
import ProgressRing from "@/app/(ui)/components/ProgressRing";
import { StatTile, ReadabilityPills, Badge, Icons } from "@/app/(ui)/components/Stats";

type Issue = { type:string; text:string; fix?:string };
type Hit = { title:string; link:string; snippet?:string };
type LocalPlag = { enabled:boolean; checked:number; matched:number; score:number; results:Array<{title:string; overlap:number; matches:number; sample:string}> };
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
  plagiarism: LocalPlag;
  suggestions:{ grammar: Issue[]; clarity: Issue[]; evidence: Issue[]; };
  improved?: string;
  improvementPlan: string[];
  resources: { enabled:boolean; items: Hit[] };
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
  function printReport(){ window.print(); }

  return (
    <main className="max-w-6xl mx-auto p-6">
      <header className="flex items-center justify-between mb-6">
        <div>
          <div className="text-3xl font-semibold">Feedbacker</div>
          <div className="text-sm text-gray-500">AI %, originality, clarity, local overlap — no external calls</div>
        </div>
        {res && <button onClick={printReport} className="no-print px-4 py-2 rounded-xl border">Print/PDF</button>}
      </header>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card title="Paste your text">
          <textarea
            value={text}
            onChange={e=>setText(e.target.value)}
            placeholder="Paste assignment text..."
            className="w-full h-[360px] p-4 rounded-2xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-300"
          />
          <div className="flex gap-3 mt-4">
            <button onClick={analyze} disabled={busy || !text.trim()} className="no-print px-4 py-2 rounded-xl bg-black text-white disabled:opacity-40">
              {busy ? "Analyzing..." : "Analyze"}
            </button>
          </div>
          {err && <div className="mt-3 text-red-600">{err}</div>}
        </Card>

        <div className="space-y-6">
          <Card title="Verdicts">
            {!res ? <div>Run analysis to see results.</div> :
              <div className="grid sm:grid-cols-2 gap-6">
                <div className="flex items-center gap-4">
                  <div className="text-green-600"><ProgressRing value={res.aiPercent} label="AI likelihood (%)" /></div>
                  <Badge level={res.verdict}/>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-blue-600"><ProgressRing value={res.bls} label="Belto Learning Score" /></div>
                </div>
              </div>
            }
          </Card>

          <Card title="Breakdown">
            {!res ? <div/> :
              <div>
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <Bar label="Originality" value={res.breakdown.originality}/>
                    <Bar label="Clarity" value={res.breakdown.clarity}/>
                    <Bar label="Evidence" value={res.breakdown.evidence}/>
                  </div>
                  <div>
                    <Bar label="Structure" value={res.breakdown.structure}/>
                    <Bar label="Voice" value={res.breakdown.voice}/>
                    <Bar label="Mechanics" value={res.breakdown.mechanics}/>
                  </div>
                </div>
              </div>
            }
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

        <Card title="Overlap (Local Corpus)">
          {!res.plagiarism?.enabled ? <div className="text-sm text-gray-500">Bundle /public/corpus/*.txt</div> :
            <div className="text-sm">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-3xl font-semibold">{res.plagiarism.score}</span>
                <span className="text-sm text-gray-500">Top overlap</span>
              </div>
              <div className="text-xs text-gray-500 mb-2">Checked {res.plagiarism.checked} shingles; matched {res.plagiarism.matched} docs.</div>
              <ul className="space-y-2">
                {res.plagiarism.results.map((r,i)=>(
                  <li key={i} className="border rounded-lg p-2">
                    <div className="font-medium truncate">{r.title}</div>
                    <div className="text-xs text-gray-500">overlap {(r.overlap*100).toFixed(1)}% · matches {r.matches}</div>
                    {r.sample && <div className="text-xs mt-1 italic">“{r.sample.slice(0,120)}{r.sample.length>120?'...':''}”</div>}
                  </li>
                ))}
                {res.plagiarism.results.length===0 && <li className="text-xs text-gray-500">No overlaps in local corpus.</li>}
              </ul>
            </div>
          }
        </Card>

        <Card title="Readability">
          <div className="text-sm text-gray-600 mb-2">Lower is easier. Aim roughly grade 8–11.</div>
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
        <Card title={res.resources.enabled ? "Study Resources" : "Study Resources"}>
          <ul className="list-disc pl-5 text-sm space-y-1">
            {res.resources.items.slice(0,6).map((h,i)=>(
              <li key={i}><a className="underline" href={h.link} target="_blank" rel="noreferrer">{h.title}</a></li>
            ))}
            {res.resources.items.length===0 && <li className="text-sm text-gray-500">No curated links for this topic yet.</li>}
          </ul>
        </Card>

        <Card title="Highlights (problem sentences)">
          {!hl.length ? <div className="text-sm text-gray-500">No long/passive/template sentences detected.</div> :
            <ul className="list-disc pl-5 text-sm space-y-2">
              {hl.map((h,i)=>(
                <li key={i}>
                  <span className="font-medium">{h.long?"Long ":""}{h.passive?"Passive ":""}{h.templ?"Template ":""}</span>
                  <span className="text-gray-600"> — {h.text}</span>
                </li>
              ))}
            </ul>}
        </Card>
      </div>}

      {res?.improved &&
        <div className="mt-6 print-pg">
          <Card title="Clean Rewrite (Preview)">
            <pre className="whitespace-pre-wrap text-sm">{res.improved}</pre>
          </Card>
        </div>
      }
    </main>
  );
}
