import { useEffect, useRef } from "react";
import { Trash2 } from "lucide-react";

export function ConfirmDelete({ onCancel, onDelete, busy }: { onCancel: () => void; onDelete: () => void; busy: boolean }): JSX.Element {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    if (dialog && !dialog.open) dialog.showModal();
    return () => { if (dialog?.open) dialog.close(); };
  }, []);
  return <dialog className="confirm-dialog" ref={ref} aria-labelledby="delete-title" onCancel={(event) => { if (busy) event.preventDefault(); else onCancel(); }}>
    <h2 id="delete-title">Supprimer cette annonce ?</h2>
    <p>La photo et les informations seront effacées de l'historique sur cet ordinateur.</p>
    <div className="button-row"><button className="secondary-button" autoFocus onClick={onCancel} disabled={busy}>Conserver</button>
      <button className="danger-button" onClick={onDelete} disabled={busy}><Trash2 size={16} />{busy ? "Suppression..." : "Supprimer"}</button></div>
  </dialog>;
}
