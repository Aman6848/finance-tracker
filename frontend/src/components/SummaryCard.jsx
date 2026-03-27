export default function SummaryCard({ label, value, note }) {
  return (
    <article className="summary-card">
      <span>{label}</span>
      <strong>{value}</strong>
      <em>{note}</em>
    </article>
  )
}
