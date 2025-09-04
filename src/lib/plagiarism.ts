import { serperSearch, type SearchHit } from "./search";

function tokenize(t:string){ return (t.toLowerCase().match(/[a-z0-9’']+/g) ?? []); }
const STOP = new Set(["the","a","an","and","or","but","if","then","when","at","by","for","with","about","against","between","into","through","during","before","after","above","below","to","from","up","down","in","out","on","off","over","under","again","further","than","once","here","there","why","how","all","any","both","each","few","more","most","other","some","such","no","nor","not","only","own","same","so","too","very","can","will","just","don","should","now"]);

function shingles(text:string, nMin=7, nMax=12, cap=14){
  const w = tokenize(text);
  const cands:string[] = [];
  const lens = [12,11,10,9,8,7]; // prefer longer
  for(const n of lens){
    for(let i=0;i<=w.length-n;i++){
      const gram = w.slice(i,i+n);
      const stopRatio = gram.filter(x=>STOP.has(x)).length / n;
      if(stopRatio > 0.5) continue; // too common
      cands.push(gram.join(" "));
    }
  }
  // dedupe, sample evenly up to cap
  const uniq = Array.from(new Set(cands));
  const step = Math.max(1, Math.floor(uniq.length / cap));
  return uniq.filter((_,i)=>i%step===0).slice(0,cap);
}

function overlapRatio(a:string, b:string){
  const A = new Set(tokenize(a)); const B = new Set(tokenize(b));
  let inter = 0; for(const x of A) if(B.has(x)) inter++;
  return inter / Math.max(1, A.size);
}

export type PlagiarismResult = {
  enabled:boolean;
  checked:number;
  matched:number;
  score:number; // 0..100
  matches: Array<{ query:string; hit: SearchHit; snippetOverlap:number }>;
  sources: Array<{ domain:string; count:number }>;
};

export async function checkPlagiarism(text:string): Promise<PlagiarismResult>{
  const grams = shingles(text);
  const enabled = !!process.env.SERPER_API_KEY;
  if(!enabled) return { enabled, checked:0, matched:0, score:0, matches:[], sources:[] };

  const matches: Array<{ query:string; hit:SearchHit; snippetOverlap:number }> = [];
  for(const g of grams){
    const quoted = `"${g}"`;
    const hits = await serperSearch(quoted, 5);
    if(!hits) continue;
    for(const h of hits){
      const ov = overlapRatio(g, (h.snippet ?? "") + " " + h.title);
      if(ov > 0.65){ // strong snippet match
        matches.push({ query:g, hit:h, snippetOverlap:ov });
        break; // one solid hit per shingle is enough
      }
    }
  }
  const matched = matches.length;
  const checked = grams.length;

  // Aggregate domains
  const domainCount:Record<string,number> = {};
  for(const m of matches){
    try{
      const u = new URL(m.hit.link);
      const host = u.hostname.replace(/^www\./,"");
      domainCount[host] = (domainCount[host]||0)+1;
    }catch{}
  }
  const sources = Object.entries(domainCount).map(([domain,count])=>({domain,count})).sort((a,b)=>b.count-a.count);

  // Score = proportion of shingles that hit strongly, scaled
  const score = Math.round(Math.min(100, 100 * (matched / Math.max(1, checked))));

  return { enabled:true, checked, matched, score, matches, sources };
}
