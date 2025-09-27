"use client";
import { useEffect } from 'react';
import { isSyncUnlocked, runSync } from '@/lib/sync';

export default function SyncAuto(){
  useEffect(()=>{
    let timer: any;
    const doSync = async () => {
      const r: any = await runSync();
      if (!r.ok) console.warn('Auto-sync error', r);
      else if (r.errors && r.errors.length) console.warn('Auto-sync warnings', r.errors);
    };
    const boot = async () => {
      if (isSyncUnlocked()) {
        try { await doSync(); } catch {}
        timer = setInterval(()=>{ doSync().catch(()=>{}); }, 15*60*1000);
      }
    };
    boot();
    return ()=>{ if (timer) clearInterval(timer); };
  },[]);
  return null;
}
