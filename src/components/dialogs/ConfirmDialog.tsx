export function ConfirmDialog({open,title,body,confirmLabel='Confirm',danger=false,onCancel,onConfirm}:{open:boolean;title:string;body:string;confirmLabel?:string;danger?:boolean;onCancel:()=>void;onConfirm:()=>void}){
  if(!open) return null
  return <div className="modal-backdrop" onMouseDown={onCancel}><div className="confirm-card" onMouseDown={(e)=>e.stopPropagation()}><h3>{title}</h3><p>{body}</p><div className="dialog-actions"><button className="secondary" onClick={onCancel}>Cancel</button><button className={danger?'danger-btn':'primary'} onClick={onConfirm}>{confirmLabel}</button></div></div></div>
}
