"use client";

import Image from "next/image";
import { useState } from "react";

export function PhotoLightbox({ src, alt, className = "" }: { src: string; alt: string; className?: string }) {
  const [open, setOpen] = useState(false);
  return <><button type="button" onClick={() => setOpen(true)} aria-label={`Увеличить: ${alt}`} className={`relative block overflow-hidden ${className}`}><Image src={src} alt={alt} fill unoptimized className="object-cover transition-transform hover:scale-105" /></button>{open && <div role="dialog" aria-modal="true" aria-label={alt} className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4" onClick={() => setOpen(false)}><button type="button" aria-label="Закрыть фото" onClick={() => setOpen(false)} className="absolute right-5 top-5 z-10 rounded-full bg-white px-4 py-2 text-2xl font-bold leading-none text-slate-950 shadow-lg">×</button><div className="relative h-[calc(100vh-2rem)] w-full" onClick={(event) => event.stopPropagation()}><Image src={src} alt={alt} fill unoptimized className="object-contain" /></div></div>}</>;
}
