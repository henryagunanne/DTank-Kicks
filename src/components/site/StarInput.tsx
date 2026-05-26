import { useState } from "react";

interface State { rating: number; touched: boolean; }

export function StarInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onMouseEnter={() => setHover(n)}
          onMouseLeave={() => setHover(0)}
          onClick={() => onChange(n)}
          className={`text-2xl leading-none ${(hover || value) >= n ? "text-gold" : "text-muted-foreground"}`}
        >
          ★
        </button>
      ))}
    </div>
  );
}
