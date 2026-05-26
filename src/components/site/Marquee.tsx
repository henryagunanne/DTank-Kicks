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
