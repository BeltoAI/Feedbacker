export type SearchHit = { title:string; link:string; snippet?:string };
export async function serperSearch(q:string, num=5){
  const key = process.env.SERPER_API_KEY;
  if(!key) return null;
  const r = await fetch("https://google.serper.dev/search", {
    method:"POST",
    headers:{ "Content-Type":"application/json", "X-API-KEY": key },
    body: JSON.stringify({ q, num, gl:"us", hl:"en" })
  });
  if(!r.ok) return null;
  const data = await r.json();
  const hits: SearchHit[] = (data?.organic ?? []).map((o:any)=>({ title:o.title, link:o.link, snippet:o.snippet }));
  return hits;
}
