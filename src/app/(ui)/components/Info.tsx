"use client";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

type Pos = { top:number; left:number };
export default function Info({ text, width=280 }:{ text:string; width?:number }){
  const [open,setOpen]=useState(false);
  const [pos,setPos]=useState<Pos>({top:0,left:0});
  const anchorRef=useRef<HTMLSpanElement>(null);
  const tipRef=useRef<HTMLDivElement>(null);

  const place=()=>{
    const a=anchorRef.current; if(!a) return;
    const r=a.getBoundingClientRect();
    const vw=window.innerWidth, vh=window.innerHeight;
    const w = Math.min(width, Math.floor(vw*0.9));
    const estH = 140; // conservative estimate; will refine below
    let top = r.bottom + 8;
    let left = Math.max(8, Math.min(vw - w - 8, Math.round(r.left + r.width/2 - w/2)));
    if (top + estH > vh - 8) top = Math.max(8, r.top - estH - 8);
    setPos({top, left});
    // refine with measured height
    requestAnimationFrame(()=>{
      const t = tipRef.current; if(!t) return;
      const h = t.getBoundingClientRect().height;
      let tt = r.bottom + 8;
      if (tt + h > vh - 8) tt = Math.max(8, r.top - h - 8);
      let ll = Math.max(8, Math.min(vw - w - 8, Math.round(r.left + r.width/2 - w/2)));
      setPos({top:tt, left:ll});
    });
  };

  useLayoutEffect(()=>{ if(open) place(); },[open]);
  useEffect(()=>{
    if(!open) return;
    const onScroll=()=>place();
    const onResize=()=>place();
    const onKey=(e:KeyboardEvent)=>{ if(e.key==="Escape") setOpen(false); };
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onResize);
    window.addEventListener("keydown", onKey);
    return ()=>{ window.removeEventListener("scroll", onScroll, true); window.removeEventListener("resize", onResize); window.removeEventListener("keydown", onKey); };
  },[open]);

  return (
    <>
      <span
        ref={anchorRef}
        className="inline-flex items-center justify-center ml-1 align-[0.1em] w-4 h-4 rounded-full bg-gray-200 text-gray-700 text-[10px] font-bold cursor-help select-none"
        onMouseEnter={()=>setOpen(true)} onMouseLeave={()=>setOpen(false)}
        onFocus={()=>setOpen(true)} onBlur={()=>setOpen(false)} tabIndex={0}
        onClick={()=>setOpen(v=>!v)}
        aria-label="info"
      >i</span>
      {open && typeof document!=="undefined" && createPortal(
        <div ref={tipRef} style={{ position:"fixed", top:pos.top, left:pos.left, width:Math.min(width, window.innerWidth*0.9), zIndex:1000 }}
             className="rounded-lg p-2 text-xs leading-snug bg-black text-white shadow-lg">
          {text}
        </div>, document.body)}
    </>
  );
}
