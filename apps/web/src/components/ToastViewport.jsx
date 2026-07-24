import { CheckCircle2, CircleAlert, ExternalLink, Info, LoaderCircle, X } from 'lucide-react';

function ToastIcon({ notice }) {
  if (notice.pending) return <LoaderCircle className="spin" size={18} />;
  if (notice.type === 'success') return <CheckCircle2 size={18} />;
  if (notice.type === 'error') return <CircleAlert size={18} />;
  return <Info size={18} />;
}

export default function ToastViewport({ notices = [], onDismiss }) {
  if (notices.length === 0) return null;

  return (
    <div className="toast-viewport" aria-label="Notifications" aria-live="polite">
      {notices.map((notice) => (
        <div
          className={`toast toast-${notice.type}${notice.pending ? ' toast-pending' : ''}`}
          key={notice.id}
          role={notice.type === 'error' ? 'alert' : 'status'}
          aria-atomic="true"
        >
          <span className="toast-icon" aria-hidden="true"><ToastIcon notice={notice} /></span>
          <div className="toast-content">
            <strong>{notice.pending ? 'In progress' : notice.type === 'success' ? 'Confirmed' : notice.type === 'error' ? 'Action needed' : 'Update'}</strong>
            <p>{notice.text}</p>
            {notice.href && (
              <a href={notice.href} target="_blank" rel="noreferrer">
                {notice.actionLabel ?? 'View receipt'} <ExternalLink size={12} />
              </a>
            )}
          </div>
          {notice.dismissible && (
            <button className="toast-dismiss" type="button" onClick={() => onDismiss?.(notice.id)} aria-label="Dismiss notification">
              <X size={15} />
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
