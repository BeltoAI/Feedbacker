import { splitSentences, words } from "@/lib/analysis";

export type FeatureVals = {
  entropy:number;
  burstiness:number;
  repetition:number;        // 0..1
  passiveHits:number;
  templateTransitions:number;
  linkCount:number;
  stopRatio:number;         // 0..1
  genericOpeners:number;    // count
  sentences:number;
  words:number;
  // extra human-evidence features (for calibration)
  quotesCount:number;
  firstPersonCount:number;
  digitsCount:number;
  yearCount:number;
  punctuationVariety:number;
  properNounsApprox:number;
  parentheticalCount:number;
};

// ---------- helpers ----------
const clamp01 = (x:number)=> Math.max(0, Math.min(1, x));

function templateCount(text:string){
  return (text.match(/\b(Firstly|Secondly|Thirdly|In conclusion)\b/gi) || []).length;
}
function openerCount(text:string){
  const starters = /^(the|this|it|in|however|moreover|furthermore|additionally|overall|therefore|thus|consequently)\b/i;
  let n = 0;
  for (const s of splitSentences(text)) {
    const t = s.trim();
    if (!t) continue;
    if (starters.test(t)) n++;
  }
  return n;
}
function countQuotes(text:string){ return (text.match(/[“”"']/g) || []).length; }
function countFirstPerson(text:string){
  return (text.toLowerCase().match(/\b(i|me|my|mine|we|us|our|ours)\b/g) || []).length;
}
function countDigits(text:string){ return (text.match(/\d/g) || []).length; }
function countYears(text:string){
  return (text.match(/\b(1[89]\d{2}|20\d{2}|21\d{2})\b/g) || []).length;
}
function punctuationVariety(text:string){
  const set = new Set<string>();
  for (const ch of text) if (";:—–-()[]/%".includes(ch)) set.add(ch);
  return set.size;
}
function properNounsApprox(text:string){
  // rough: count capitalized tokens, not super accurate but works as signal
  return (text.match(/\b[A-Z][a-z]{2,}\b/g) || []).length;
}
function parentheticalCount(text:string){
  const paren = (text.match(/[()]/g) || []).length;
  const dash = (text.match(/[—–-]{2,}|—|–/g) || []).length;
  return paren + dash;
}

// ---------- exported features ----------
export function featureValues(
  text:string,
  orig:{repetition:number; links:number},
  style:{burstiness:number; passiveHits:number; entropy:number; stopRatio:number}
): FeatureVals {
  const sents = splitSentences(text);
  const ws = words(text);
  return {
    entropy: Number(style.entropy || 0),
    burstiness: Number(style.burstiness || 0),
    repetition: clamp01(Number(orig.repetition || 0)),
    passiveHits: Number(style.passiveHits || 0),
    templateTransitions: templateCount(text),
    linkCount: Number(orig.links || 0),
    stopRatio: clamp01(Number(style.stopRatio || 0)),
    genericOpeners: openerCount(text),
    sentences: sents.length,
    words: ws.length,
    // extras for human-evidence
    quotesCount: countQuotes(text),
    firstPersonCount: countFirstPerson(text),
    digitsCount: countDigits(text),
    yearCount: countYears(text),
    punctuationVariety: punctuationVariety(text),
    properNounsApprox: properNounsApprox(text),
    parentheticalCount: parentheticalCount(text)
  };
}

// ---------- calibrated AI% with human-evidence counterweight + confidence ----------
export function aiExplain(f: FeatureVals){
  // AI-evidence (same idea as before, but weights moderated)
  const lowEntropy       = clamp01((7.5 - f.entropy) / 7.5);
  const uniformCadence   = clamp01((13  - f.burstiness) / 13);
  const repeatNgrams     = clamp01(f.repetition * 6.5);
  const passiveVoice     = clamp01(f.passiveHits / 4);
  const templating       = clamp01(f.templateTransitions / 4);
  const sparseLinks      = (f.words>=400? (f.linkCount===0?1: f.linkCount<=1?0.6: f.linkCount<=2?0.4:0):0);
  const dev              = Math.abs(f.stopRatio - 0.47);
  const unnaturalStop    = clamp01((dev - 0.03) / 0.20);
  const genericOpeners   = clamp01(f.sentences ? f.genericOpeners / f.sentences : 0);

  const feats = [
    { label:"Low entropy",                   weight:0.28, raw:lowEntropy },
    { label:"Uniform cadence (low burst.)",  weight:0.18, raw:uniformCadence },
    { label:"Unnatural stop-word ratio",     weight:0.12, raw:unnaturalStop },
    { label:"Template transitions",          weight:0.10, raw:templating },
    { label:"Repetition of n-grams",         weight:0.10, raw:repeatNgrams },
    { label:"Generic sentence openers",      weight:0.10, raw:genericOpeners },
    { label:"Sparse citations/links",        weight:0.07, raw:sparseLinks },
    { label:"Passive voice",                 weight:0.05, raw:passiveVoice },
  ];

  const contributions = feats.map(x => ({
    label: x.label,
    weight: x.weight,
    score: Math.round(100 * x.raw),
    contribution: Math.round(100 * x.weight * x.raw)
  }));

  // Raw AI score from AI-evidence
  const sens = Number(process.env.AI_SENSITIVITY || "1.4"); // lower default
  const baseRaw = contributions.reduce((a,c)=>a+c.contribution, 0);
  let aiRaw = Math.max(0, Math.min(100, baseRaw * sens));

  // Human-evidence bonus (pushes DOWN the AI%)
  const firstDensity   = clamp01(f.firstPersonCount / Math.max(1, f.sentences));      // 0..1
  const detailsDensity = clamp01((f.digitsCount + 2*f.yearCount) / Math.max(6, f.sentences*1.2));
  const quotesLinks    = clamp01((f.quotesCount > 0 ? 0.5 : 0) + (f.linkCount > 0 ? 0.5 : 0));
  const punctVariety   = clamp01(f.punctuationVariety / 6);
  const properNouns    = clamp01(f.properNounsApprox / Math.max(6, f.sentences*1.0));
  const parentheticals = clamp01(f.parentheticalCount / Math.max(5, f.sentences*1.0));

  const humanScore = (
    0.25*firstDensity +
    0.20*detailsDensity +
    0.20*quotesLinks +
    0.15*punctVariety +
    0.10*properNouns +
    0.10*parentheticals
  ); // 0..1

  const humanBonus = Number(process.env.AI_HUMAN_BONUS || "22"); // points to subtract at humanScore=1
  aiRaw = Math.max(0, Math.min(100, aiRaw - humanBonus*humanScore));

  // Length-based confidence shrinks extremes for short text
  const conf = Math.min(1,
    0.70 * Math.min(1, f.words/350) +
    0.30 * Math.min(1, f.sentences/10)
  );
  const aiPercent = Math.round( aiRaw*conf + 50*(1-conf) );

  return { aiPercent, contributions };
}
