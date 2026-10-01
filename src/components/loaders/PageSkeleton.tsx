export function PageSkeleton() {
  return <div className="skeleton-page" aria-label="Loading content"><div className="skeleton-line wide"/><div className="stats-grid">{Array.from({ length: 4 }).map((_, i) => <div className="skeleton-card" key={i}><div className="skeleton-line short"/><div className="skeleton-line"/></div>)}</div><div className="skeleton-panel"/></div>
}
