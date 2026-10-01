export function PageSkeleton(){
  return <div className="skeleton-page"><div className="skeleton-grid">{Array.from({length:4}).map((_,i)=><div className="skeleton-card" key={i}><div className="skeleton-line wide"/><div className="skeleton-line short"/></div>)}</div><div className="skeleton-panel"/></div>
}
