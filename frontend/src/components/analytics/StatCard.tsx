type StatCardProps = {
label: string
value: string
hint?: string
}
export default function StatCard({ label, value, hint }: StatCardProps) {
  return (
    <article className="stat panel">
      <span className="stat__label">{label}</span>
      <strong className="stat__value">{value}</strong>
      {hint ? <p className="stat__hint">{hint}</p> : null}
    </article>
  )
}