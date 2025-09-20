"use client";
import { useEffect, useState } from 'react';
import { exportToJson } from '@/lib/storage';

const KEY = 'azzouz_last_export_at';

function daysSince(ts: string | null) {
  if (!ts) return Infinity;
  const then = new Date(ts).getTime();
  if (Number.isNaN(then)) return Infinity;
  const diff = Date.now() - then;
  return diff / (1000*60*60*24);
}

export default function BackupReminder(){
  const [show, setShow] = useState(false);

  useEffect(()=>{
    const last = localStorage.getItem(KEY);
    setShow(daysSince(last) >= 7);
  },[]);

  const doExport = async () => {
    const json = await exportToJson();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `azzouz-backup-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    localStorage.setItem(KEY, new Date().toISOString());
    setShow(false);
  };

  if (!show) return null;

  return (
    <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <span className="font-medium">Sauvegarde conseillée</span> · Aucune exportation JSON depuis 7 jours. Pensez à sauvegarder vos données locales.
        </div>
        <div className="flex gap-2">
          <button onClick={doExport} className="btn-primary text-xs">Exporter maintenant</button>
          <button onClick={()=>setShow(false)} className="btn-secondary text-xs">Plus tard</button>
        </div>
      </div>
    </div>
  );
}
