import fs from "fs/promises";
import path from "path";

type Doc = { id:number; title:string; text:string; tokens:string[] };
type Hit = { title:string; overlap:number; matches:number; sample:string };

const STOP = new Set(["the","a","an","and","or","but","if","then","when","at","by","for","with","about","against","between","into","through","during","before","after","above","below","to","from","up","down","in","out","on","off","over","under","again","further","than","once","here","there","why","how","all","any","both","each","few","more","most","other","some","such","no","nor","not","only","own","same","so","too","very","can","will","just","don","should","now"]);

let loaded = false;
let docs: Doc[] = [];
let shingleIndex: Map<string, Set<number>> = new Map();

function tokens(t:string){ return (t.toLowerCase().match(/[a-z0-9’']+/g) ?? []); }

function makeShingles(ws:string[], n=9){
  const out:string[] = [];
  for(let i=0;i<=ws.length-n;i++){
    const gram = ws.slice(i,i+n);
    const stopRatio = gram.filter(w=>STOP.has(w)).length / n;
    if (stopRatio > 0.5) continue;
    out.push(gram.join(" "));
  }
  return out;
}

async function loadCorpus(){
  if (loaded) return;
  loaded = true;
  const baseDirs = [path.join(process.cwd(),"public","corpus"), path.join(process.cwd(),"corpus")];
  let files:string[] = [];
  for(const dir of baseDirs){
    try {
      const fsList = (await fs.readdir(dir)).filter(f=>f.endsWith(".txt"));
      files.push(...fsList.map(f=>path.join(dir,f)));
    } catch {}
  }
  let id=0;
  for (const fp of files){
    try{
      const text = await fs.readFile(fp, "utf8");
      const tok = tokens(text);
      const d:Doc = { id:id++, title:path.basename(fp), text, tokens:tok };
      docs.push(d);
      const sh = makeShingles(tok);
      for (const s of sh){
        const set = shingleIndex.get(s) || new Set<number>();
        set.add(d.id);
        shingleIndex.set(s,set);
      }
    }catch{}
  }
}

export async function checkLocalPlag(text:string){
  await loadCorpus();
  const ws = tokens(text);
  const inputSh = Array.from(new Set(makeShingles(ws)));
  if (!docs.length || !inputSh.length) return {
    enabled: true, checked: inputSh.length, matched: 0, score: 0, results: [] as Hit[]
  };

  const docCounts = new Map<number, number>();
  for (const s of inputSh){
    const set = shingleIndex.get(s);
    if (!set) continue;
    for (const id of set){
      docCounts.set(id, (docCounts.get(id)||0) + 1);
    }
  }

  const hits: Hit[] = [];
  for (const [id, cnt] of docCounts){
    const overlap = cnt / inputSh.length;
    let sample = "";
    for (const s of inputSh){ const set = shingleIndex.get(s); if (set && set.has(id)){ sample = s; break; } }
    hits.push({ title: docs[id].title, overlap, matches: cnt, sample });
  }
  hits.sort((a,b)=>b.overlap - a.overlap);

  const matched = hits.length;
  const score = Math.round(Math.min(100, 100 * (hits[0]?.overlap || 0)));
  return { enabled:true, checked: inputSh.length, matched, score, results: hits.slice(0,5) };
}
