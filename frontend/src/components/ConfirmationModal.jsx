export default function ConfirmationModal({ open, title, message, onConfirm, onCancel, confirmText = 'Confirm', cancelText = 'Cancel', confirmClass = 'btn-primary' }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-ink/40 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="p-6 text-center">
          <h3 className="font-display font-semibold text-lg">{title}</h3>
          <p className="mt-2 text-sm text-slate-soft">{message}</p>
          <div className="mt-6 flex justify-center gap-3">
            <button onClick={onCancel} className="btn-secondary">{cancelText}</button>
            <button onClick={onConfirm} className={confirmClass}>{confirmText}</button>
          </div>
        </div>
      </div>
    </div>
  );
}