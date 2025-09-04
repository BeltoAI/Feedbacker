import { NextRequest, NextResponse } from "next/server";

function splitLongSentences(text:string){
  return text.replace(/([,;:])\s+([A-Z])/g, ". $2"); // crude split at heavy clauses
}
function addParagraphs(text:string){
  return text.replace(/([.?!])\s+(?=[A-Z])/g, "$1\n\n"); // blank line between sentences to form paras
}
function simplify(text:string){
  // blunt simplifier: replace some formalisms
  return text
    .replace(/\butilize\b/gi, "use")
    .replace(/\bsubsequently\b/gi, "then")
    .replace(/\badditionally\b/gi, "also")
    .replace(/\bmoreover\b/gi, "also")
    .replace(/\bfurthermore\b/gi, "also");
}
function insertCitations(text:string, items:{title:string;link:string}[]){
  if(!items.length) return text;
  const cites = items.slice(0,3).map(i=>`[${i.title}](${i.link})`).join("; ");
  const marker = `\n\n**Sources:** ${cites}\n`;
  return text.includes("**Sources:**") ? text : (text + marker);
}

async function tryLLM(prompt:string){
  try{
    const base = process.env.LLM_URL;
    if(!base) return null;
    const r = await fetch(`${base}/v1/completions`, { method:"POST", headers:{ "Content-Type":"application/json" }, body: JSON.stringify({ model: process.env.LLM_MODEL || "local", prompt, max_tokens: 900, temperature: 0.2 })});
    if(!r.ok) return null;
    const d = await r.json();
    return d?.choices?.[0]?.text ?? null;
  }catch{return null;}
}

export async function POST(req:NextRequest){
  const { text, action, resources } = await req.json();
  let out = String(text||"");
  if(action==="split") out = splitLongSentences(out);
  if(action==="paragraphs") out = addParagraphs(out);
  if(action==="simplify") out = simplify(out);
  if(action==="citations") out = insertCitations(out, Array.isArray(resources)?resources:[]);
  if(action==="rewrite"){
    const llm = await tryLLM(`Rewrite the following to grade 9–11 clarity, keep meaning, keep citations/quotes, avoid template transitions:\n\n${out}`);
    if(llm) out = llm.trim();
  }
  return NextResponse.json({ text: out });
}
