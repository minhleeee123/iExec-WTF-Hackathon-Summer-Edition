import { X } from 'lucide-react';

export default function NoticeBanner({ notice, onDismiss }) {
  if (!notice) return null;
  return (
    <div className={`notice ${notice.type}`} role={notice.type === 'error' ? 'alert' : 'status'}>
      <span>{notice.text}</span>
      {onDismiss && (
        <button className="icon-button" onClick={onDismiss} aria-label="Dismiss notification">
          <X size={16} />
        </button>
      )}
    </div>
  );
}
