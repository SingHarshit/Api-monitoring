import type { ReactNode } from 'react'

type AnalyticsGridProps = {
  loading: boolean
  children: ReactNode
}

export default function AnalyticsGrid({ loading, children }: AnalyticsGridProps) {
  return (
    <section className="panel surface">
      <div className="surface__header">
        <div>
          <p className="eyebrow">Monitor Insights</p>
          <h2>Analytics overview</h2>
        </div>
        <span className="surface__count">{loading ? 'Loading...' : 'Live data'}</span>
      </div>

      {loading ? <div className="empty-state">Loading analytics...</div> : <div className="analytics-grid">{children}</div>}
    </section>
  )
}