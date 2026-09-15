import type { RcaEvidenceItem } from '../types/rca'

type RcaEvidenceProps = {
  evidence: RcaEvidenceItem[] | null
}

function formatSource(source: string): string {
  return source
    .replace(/_tool$/i, '')
    .replace(/[_-]/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
}

export default function RcaEvidence({ evidence }: RcaEvidenceProps) {
  if (!evidence || evidence.length === 0) {
    return (
      <section className="rca-evidence">
        <h3>Evidence</h3>
        <p className="empty-state">No evidence was collected.</p>
      </section>
    )
  }

  return (
    <section className="rca-evidence">
      <div className="surface__header">
        <div>
          <p className="eyebrow">Investigation Signals</p>
          <h3>Evidence</h3>
        </div>
        <span className="surface__count">{evidence.length} sources</span>
      </div>

      <div className="rca-evidence__list">
        {evidence.map((item, index) => (
          <article
            className="rca-evidence__item"
            key={`${item.source}-${item.collectedAt ?? index}`}
          >
            <div className="rca-evidence__summary">
              <div>
                <strong>{formatSource(item.source)}</strong>
                <p>{item.summary}</p>
              </div>

              <span className="rca-evidence__relevance">
                {Math.round(item.relevance * 100)}%
              </span>
            </div>

            <details>
              <summary>View details</summary>
              <dl className="rca-evidence__details">
                {Object.entries(item.data).map(([key, value]) => (
                  <div key={key}>
                    <dt>{formatSource(key)}</dt>
                    <dd>
                      {typeof value === 'object'
                        ? JSON.stringify(value)
                        : String(value)}
                    </dd>
                  </div>
                ))}
              </dl>
            </details>
          </article>
        ))}
      </div>
    </section>
  )
}