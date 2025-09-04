"use client";
import { useState } from "react";
import Card from "./(ui)/components/Card";
import { Bar } from "./(ui)/components/Progress";

type Issue = { type:string; text:string; fix?:string };
type Breakdown = { originality:number; clarity:number; evidence:number; structure:number; voice:number; mechanics:number };
type Readability = { flesch:number; fkGrade:number; gunning:number; smog:number; lix:number; ari:number; coleman:number };
type Report = {
  bls:number;
  aiRisk:number;
  breakdown:Breakdown;
  readability:Readability;
  counts:{ words:number; sentences:number; paragraphs:number; unique:number };
  flags:{ quotesRatio:number; links:number; passiveHits:number; weaselHits:number };
  suggestions:{
    grammar: Issue[];
    clarity: Issue[];
    evidence: Issue[];
  };
  improved?: string;
  notes: string[];
};

export default function Home() {
  const [text, setText] = useState("");
  const [res, setRes] = useState<Report|null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string|null>(null);

  async function analyze() {
    setBusy(true); setErr(null);
    try {
      const r = await fetch("/api/analyze", { method:"POST", headers:{ "Content-Type":"application/json" }, body: JSON.stringify({ text }) });
      if(!r.ok){ throw new Error(await r.text()); }
      const data = await r.json();
      setRes(data);
    } catch(e:any){ setErr(e.message || "Failed"); }
    finally{ setBusy(false); }
  }

  function printReport(){ window.print(); }

  return (
    <main className="max-w-5xl mx-auto p-6">
      <div className="text-3xl font-semibold mb-6">Feedbacker</div>
      <div className="grid md:grid-cols-2 gap-6">
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
            {res && <button onClick={printReport} className="no-print px-4 py-2 rounded-xl border">Print/PDF</button>}
          </div>
          {err && <div className="mt-3 text-red-600">{err}</div>}
        </Card>

        <div className="space-y-6">
          <Card title="Belto Learning Score">
            {!res ? <div>Run analysis to see results.</div> :
              <div>
                <div className="text-5xl mb-2">{Math.round(res.bls)}</div>
                <div className="text-sm text-gray-500">AI Risk: {Math.round(res.aiRisk)} / 100</div>
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

          <Card title="Readability">
            {!res ? <div/> :
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              <div>Flesch: {res.readability.flesch.toFixed(1)}</div>
              <div>FK Grade: {res.readability.fkGrade.toFixed(1)}</div>
              <div>Gunning: {res.readability.gunning.toFixed(1)}</div>
              <div>SMOG: {res.readability.smog.toFixed(1)}</div>
              <div>LIX: {res.readability.lix.toFixed(1)}</div>
              <div>ARI: {res.readability.ari.toFixed(1)}</div>
              <div>Coleman-Liau: {res.readability.coleman.toFixed(1)}</div>
            </div>}
          </Card>
        </div>
      </div>

      {res &&
      <div className="mt-6 grid md:grid-cols-3 gap-6 print-pg">
        <Card title="Key Counts">
          <div className="text-sm space-y-1">
            <div>Words: {res.counts.words}</div>
            <div>Sentences: {res.counts.sentences}</div>
            <div>Paragraphs: {res.counts.paragraphs}</div>
            <div>Unique words: {res.counts.unique}</div>
            <div>Quotes ratio: {(res.flags.quotesRatio*100).toFixed(1)}%</div>
            <div>Links: {res.flags.links}</div>
            <div>Passive hits: {res.flags.passiveHits}</div>
            <div>Weasel hits: {res.flags.weaselHits}</div>
          </div>
        </Card>

        <Card title="Grammar/Clarity">
          <div className="text-sm space-y-2">
            <div className="font-medium">Grammar issues</div>
            <ul className="list-disc pl-5">
              {res.suggestions.grammar.slice(0,8).map((g,i)=>(<li key={i}>{g.text}{g.fix?` → ${g.fix}`:""}</li>))}
            </ul>
            <div className="font-medium mt-3">Clarity issues</div>
            <ul className="list-disc pl-5">
              {res.suggestions.clarity.slice(0,8).map((g,i)=>(<li key={i}>{g.text}{g.fix?` → ${g.fix}`:""}</li>))}
            </ul>
          </div>
        </Card>

        <Card title="Evidence & Actions">
          <div className="text-sm space-y-2">
            <div className="font-medium">Evidence gaps</div>
            <ul className="list-disc pl-5">
              {res.suggestions.evidence.slice(0,8).map((g,i)=>(<li key={i}>{g.text}</li>))}
            </ul>
            <div className="font-medium mt-3">Notes</div>
            <ul className="list-disc pl-5">
              {res.notes.map((n,i)=>(<li key={i}>{n}</li>))}
            </ul>
          </div>
        </Card>
      </div>}

      {res && res.improved &&
        <div className="mt-6 print-pg">
          <Card title="Clean rewrite (preview)">
            <pre className="whitespace-pre-wrap text-sm">{res.improved}</pre>
          </Card>
        </div>
      }
    </main>
  );
}
