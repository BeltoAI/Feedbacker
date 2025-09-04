const STOP = new Set(["the","a","an","and","or","but","if","then","when","at","by","for","with","about","against","between","into","through","during","before","after","above","below","to","from","up","down","in","out","on","off","over","under","again","further","than","once","here","there","why","how","all","any","both","each","few","more","most","other","some","such","no","nor","not","only","own","same","so","too","very","can","will","just","don","should","now"]);
const WEASEL = ["clearly","obviously","undoubtedly","everyone knows","many believe","it is said","arguably","in general","basically","virtually","literally","sort of","kind of","somewhat","quite","rather"];
const PASSIVE = /\b(am|is|are|was|were|be|been|being)\s+\w+(ed|en)\b/gi;

export function splitSentences(t:string){ return t.replace(/\s+/g," ").trim().split(/(?<=[.!?])\s+/).filter(Boolean); }
export function words(t:string){ return (t.toLowerCase().match(/[a-z']+/gi) ?? []); }

function syllables(word:string){
  let w = word.toLowerCase();
  if (w.length <= 3) return 1;
  w = w.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, "");
  w = w.replace(/^y/, "");
  const m = w.match(/[aeiouy]{1,2}/g);
  return Math.max(1, m ? m.length : 1);
}

export function readabilityMetrics(text:string){
  const sents = splitSentences(text);
  const ws = words(text);
  const wc = ws.length || 1, sc = sents.length || 1;
  const chars = ws.reduce((a,w)=>a+w.length,0) || 1;
  const syl = ws.reduce((a,w)=>a+syllables(w),0) || 1;

  const asl = wc / sc;
  const asw = syl / wc;
  const flesch = 206.835 - 1.015*asl - 84.6*asw;
  const fkGrade = 0.39*asl + 11.8*asw - 15.59;
  const complexWords = ws.filter(w=>syllables(w)>=3).length;
  const gunning = 0.4*(asl + 100*(complexWords/wc));
  const smog = 1.043*Math.sqrt(complexWords*30/sc)+3.1291;
  const lix = (wc/sc) + 100*(ws.filter(w=>w.length>6).length/wc);
  const ari = 4.71*(chars/wc) + 0.5*asl - 21.43;
  const coleman = 0.0588*(100*chars/wc) - 0.296*(100*sc/wc) - 15.8;

  return { flesch, fkGrade, gunning, smog, lix, ari, coleman, wc, sc };
}

export function originalitySignals(text:string){
  const ws = words(text);
  const wc = ws.length || 1;
  const unique = new Set(ws).size;
  const ttr = unique / wc;
  const counts:Record<string,number> = {};
  ws.forEach(w=>counts[w]=(counts[w]||0)+1);
  const hapax = Object.values(counts).filter(c=>c===1).length / wc;

  const n = 4;
  const seen = new Map<string,number>();
  let repeats = 0;
  for (let i=0;i<=ws.length-n;i++){
    const key = ws.slice(i,i+n).join(" ");
    const c = (seen.get(key)||0)+1;
    seen.set(key,c);
    if (c>1) repeats++;
  }
  const repetition = repeats / Math.max(1,(ws.length-n+1));

  const quoteChars = (text.match(/["“”'‘’]/g)||[]).length;
  const quotesRatio = quoteChars / Math.max(1,text.length);
  const links = (text.match(/https?:\/\/|www\./gi)||[]).length;

  return { ttr, hapax, repetition, quotesRatio, links, unique };
}

export function styleSignals(text:string){
  const sents = splitSentences(text);
  const lens = sents.map(s=>words(s).length);
  const mean = lens.reduce((a,b)=>a+b,0)/(lens.length||1);
  const varc = lens.reduce((a,b)=>a+(b-mean)*(b-mean),0)/(lens.length||1);
  const burstiness = Math.sqrt(varc);
  const ws = words(text);
  const stop = ws.filter(w=>STOP.has(w)).length;
  const stopRatio = stop / Math.max(1,ws.length);
  const passiveHits = (text.match(PASSIVE)||[]).length;
  const weaselHits = WEASEL.reduce((a,w)=>a + (text.toLowerCase().includes(w)?1:0),0);
  const freq:Record<string,number> = {};
  for (const c of text) freq[c]=(freq[c]||0)+1;
  const H = Object.values(freq).reduce((a,p)=>a + (p/text.length)*(-Math.log2(p/text.length)), 0);
  return { burstiness, stopRatio, passiveHits, weaselHits, entropy:H };
}

export function scoreComposite(
  orig:{ttr:number;hapax:number;repetition:number;quotesRatio:number;links:number},
  read:{flesch:number; fkGrade:number},
  style:{burstiness:number; stopRatio:number; passiveHits:number; weaselHits:number; entropy:number},
  counts:{ wc:number; sc:number; paragraphs:number },
  llmHints:{grammarPenalty:number; clarityPenalty:number; evidenceBonus:number}
){
  const originality = Math.max(0, Math.min(100, 60 + 25*(orig.ttr-0.35) + 20*(orig.hapax-0.1) - 50*orig.repetition - 20*orig.quotesRatio));
  const clarity = Math.max(0, Math.min(100, 75 + 0.4*read.flesch - 3*llmHints.clarityPenalty - 10*Math.max(0,style.stopRatio-0.55)));
  const evidence = Math.max(0, Math.min(100, 10 + 8*orig.links + llmHints.evidenceBonus));
  const structure = Math.max(0, Math.min(100, 40 + 15*Math.min(2,counts.paragraphs/3) + 0.2*counts.sc - 2*style.burstiness));
  const voice = Math.max(0, Math.min(100, 70 - 3*style.passiveHits - 4*style.weaselHits + 3*Math.min(10,style.burstiness)));
  const mechanics = Math.max(0, Math.min(100, 90 - 4*llmHints.grammarPenalty));

  let aiRisk = 50 - 6*(style.entropy-4) - 2*(style.burstiness-8) + 100*orig.repetition + 5*style.passiveHits;
  aiRisk = Math.max(0, Math.min(100, aiRisk));

  // BLS is now **quality only**, no aiRisk penalty
  const bls = Math.max(0, Math.min(100, 0.35*originality + 0.25*clarity + 0.15*evidence + 0.10*structure + 0.10*voice + 0.05*mechanics));

  return { bls, aiRisk, breakdown:{originality, clarity, evidence, structure, voice, mechanics} };
}
