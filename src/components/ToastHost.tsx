import { useDesk } from "../lib/store";

export function ToastHost() {
  const { toasts, dismissToast } = useDesk();
  if (!toasts.length) return null;
  return (
    <div className="toast-host">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`toast ${t.tone}`}
          role="status"
          onClick={() => dismissToast(t.id)}
        >
          {t.text}
        </div>
      ))}
    </div>
  );
}
