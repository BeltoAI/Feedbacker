import fs from "fs/promises";
import path from "path";

type Item = { title:string; link:string };
type Topic = { key:string; patterns:(string|RegExp)[]; items:Item[] };

// Built-in topics. Add or override with /public/resources.json
const BUILTIN: Topic[] = [
  {
    key: "industrial_revolution",
    patterns: [/industrial revolution/i, /manchester|birmingham|lille/i, /steam|coal|textile|factory|bessemer/i],
    items: [
      { title:"British Library – The Industrial Revolution", link:"https://www.bl.uk/georgian-britain/articles/the-industrial-revolution" },
      { title:"Britannica – Industrial Revolution", link:"https://www.britannica.com/event/Industrial-Revolution" },
      { title:"Khan Academy – The Industrial Revolution", link:"https://www.khanacademy.org/humanities/british-history/industrial-revolution" },
      { title:"Science Museum (UK) – James Watt and Steam Power", link:"https://www.sciencemuseum.org.uk/objects-and-stories/james-watt" },
      { title:"Friedrich Engels – The Condition of the Working Class (overview)", link:"https://www.britannica.com/topic/The-Condition-of-the-Working-Class-in-England" },
      { title:"Bessemer Process – Overview", link:"https://www.britannica.com/technology/Bessemer-process" }
    ]
  },
  {
    key: "writing_clarity",
    patterns: [/clarity|readability|plain language|grade level|flesch|gunning|smog/i],
    items: [
      { title:"PlainLanguage.gov – Principles of Plain Language", link:"https://www.plainlanguage.gov/guidelines/" },
      { title:"UNC Writing Center – Clarity", link:"https://writingcenter.unc.edu/tips-and-tools/clarity/" },
      { title:"Harvard College Writing Center – Tips for Clarity", link:"https://writingcenter.fas.harvard.edu/pages/tips-clarity" }
    ]
  },
  {
    key: "citations",
    patterns: [/cite|citation|reference|doi|works cited|bibliography|sources/i],
    items: [
      { title:"Purdue OWL – Research & Citation Resources", link:"https://owl.purdue.edu/owl/research_and_citation/resources.html" },
      { title:"Zotero – Quick Start Guide", link:"https://www.zotero.org/support/quick_start_guide" }
    ]
  }
];

// Optional user override file: /public/resources.json
// {
//   "topics": [
//     {"key":"my_topic","patterns":["keyword1","keyword2"],"items":[{"title":"...","link":"..."}]}
//   ]
// }
async function loadUserTopics(): Promise<Topic[]> {
  try{
    const fp = path.join(process.cwd(),"public","resources.json");
    const raw = await fs.readFile(fp,"utf8");
    const json = JSON.parse(raw);
    const topics:Topic[] = [];
    for (const t of (json?.topics||[])) {
      topics.push({
        key: String(t.key||"custom"),
        patterns: (t.patterns||[]).map((p:string)=> new RegExp(p, "i")),
        items: (t.items||[]).map((i:any)=>({ title:String(i.title), link:String(i.link) }))
      });
    }
    return topics;
  }catch{ return []; }
}

function matchScore(text:string, topic:Topic){
  const t = text.toLowerCase();
  let score = 0;
  for (const p of topic.patterns){
    const ok = (p instanceof RegExp) ? p.test(t) : t.includes(String(p).toLowerCase());
    if (ok) score += 1;
  }
  // also reward keyword coverage for IR
  if (topic.key==="industrial_revolution"){
    const hits = (t.match(/\b(watt|steam|textile|factory|coal|bessemer|engels|urbanization)\b/gi)||[]).length;
    score += hits*0.2;
  }
  return score;
}

export async function autoResources(text:string, limit=6){
  const topics = [...BUILTIN, ...(await loadUserTopics())];
  const scored = topics.map(tp=>({ key:tp.key, score: matchScore(text,tp), items: tp.items }));
  scored.sort((a,b)=> b.score - a.score);
  const merged: Item[] = [];
  for (const s of scored){
    if (s.score<=0) continue;
    for(const it of s.items){
      if (!merged.find(m=>m.link===it.link)) merged.push(it);
      if (merged.length>=limit) break;
    }
    if (merged.length>=limit) break;
  }
  // fallback if nothing matched
  if (merged.length===0){
    merged.push(...BUILTIN.find(t=>t.key==="writing_clarity")!.items);
  }
  return { enabled:true, items: merged.slice(0,limit) };
}
