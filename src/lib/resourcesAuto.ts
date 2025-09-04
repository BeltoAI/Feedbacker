type Hit = { title:string; link:string; snippet?:string; score?:number };
function topKeywords(t:string, k=8){
  const ws=(t.toLowerCase().match(/[a-z]{3,}/g)||[]);
  const stop=new Set(["the","and","for","with","that","this","from","into","about","after","before","over","under","more","most","some","such","very","just","than","once","into","onto","between","among","other"]);
  const freq:Record<string,number>={};
  for(const w of ws){ if(!stop.has(w)) freq[w]=(freq[w]||0)+1; }
  return Object.entries(freq).sort((a,b)=>b[1]-a[1]).slice(0,k).map(x=>x[0]);
}
async function loadCurated(){
  try{
    const mod = await import(/* webpackIgnore: true */ `${process.cwd()}/public/resources.json`);
    return (mod.default||mod) as Record<string,Hit[]>;
  }catch{ return null; }
}
export async function autoResources(text:string){
  const curated = await loadCurated();
  const keys = topKeywords(text, 8);
  const items:Hit[]=[];
  if(curated){
    for(const [topic, hits] of Object.entries(curated)){
      const t = topic.toLowerCase();
      const score = keys.filter(k=>t.includes(k)).length;
      if(score>0) hits.forEach(h=>items.push({ ...h, score }));
    }
    items.sort((a,b)=>(b.score||0)-(a.score||0));
  }else{
    // Minimal fallback: generic study resources
    const q = encodeURIComponent(keys.slice(0,3).join(" "));
    items.push(
      { title:"Wikipedia (topic overview)", link:`https://en.wikipedia.org/wiki/Special:Search?search=${q}` },
      { title:"Scholar (papers)", link:`https://scholar.google.com/scholar?q=${q}` },
      { title:"Project Gutenberg (historical texts)", link:`https://www.gutenberg.org/ebooks/search/?query=${q}` }
    );
  }
  return { enabled:true, items: items.slice(0,8) };
}
