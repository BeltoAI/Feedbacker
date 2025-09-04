import fs from "node:fs/promises";
import path from "node:path";
function shingles(text:string, n=8){
  const ws=(text.toLowerCase().match(/[a-z']+/gi)||[]);
  const out=new Set<string>();
  for(let i=0;i+n<=ws.length;i++) out.add(ws.slice(i,i+n).join(" "));
  return out;
}
export async function checkLocalPlag(text:string){
  try{
    const dir=path.join(process.cwd(),"public","corpus");
    const files=await fs.readdir(dir).catch(()=>[]);
    if(!files.length) return { enabled:false, checked:0, matched:0, score:0, results:[] };
    const mine=shingles(text);
    let checked=0, matched=0; let best=0; const results:Array<any>=[];
    for(const f of files){
      if(!f.endsWith(".txt")) continue;
      checked++;
      const p=path.join(dir,f);
      const raw=await fs.readFile(p,"utf8").catch(()=> "");
      const sh=shingles(raw);
      let hits=0; for(const g of mine) if(sh.has(g)) hits++;
      const overlap = mine.size? hits/mine.size : 0;
      if(overlap>0){ matched++; best=Math.max(best,overlap); results.push({ title:f, overlap, matches:hits, sample: raw.slice(0,200) }); }
    }
    results.sort((a,b)=>b.overlap-a.overlap);
    return { enabled:true, checked, matched, score: Math.round(best*100), results };
  }catch{
    return { enabled:false, checked:0, matched:0, score:0, results:[] };
  }
}
