export function BusyOverlay({title,detail}:{title:string;detail?:string}){
  return <div className="busy-overlay" role="status" aria-live="polite"><div className="busy-card"><div className="busy-spinner"/><div><strong>{title}</strong><span>{detail || 'Please wait…'}</span><div className="busy-bar"><i/></div></div></div></div>
}
