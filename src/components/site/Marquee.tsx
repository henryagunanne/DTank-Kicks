/*
  This component creates a marquee effect that scrolls through a list of popular shoe brands. 
  The brands are repeated multiple times to create a continuous scrolling effect. 
  The marquee is styled with a border and background color, and the brand names are displayed in large, 
  bold text with some spacing between them.
*/

const BRANDS = ["NIKE", "ADIDAS", "PUMA", "NEW BALANCE", "VANS", "CONVERSE"];

export function BrandMarquee() {
  const repeated = [...BRANDS, ...BRANDS, ...BRANDS];
  return (
    <div className="overflow-hidden border-y border-border bg-secondary/30 py-8">
      <div className="marquee flex w-max gap-16 whitespace-nowrap">
        {repeated.map((b, i) => (
          <span key={i} className="text-3xl font-black tracking-widest text-muted-foreground/70">{b}</span>
        ))}
      </div>
    </div>
  );
}
