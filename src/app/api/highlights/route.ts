import { NextRequest, NextResponse } from "next/server";
import { splitSentences, words } from "@/lib/analysis";

export async function POST(req:NextRequest){
  const { text } = await req.json();
  let cursor = 0;
  const sents = splitSentences(text);
  const items = [];
  for(const s of sents){
    const start = cursor;
    const end = cursor + s.length;
    cursor = end + 1;
    const wc = words(s).length;
    const long = wc > 35;
    const templ = /Firstly|Secondly|Thirdly|In conclusion/gi.test(s);
    const passive = /\b(am|is|are|was|were|be|been|being)\s+\w+(ed|en)\b/gi.test(s);
    if(long || templ || passive) items.push({ start, end, long, templ, passive, wc, text:s });
  }
  return NextResponse.json({ ranges: items });
}
