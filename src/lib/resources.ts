import { serperSearch } from "./search";

const STOP = new Set(["the","a","an","and","or","but","if","then","when","at","by","for","with","about","against","between","into","through","during","before","after","above","below","to","from","up","down","in","out","on","off","over","under","again","further","than","once","here","there","why","how","all","any","both","each","few","more","most","other","some","such","no","nor","not","only","own","same","so","too","very","can","will","just","don","should","now"]);

function topKeywords(text:string, k=6){
  const ws = (text.toLowerCase().match(/[a-z0-9’']+/g) ?? []).filter(w=>w.length>4 && !STOP.has(w));
  const c:Record<string,number> = {};
  ws.forEach(w=>c[w]=(c[w]||0)+1);
  return Object.entries(c).sort((a,b)=>b[1]-a[1]).slice(0,k).map(([w])=>w);
}

export async function studyResources(text:string){
  if(!process.env.SERPER_API_KEY) return { enabled:false, items:[] as {title:string; link:string; snippet?:string}[] };
  const q = topKeywords(text).join(" ");
  const hits = await serperSearch(q, 6);
  return { enabled:true, items: (hits ?? []).slice(0,6) };
}
