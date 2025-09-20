"use client";
import { useEffect } from 'react';
import { isSyncUnlocked, runSync } from '@/lib/sync';

export default function SyncAuto(){
  useEffect(()=>{
    let timer: any;
    const boot = async () => {
      if (isSyncUnlocked()) {
        try { await runSync(); } catch {}
        timer = setInterval(()=>{ runSync().catch(()=>{}); }, 15*60*1000);
      }
    };
    boot();
    return ()=>{ if (timer) clearInterval(timer); };
  },[]);
  return null;
}
