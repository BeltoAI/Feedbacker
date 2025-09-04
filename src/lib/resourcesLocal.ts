type Item = { title:string; link:string };
const KB: Record<string, Item[]> = {
  "industrial revolution": [
    { title:"British Library – The Industrial Revolution overview", link:"https://www.bl.uk/georgian-britain/articles/the-industrial-revolution" },
    { title:"Khan Academy – The Industrial Revolution", link:"https://www.khanacademy.org/humanities/british-history/industrial-revolution" },
    { title:"Britannica – Industrial Revolution", link:"https://www.britannica.com/event/Industrial-Revolution" }
  ],
  "writing clarity": [
    { title:"PlainLanguage.gov – Principles of Plain Language", link:"https://www.plainlanguage.gov/guidelines/" },
    { title:"UNC Writing Center – Clarity", link:"https://writingcenter.unc.edu/tips-and-tools/clarity/" }
  ],
  "citations": [
    { title:"Purdue OWL – Citing Sources", link:"https://owl.purdue.edu/owl/research_and_citation/resources.html" }
  ]
};

function pickTopic(text:string){
  const t = text.toLowerCase();
  if (/\bindustrial revolution\b/.test(t)) return "industrial revolution";
  if (/\bcitation|reference|doi|source\b/.test(t)) return "citations";
  return "writing clarity";
}

export function suggestResources(text:string){
  const key = pickTopic(text);
  return { enabled:true, items: (KB[key] ?? []).slice(0,6) };
}
