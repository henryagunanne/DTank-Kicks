import { useState } from "react";
import { X } from "lucide-react";

const ROWS = [
  ["3.5", "4", "36", "22.5"],
  ["4", "4.5", "36.5", "23"],
  ["4.5", "5", "37.5", "23.5"],
  ["5", "5.5", "38", "24"],
  ["6", "6", "39", "24.5"],
  ["7", "6.5", "40", "25"],
  ["8", "7.5", "41", "26"],
  ["9", "8.5", "42.5", "27"],
  ["10", "9", "44", "28"],
  ["11", "10", "45", "29"],
  ["12", "11", "46", "30"],
  ["13", "12", "47.5", "31"],
];

export function SizeGuideModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div className="max-h-[80vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-card p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-bold">Size Guide</h3>
          <button onClick={onClose} aria-label="Close"><X className="h-5 w-5" /></button>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase text-muted-foreground">
              <th className="py-2">US</th>
              <th>UK</th>
              <th>EU</th>
              <th>CM</th>
            </tr>
          </thead>
          <tbody>
            {ROWS.map((r) => <tr key={r[0]} className="border-b border-border/50"><td className="py-2 font-medium">{r[0]}</td><td>{r[1]}</td><td>{r[2]}</td><td>{r[3]}</td></tr>)}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function SizeGuideButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => setOpen(true)} className="text-xs underline text-muted-foreground hover:text-foreground">Size guide</button>
      <SizeGuideModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}
