"use client";
import { useEffect, useState } from 'react';
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { addDays } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import type { DateRange } from 'react-day-picker';

export default function DateRangePicker({
  value,
  onChange,
}: {
  value?: { from: Date; to: Date };
  onChange: (range: { from: Date; to: Date }) => void;
}) {
  const [range, setRange] = useState<{ from: Date; to: Date }>(
    value || { from: new Date(), to: new Date() }
  );

  useEffect(() => { if (value) setRange(value); }, [value]);

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline">
          {range.from.toLocaleDateString()} → {range.to.toLocaleDateString()}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Sélectionner une période</DialogTitle>
        </DialogHeader>
        <div className="p-1">
          <Calendar
            mode="range"
            selected={{ from: range.from, to: range.to }}
            onSelect={(sel: DateRange | undefined) => {
              const from = sel?.from || range.from;
              const to = sel?.to || sel?.from || range.to;
              const r = { from, to };
              setRange(r);
              onChange(r);
            }}
            numberOfMonths={2}
            defaultMonth={range.from}
          />
          <div className="flex gap-2 pt-2">
            <Button size="sm" onClick={() => { const r = { from: new Date(), to: new Date() }; setRange(r); onChange(r); }}>Aujourd&apos;hui</Button>
            <Button size="sm" variant="secondary" onClick={() => { const from = new Date(); const to = addDays(new Date(), 7); const r = { from, to }; setRange(r); onChange(r); }}>7 jours</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
