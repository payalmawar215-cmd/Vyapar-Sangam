export default function StatCard({ value, label }) {
  return (
    <div className="border-b border-border pb-6">
      <p className="font-display text-4xl md:text-5xl font-light text-foreground">{value}</p>
      <p className="font-body text-xs tracking-label uppercase text-muted-foreground mt-3">{label}</p>
    </div>
  );
}
